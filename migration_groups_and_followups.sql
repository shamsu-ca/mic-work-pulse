-- Migration: Add Follow-up columns to work_items
ALTER TABLE public.work_items 
ADD COLUMN IF NOT EXISTS linked_to UUID REFERENCES public.work_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS link_type TEXT,
ADD COLUMN IF NOT EXISTS completion_note TEXT,
ADD COLUMN IF NOT EXISTS completion_tag TEXT;

-- Note: 'Group' functionality will simply use the existing parent_id logic 
-- inside saved_tasks to group recurring items, but active tasks will be completely flat.
