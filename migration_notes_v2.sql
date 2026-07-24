-- WORKPULSE PLANNING PAGE V2 - NOTES WORKSPACE MIGRATION

ALTER TABLE work_items
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Update existing rows to have default values where null
UPDATE work_items SET tags = '{}' WHERE tags IS NULL;
UPDATE work_items SET color = 'default' WHERE color IS NULL;
UPDATE work_items SET is_pinned = false WHERE is_pinned IS NULL;
UPDATE work_items SET is_favorite = false WHERE is_favorite IS NULL;
UPDATE work_items SET is_archived = false WHERE is_archived IS NULL;
UPDATE work_items SET attachments = '[]'::jsonb WHERE attachments IS NULL;
UPDATE work_items SET updated_at = created_at WHERE updated_at IS NULL;
