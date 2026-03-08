
-- Create messages table for direct messaging
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can send messages
CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Users can mark their received messages as read
CREATE POLICY "Users can update own received messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Index for fast conversation lookups
CREATE INDEX idx_messages_participants ON public.messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON public.messages (recipient_id, read, created_at DESC);
