ALTER TABLE public.shifts ADD COLUMN clock_in_selfie_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('verification-selfies', 'verification-selfies', true);

CREATE POLICY "Authenticated users can upload selfies"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verification-selfies');

CREATE POLICY "Public selfie read access"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'verification-selfies');