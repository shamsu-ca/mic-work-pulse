-- migration_reports_and_archives.sql
-- Run this script in the Supabase SQL Editor to support the new Reports Page & Archive System.

-- 1. Create archives table
CREATE TABLE IF NOT EXISTS public.archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_number SERIAL,
  archive_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_items INTEGER DEFAULT 0,
  generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  archive_summary JSONB, -- Stores overview stats, staff metrics, and project logs
  drive_link TEXT,       -- Nullable, allows admin to paste the link after manual upload
  metadata JSONB,        -- Holds extra audit/log records
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disable Row Level Security on the archives table
ALTER TABLE public.archives DISABLE ROW LEVEL SECURITY;

-- 2. Add status column to containers table
ALTER TABLE public.containers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 3. Add previously_overdue column to work_items table
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS previously_overdue BOOLEAN DEFAULT false;
