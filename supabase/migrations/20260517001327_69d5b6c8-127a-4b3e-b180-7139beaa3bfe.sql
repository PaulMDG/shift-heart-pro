
DROP POLICY IF EXISTS "Scoped realtime subscriptions" ON realtime.messages;

CREATE POLICY "Scoped realtime subscriptions"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Admins may subscribe to any topic (used by admin dashboards)
  has_role((SELECT auth.uid()), 'admin'::app_role)
  -- Personal user channel: exact match only
  OR realtime.topic() = ('user:' || (SELECT auth.uid())::text)
  -- Chat channel: format 'chat-<uuid>-<uuid>' (sorted). Verify the topic
  -- has the exact canonical shape and that one of the two UUIDs is the
  -- current user (positions 6..41 and 43..78).
  OR (
    realtime.topic() ~ '^chat-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (
      substring(realtime.topic() from 6 for 36) = (SELECT auth.uid())::text
      OR substring(realtime.topic() from 43 for 36) = (SELECT auth.uid())::text
    )
  )
);
