-- 1. Disable Row Level Security on leave_requests table to allow standard client insertions/updates without client-side admin client exposure.
ALTER TABLE public.leave_requests DISABLE ROW LEVEL SECURITY;

-- 2. Add approved_date column if it doesn't exist
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS approved_date DATE;
