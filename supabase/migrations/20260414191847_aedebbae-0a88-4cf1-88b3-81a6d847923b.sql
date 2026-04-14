-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view avatars (public bucket)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can upload avatars for any user
CREATE POLICY "Admins can upload any avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can update any avatar
CREATE POLICY "Admins can update any avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can delete any avatar
CREATE POLICY "Admins can delete any avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'::public.app_role));