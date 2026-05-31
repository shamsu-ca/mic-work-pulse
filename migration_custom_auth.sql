-- Migration: Custom ERP-based User Authentication
-- This script removes the dependency of public.users on auth.users,
-- and adds password and active status columns directly inside the ERP users table.
-- RUN THIS IN THE SUPABASE SQL EDITOR!

-- 1. Drop foreign key constraint pointing to auth.users(id) if it exists
-- The default auto-generated constraint name is usually 'users_id_fkey' or 'profiles_id_fkey' depending on creation.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 2. Ensure id column has a default value of gen_random_uuid() so we don't have to specify it on insert
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Add password column to public.users (defaults to 'temp123')
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT 'temp123';

-- 4. Add is_active column to public.users (defaults to true)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
