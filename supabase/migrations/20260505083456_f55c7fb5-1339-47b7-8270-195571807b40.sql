
-- Add email_payload column to store email data for retry
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS email_payload jsonb DEFAULT NULL;

COMMENT ON COLUMN public.notifications.email_payload IS 'Stores email recipient/subject/html for retry on failure';
