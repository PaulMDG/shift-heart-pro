
-- Replace the overly broad realtime policy with scoped access

DROP POLICY IF EXISTS "Authenticated users can receive scoped realtime" ON realtime.messages;

CREATE POLICY "Scoped realtime subscriptions"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Admins receive everything
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR
  -- Users can subscribe to their own user channel (for message notifications)
  realtime.topic() = ('user:' || (SELECT auth.uid())::text)
  OR
  -- Users can subscribe to chat channels only if their uid is part of the channel name
  -- Channel format is 'chat-<uuid1>-<uuid2>' where uuids are sorted
  (
    realtime.topic() LIKE 'chat-%'
    AND realtime.topic() LIKE ('%' || (SELECT auth.uid())::text || '%')
  )
);
