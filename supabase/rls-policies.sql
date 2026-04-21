-- Supabase SQL Editor - Run these ONE BY ONE

-- 1. Ensure table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Everyone can read profiles (for dropdowns)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);

-- 3. Policy: Admins can UPDATE any profile (THIS IS THE MISSING ONE)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id = auth.uid()
    AND p2.role = 'Admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id = auth.uid()
    AND p2.role = 'Admin'
  )
);

-- 4. Policy: Admins can INSERT new profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id = auth.uid()
    AND p2.role = 'Admin'
  )
);

-- 5. Policy: Users can update their OWN profile only
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);