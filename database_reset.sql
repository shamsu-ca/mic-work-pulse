-- WARNING: THIS SCRIPT WILL OBLITERATE ALL EXISTING DATA IN YOUR SUPABASE PROJECT.
-- IT DROPS ALL TABLES AND REMOVES ALL AUTH USERS.
-- Run this in the Supabase SQL Editor.

-- 1. Drop existing app tables (if they exist) to clear everything constraints
DROP TABLE IF EXISTS public.work_items CASCADE;
DROP TABLE IF EXISTS public.containers CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.absences CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Wipe Auth Users now that foreign connections are stripped
DELETE FROM auth.users;

-- 3. Create the simplified public.users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Assignee',
  department TEXT,
  manager TEXT,
  position TEXT,
  category TEXT DEFAULT 'Office Staff',
  password TEXT NOT NULL DEFAULT 'temp123',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- We are disabling RLS as requested by user ("remove rls")
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 4. Create other standard tables required by the app (wiped fresh)
CREATE TABLE public.containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT,
  color TEXT,
  is_template BOOLEAN DEFAULT false,
  source_template_id UUID REFERENCES public.containers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  expected_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.containers DISABLE ROW LEVEL SECURITY;

CREATE TABLE public.work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  parent_id UUID REFERENCES public.work_items(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  container_id UUID REFERENCES public.containers(id) ON DELETE SET NULL,
  in_planning_pool BOOLEAN DEFAULT false,
  estimated_hours NUMERIC,
  priority TEXT,
  status TEXT DEFAULT 'Assigned',
  expected_date DATE,
  due_time TIME,
  is_active BOOLEAN DEFAULT true,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule JSONB,
  last_generated_at DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.work_items DISABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  type TEXT DEFAULT 'Program',
  staff_group TEXT DEFAULT 'Both', -- keeping this column so old code doesn't crash right away, though we'll remove it from UI
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;

CREATE TABLE public.absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.absences DISABLE ROW LEVEL SECURITY;

-- MIGRATION (run this on an existing DB without resetting):
-- CREATE TABLE IF NOT EXISTS public.absences (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
--   from_date DATE NOT NULL,
--   to_date DATE NOT NULL,
--   reason TEXT,
--   created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
-- ALTER TABLE public.absences DISABLE ROW LEVEL SECURITY;

-- Disable RLS everywhere just in case
-- (already done on creation above)

-- 5. Set up the superadmin and default staff accounts.
INSERT INTO public.users (username, name, role, password, category, position)
VALUES 
  ('superadmin', 'Super Admin', 'Admin', 'admin123', 'Office Staff', 'System Administrator'),
  ('shamsu', 'Shamsuddin', 'Assignee', 'temp123', 'Office Staff', 'Admin Asst')
ON CONFLICT (username) DO NOTHING;
