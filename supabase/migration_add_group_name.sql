-- Add group_name column to work_items table
ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS group_name TEXT;
