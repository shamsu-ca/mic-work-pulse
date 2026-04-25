-- WARNING: THIS SCRIPT WILL OBLITERATE ALL EXISTING DATA IN YOUR SUPABASE PROJECT.
-- IT DROPS ALL TABLES AND REMOVES ALL AUTH USERS.
-- Run this in the Supabase SQL Editor.

-- 1. Drop existing app tables (if they exist) to clear everything constraints
DROP TABLE IF EXISTS public.work_items CASCADE;
DROP TABLE IF EXISTS public.containers CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Wipe Auth Users now that foreign connections are stripped
DELETE FROM auth.users;

-- 3. Create the simplified public.users table
CREATE TABLE public.users (
  id UUID references auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Assignee',
  department TEXT,
  manager TEXT,
  position TEXT,
  category TEXT DEFAULT 'Office Staff',
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

-- Disable RLS everywhere just in case
-- (already done on creation above)

-- 5. Set up the superadmin account manually here.
-- Wait: Password hashing is complex in SQL. It is BEST to go to the 
-- Supabase Dashboard -> Authentication -> Users -> Add User.
-- Email: superadmin@erp.mic
-- Password: your_secure_password
-- Wait, the API insert is better if we do it here, but raw password doesn't work.
-- Instruct the user: Add it via Supabase Dashboard -> Auth. It will trigger nothing because we have no triggers.
-- Then manually insert into public.users:
-- INSERT INTO public.users (id, username, name, role) VALUES ('<id_from_auth>', 'superadmin', 'Super Admin', 'Admin');
