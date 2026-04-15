
-- 1. Fix billing_rates: restrict caregiver SELECT to their assigned clients + global rates
DROP POLICY IF EXISTS "Caregivers can view billing rates" ON public.billing_rates;
CREATE POLICY "Caregivers can view relevant billing rates"
ON public.billing_rates
FOR SELECT
TO authenticated
USING (
  client_id IS NULL
  OR client_id IN (
    SELECT DISTINCT client_id FROM public.shifts WHERE caregiver_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Fix user_roles: add explicit admin-only INSERT and DELETE policies
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix verification-selfies storage: add DELETE and UPDATE policies
CREATE POLICY "Selfie owner can delete own selfies"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'verification-selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete verification selfies"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'verification-selfies' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Selfie owner can update own selfies"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'verification-selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can update verification selfies"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'verification-selfies' AND has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix avatars public bucket: replace broad SELECT with scoped policy
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Anyone can view avatar files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
