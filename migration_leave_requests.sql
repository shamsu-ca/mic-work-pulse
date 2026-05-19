-- 1. Create the leave_requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    leave_type text NOT NULL CHECK (leave_type IN ('Full Day', 'Half Day AM', 'Half Day PM')),
    from_date date NOT NULL,
    to_date date NOT NULL,
    reason text,
    status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    admin_remark text,
    approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
-- Allow everyone to read leave requests (or restrict to self/admin if desired, but typically calendar needs global read)
CREATE POLICY "Enable read access for all users" ON public.leave_requests
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own leave requests
CREATE POLICY "Enable insert for authenticated users" ON public.leave_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own 'Pending' requests or Admins to update any request
CREATE POLICY "Enable update for users and admins" ON public.leave_requests
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Allow users to delete their own 'Pending' requests or Admins to delete any
CREATE POLICY "Enable delete for users and admins" ON public.leave_requests
    FOR DELETE USING (
        (auth.uid() = user_id AND status = 'Pending') OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- 4. Set up realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
