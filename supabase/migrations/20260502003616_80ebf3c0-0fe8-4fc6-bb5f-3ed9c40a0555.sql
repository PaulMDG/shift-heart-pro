ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS email_status text NOT NULL DEFAULT 'none';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_shift_id uuid;

COMMENT ON COLUMN public.notifications.email_status IS 'none | sent | failed';
COMMENT ON COLUMN public.notifications.related_shift_id IS 'Optional shift reference';