-- Add is_active column to containers table
ALTER TABLE public.containers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
