-- Remove clients from realtime publication to prevent sensitive data broadcasts
ALTER PUBLICATION supabase_realtime DROP TABLE public.clients;

-- Tighten selfie upload policy: enforce folder ownership
DROP POLICY IF EXISTS "Authenticated users can upload selfies" ON storage.objects;

CREATE POLICY "Users can upload selfies to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-selfies'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);