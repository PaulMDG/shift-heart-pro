
-- Storage policies for message-attachments
CREATE POLICY "Authenticated can upload message attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated can read message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'message-attachments');

CREATE POLICY "Owners can delete their message attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Call logs
CREATE TABLE public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  recipient_phone text,
  recipient_name text,
  status text NOT NULL DEFAULT 'initiated',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.call_logs TO authenticated;
GRANT ALL ON public.call_logs TO service_role;

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their call logs"
ON public.call_logs FOR SELECT TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = recipient_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert their own call logs"
ON public.call_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = caller_id);

-- Notification trigger on new messages
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_preview text;
BEGIN
  IF NEW.recipient_id IS NULL OR NEW.recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  v_preview := COALESCE(NULLIF(NEW.content, ''),
    CASE
      WHEN NEW.attachment_type LIKE 'image/%' THEN '📷 Photo'
      WHEN NEW.attachment_type LIKE 'audio/%' THEN '🎙 Voice note'
      WHEN NEW.attachment_type IS NOT NULL THEN '📎 ' || COALESCE(NEW.attachment_name, 'Attachment')
      ELSE ''
    END);
  INSERT INTO public.notifications (user_id, title, message, type, read)
  VALUES (NEW.recipient_id, COALESCE(v_sender_name, 'New message'), LEFT(v_preview, 160), 'message', false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.messages;
CREATE TRIGGER trg_notify_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

-- Enable realtime for notifications (idempotent)
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
