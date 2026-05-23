-- Add approved_date column to leave_requests table
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS approved_date DATE;
