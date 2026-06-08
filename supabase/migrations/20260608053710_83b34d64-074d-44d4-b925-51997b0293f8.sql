
-- 1. Conversion metadata on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS converted_to_care_note_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_to_care_note_by uuid;

-- 2. RPC: mark a message as converted to a shift's care notes.
-- Authorization: caller must be the shift's caregiver (or admin), AND must
-- be either sender or recipient of the message. The message must belong
-- to that shift (shift_id = p_shift_id) to prevent cross-shift conversion.
CREATE OR REPLACE FUNCTION public.mark_message_converted(p_message_id uuid, p_shift_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caregiver uuid;
  v_sender uuid;
  v_recipient uuid;
  v_msg_shift uuid;
BEGIN
  SELECT caregiver_id INTO v_caregiver FROM public.shifts WHERE id = p_shift_id;
  IF v_caregiver IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;
  IF v_caregiver <> auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized for this shift';
  END IF;

  SELECT sender_id, recipient_id, shift_id
  INTO v_sender, v_recipient, v_msg_shift
  FROM public.messages WHERE id = p_message_id;
  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;
  IF auth.uid() <> v_sender AND auth.uid() <> v_recipient AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized for this message';
  END IF;
  IF v_msg_shift IS DISTINCT FROM p_shift_id THEN
    RAISE EXCEPTION 'Message does not belong to this shift';
  END IF;

  UPDATE public.messages
  SET converted_to_care_note_shift_id = p_shift_id,
      converted_to_care_note_at = now(),
      converted_to_care_note_by = auth.uid()
  WHERE id = p_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_message_converted(uuid, uuid) TO authenticated;

-- 3. Notification preferences (per user)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY,
  in_shift_messages boolean NOT NULL DEFAULT true,
  admin_alerts boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all notification preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.notification_preferences_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.notification_preferences_touch_updated_at();
