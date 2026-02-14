-- Add check constraint to profiles.role
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('MANAGER', 'SELLER'));

-- Optional: Update existing records if needed (be careful with this in production)
-- UPDATE public.profiles SET role = 'SELLER' WHERE role NOT IN ('MANAGER', 'SELLER');
