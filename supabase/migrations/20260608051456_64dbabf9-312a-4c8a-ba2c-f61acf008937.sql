ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint,
  ADD COLUMN IF NOT EXISTS attachment_duration integer,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mentions uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS voice_transcript text,
  ADD COLUMN IF NOT EXISTS converted_to_care_note_shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_shift_created_at
  ON public.messages (shift_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_created_at
  ON public.messages (recipient_id, created_at DESC);

ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;

DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;

CREATE POLICY "Recipients can mark messages as read"
ON public.messages
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (
  recipient_id = auth.uid()
  AND id = (SELECT m.id FROM public.messages m WHERE m.id = messages.id)
  AND sender_id = (SELECT m.sender_id FROM public.messages m WHERE m.id = messages.id)
  AND recipient_id = (SELECT m.recipient_id FROM public.messages m WHERE m.id = messages.id)
  AND content = (SELECT m.content FROM public.messages m WHERE m.id = messages.id)
  AND read = true
  AND NOT (shift_id IS DISTINCT FROM (SELECT m.shift_id FROM public.messages m WHERE m.id = messages.id))
  AND created_at = (SELECT m.created_at FROM public.messages m WHERE m.id = messages.id)
  AND NOT (attachment_url IS DISTINCT FROM (SELECT m.attachment_url FROM public.messages m WHERE m.id = messages.id))
  AND NOT (attachment_type IS DISTINCT FROM (SELECT m.attachment_type FROM public.messages m WHERE m.id = messages.id))
  AND NOT (attachment_name IS DISTINCT FROM (SELECT m.attachment_name FROM public.messages m WHERE m.id = messages.id))
  AND NOT (attachment_size IS DISTINCT FROM (SELECT m.attachment_size FROM public.messages m WHERE m.id = messages.id))
  AND NOT (attachment_duration IS DISTINCT FROM (SELECT m.attachment_duration FROM public.messages m WHERE m.id = messages.id))
  AND category = (SELECT m.category FROM public.messages m WHERE m.id = messages.id)
  AND pinned = (SELECT m.pinned FROM public.messages m WHERE m.id = messages.id)
  AND reactions = (SELECT m.reactions FROM public.messages m WHERE m.id = messages.id)
  AND mentions = (SELECT m.mentions FROM public.messages m WHERE m.id = messages.id)
  AND NOT (voice_transcript IS DISTINCT FROM (SELECT m.voice_transcript FROM public.messages m WHERE m.id = messages.id))
  AND NOT (
    converted_to_care_note_shift_id IS DISTINCT FROM (
      SELECT m.converted_to_care_note_shift_id
      FROM public.messages m
      WHERE m.id = messages.id
    )
  )
);