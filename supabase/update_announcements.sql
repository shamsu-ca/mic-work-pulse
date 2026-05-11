ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS created_by uuid,
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
