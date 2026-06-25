
CREATE TABLE IF NOT EXISTS public.notification_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  target_user_id uuid,
  payload jsonb,
  error_message text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.notification_errors TO authenticated;
GRANT ALL ON public.notification_errors TO service_role;

ALTER TABLE public.notification_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read notification errors" ON public.notification_errors;
CREATE POLICY "Admins read notification errors"
ON public.notification_errors FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete notification errors" ON public.notification_errors;
CREATE POLICY "Admins delete notification errors"
ON public.notification_errors FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_name text;
  v_preview text;
  v_payload jsonb;
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

  v_payload := jsonb_build_object(
    'user_id', NEW.recipient_id,
    'title', COALESCE(v_sender_name, 'New message'),
    'message', LEFT(v_preview, 160),
    'type', 'message',
    'read', false,
    'message_id', NEW.id,
    'sender_id', NEW.sender_id,
    'attachment_type', NEW.attachment_type
  );

  BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, read)
    VALUES (NEW.recipient_id, COALESCE(v_sender_name, 'New message'), LEFT(v_preview, 160), 'message', false);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_new_message failed: % (SQLSTATE %) payload=%',
      SQLERRM, SQLSTATE, v_payload;
    BEGIN
      INSERT INTO public.notification_errors (source, target_user_id, payload, error_message, error_code)
      VALUES ('notify_on_new_message', NEW.recipient_id, v_payload, SQLERRM, SQLSTATE);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notification_errors insert also failed: %', SQLERRM;
    END;
  END;

  RETURN NEW;
END;
$function$;
