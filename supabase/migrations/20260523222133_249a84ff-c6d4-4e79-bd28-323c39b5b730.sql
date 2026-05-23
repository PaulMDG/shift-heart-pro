-- Incident attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-attachments', 'incident-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Add optional attachment_path column to incident_reports
ALTER TABLE public.incident_reports
  ADD COLUMN IF NOT EXISTS attachment_path text;

-- Storage RLS for incident-attachments
CREATE POLICY "Admins manage incident attachments"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'incident-attachments' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'incident-attachments' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Caregivers upload own incident attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'incident-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Caregivers read own incident attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
