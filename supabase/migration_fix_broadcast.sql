-- Migration: Fix Broadcast, Announcements and Notifications Schema
-- Run this in the Supabase SQL Editor.

-- 1. Alter public.announcements to match frontend expectations
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- 2. Alter public.notifications to support task assignment trigger
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS work_item_id UUID REFERENCES public.work_items(id) ON DELETE SET NULL,
ALTER COLUMN title DROP NOT NULL; -- Allow title to be optional, or give a default

-- 3. Re-create the notify_on_task_assignment trigger function and trigger
CREATE OR REPLACE FUNCTION public.notify_on_task_assignment()
RETURNS trigger AS $$
BEGIN
  -- Only fire if assignee_id was just set (or changed) and is not null
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
    INSERT INTO public.notifications (user_id, title, message, work_item_id)
    VALUES (
      NEW.assignee_id,
      'Task Assigned',
      'You have been assigned a new task: ' || NEW.title,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_assigned ON public.work_items;
CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE OF assignee_id ON public.work_items
  FOR EACH ROW EXECUTE PROCEDURE public.notify_on_task_assignment();

-- 4. Correct RLS policies to point to public.users table instead of public.profiles
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
CREATE POLICY "Admins can insert announcements" ON public.announcements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins can delete announcements" ON public.announcements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );
