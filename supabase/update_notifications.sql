ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{
  "popup_enabled": false,
  "sound_enabled": true,
  "notify_tasks": true,
  "notify_overdue": true,
  "notify_announcements": true,
  "notify_programs": true
}'::jsonb;
