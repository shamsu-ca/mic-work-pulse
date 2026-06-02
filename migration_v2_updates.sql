-- Migration V2 updates to add missing and new columns for follow-ups, leave rescheduling, and template mapping

-- 1. Add follow-up and completion columns to work_items
ALTER TABLE public.work_items 
ADD COLUMN IF NOT EXISTS linked_to UUID REFERENCES public.work_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS link_type TEXT,
ADD COLUMN IF NOT EXISTS completion_note TEXT,
ADD COLUMN IF NOT EXISTS completion_tag TEXT;

-- 2. Add previously_overdue column to work_items
ALTER TABLE public.work_items 
ADD COLUMN IF NOT EXISTS previously_overdue BOOLEAN DEFAULT false;

-- 3. Add status column to containers (Projects & Events)
ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 4. Add template mapping and leave rescheduling tracking columns
ALTER TABLE public.work_items 
ADD COLUMN IF NOT EXISTS source_template_item_id UUID REFERENCES public.saved_tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_rescheduled BOOLEAN DEFAULT false;
