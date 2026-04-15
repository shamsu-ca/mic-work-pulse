-- WORKPULSE ERP MVP 1.0 SCHEMA
-- Roles: Admin, Assignee only (Supervisor & Admin Plus removed)

CREATE TYPE role_type AS ENUM ('Admin', 'Assignee');
CREATE TYPE staff_group_type AS ENUM ('Office Staff', 'Institution');
CREATE TYPE container_type AS ENUM ('Project', 'Event');
CREATE TYPE work_item_type AS ENUM ('Task', 'Subtask', 'Milestone', 'Checklist');
CREATE TYPE work_item_status AS ENUM ('Assigned', 'Ongoing', 'Completed');

-- PROFILES (Users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role role_type NOT NULL DEFAULT 'Assignee',
  staff_group staff_group_type NOT NULL DEFAULT 'Office Staff',
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CONTAINERS (Projects & Events)
CREATE TABLE containers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type container_type NOT NULL,
  title TEXT NOT NULL,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES profiles(id)
);

-- WORK ITEMS (Tasks, Subtasks, Milestones, Checklists)
-- Also used as Recurring Task Templates when is_recurring = true
CREATE TABLE work_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type work_item_type NOT NULL DEFAULT 'Task',
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),         -- Admin who created it (for planning pool creator tag)
  expected_date DATE,
  estimated_hours NUMERIC,                          -- Optional time required (e.g. 1.5 hours)
  priority INTEGER DEFAULT 3,                       -- 1 = High, 3 = Low
  status work_item_status DEFAULT 'Assigned',       -- Nullable if in planning pool
  container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES work_items(id) ON DELETE CASCADE, -- For Subtasks
  in_planning_pool BOOLEAN DEFAULT false,
  aging TEXT,                                       -- 'New', 'Aging', 'Aged'

  -- Recurring Task fields (template rows have is_recurring = true)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule JSONB,
  -- e.g. { "type": "daily" }
  -- e.g. { "type": "every_x_days", "interval": 3 }
  -- e.g. { "type": "weekly", "day": 1 }       (0=Sun, 1=Mon, ..., 6=Sat)
  -- e.g. { "type": "monthly", "date": 15 }    (15th of each month)
  -- e.g. { "type": "every_x_months", "interval": 2, "date": 1 }
  last_generated_at DATE,                           -- Last date a task instance was spawned
  is_active BOOLEAN DEFAULT true,                   -- Pause/resume recurring templates

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ===================================================================================
-- ROW LEVEL SECURITY
-- ===================================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
  OR id = auth.uid() -- users can update their own profile
);

-- CONTAINERS
CREATE POLICY "Containers are viewable by everyone" ON containers FOR SELECT USING (true);
CREATE POLICY "Admins can manage containers" ON containers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- WORK ITEMS
CREATE POLICY "Work items are viewable by everyone" ON work_items FOR SELECT USING (true);
CREATE POLICY "Assignees can update their own work items" ON work_items FOR UPDATE USING (
  assignee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);
CREATE POLICY "Admins can insert work items" ON work_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);
CREATE POLICY "Admins can delete work items" ON work_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- NOTIFICATIONS
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can insert notifications" ON notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);
CREATE POLICY "Users can mark own notifications read" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ===================================================================================
-- AUTO PROFILE CREATION TRIGGER
-- Fires when a new user is created via supabase.auth.signUp()
-- ===================================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_name TEXT;
  v_role public.role_type;
  v_staff_group public.staff_group_type;
BEGIN
  v_name := COALESCE(
    NULLIF(new.raw_user_meta_data->>'full_name', ''),
    NULLIF(split_part(new.email, '@', 1), ''),
    'New User'
  );

  BEGIN
    v_role := COALESCE(NULLIF(new.raw_user_meta_data->>'role', ''), 'Assignee')::public.role_type;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'Assignee'::public.role_type;
  END;

  BEGIN
    v_staff_group := COALESCE(NULLIF(new.raw_user_meta_data->>'staff_group', ''), 'Office Staff')::public.staff_group_type;
  EXCEPTION WHEN OTHERS THEN
    v_staff_group := 'Office Staff'::public.staff_group_type;
  END;

  INSERT INTO public.profiles (id, name, role, staff_group, department)
  VALUES (
    new.id,
    v_name,
    v_role,
    v_staff_group,
    new.raw_user_meta_data->>'department'
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ===================================================================================
-- AUTO NOTIFICATION TRIGGER
-- Fires when a work_item gets an assignee_id set or changed
-- ===================================================================================
CREATE OR REPLACE FUNCTION public.notify_on_task_assignment()
RETURNS trigger AS $$
BEGIN
  -- Only fire if assignee_id was just set (or changed) and is not null
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
    INSERT INTO public.notifications (user_id, message, work_item_id)
    VALUES (
      NEW.assignee_id,
      'You have been assigned a new task: ' || NEW.title,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_assigned ON work_items;
CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE OF assignee_id ON work_items
  FOR EACH ROW EXECUTE PROCEDURE public.notify_on_task_assignment();
