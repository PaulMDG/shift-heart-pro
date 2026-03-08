
-- Allow authenticated users to view basic profile info of other users (needed for swap requests)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the restrictive self-only policy since the new one is more permissive
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
