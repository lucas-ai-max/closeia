-- 1. Clean up existing data: Set invalid or null roles to 'SELLER'
UPDATE public.profiles
SET role = 'SELLER'
WHERE role IS NULL OR role NOT IN ('MANAGER', 'SELLER');

-- 2. Add check constraint to profiles.role
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('MANAGER', 'SELLER'));
