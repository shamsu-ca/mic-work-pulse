-- Migration: extend containers table and work_item_type enum
-- Run in Supabase SQL Editor (run the ALTER TYPE line separately if it errors)

-- 1. Add missing columns to containers
ALTER TABLE containers
  ADD COLUMN IF NOT EXISTS is_template     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS staff_group     TEXT    DEFAULT 'Office Staff',
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS expected_date   DATE,
  ADD COLUMN IF NOT EXISTS lead_id         UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES containers(id);

-- 2. Add Phase to work_item_type enum (run separately if transaction error)
ALTER TYPE work_item_type ADD VALUE IF NOT EXISTS 'Phase';
