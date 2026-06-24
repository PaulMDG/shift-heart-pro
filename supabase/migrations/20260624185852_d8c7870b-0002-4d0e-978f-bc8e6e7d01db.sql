-- 1. clients.photo_url
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS photo_url text;

-- 2. agency_settings contact directory
ALTER TABLE public.agency_settings
  ADD COLUMN IF NOT EXISTS agency_name text,
  ADD COLUMN IF NOT EXISTS agency_phone text,
  ADD COLUMN IF NOT EXISTS agency_email text,
  ADD COLUMN IF NOT EXISTS scheduler_name text,
  ADD COLUMN IF NOT EXISTS scheduler_phone text,
  ADD COLUMN IF NOT EXISTS scheduler_email text,
  ADD COLUMN IF NOT EXISTS clinical_supervisor_name text,
  ADD COLUMN IF NOT EXISTS clinical_supervisor_phone text,
  ADD COLUMN IF NOT EXISTS clinical_supervisor_email text,
  ADD COLUMN IF NOT EXISTS family_contact_label text,
  ADD COLUMN IF NOT EXISTS family_contact_phone text,
  ADD COLUMN IF NOT EXISTS family_contact_email text,
  ADD COLUMN IF NOT EXISTS documents_url text;

-- 3. Storage policies for client photos (avatars bucket, clients/ prefix)
-- Admins: full write access to clients/* objects
DROP POLICY IF EXISTS "Admins manage client photos" ON storage.objects;
CREATE POLICY "Admins manage client photos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'clients'
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'clients'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Any authenticated user (caregivers) can read client photos
DROP POLICY IF EXISTS "Authenticated can view client photos" ON storage.objects;
CREATE POLICY "Authenticated can view client photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'clients'
);
