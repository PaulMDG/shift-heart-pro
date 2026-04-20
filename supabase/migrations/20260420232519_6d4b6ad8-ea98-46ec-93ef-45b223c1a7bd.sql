
-- 1. Restrict caregiver access to clients table (remove broad SELECT, keep admin)
DROP POLICY IF EXISTS "Caregivers can view assigned clients" ON public.clients;

-- Create a safe view exposing only non-sensitive fields for caregivers
CREATE OR REPLACE VIEW public.clients_caregiver_safe
WITH (security_invoker = true)
AS
SELECT c.id, c.name, c.address, c.care_type, c.lat, c.lng, c.created_at
FROM public.clients c
WHERE c.id IN (
  SELECT DISTINCT s.client_id FROM public.shifts s WHERE s.caregiver_id = auth.uid()
)
OR public.has_role(auth.uid(), 'admin'::public.app_role);

GRANT SELECT ON public.clients_caregiver_safe TO authenticated;

-- Allow caregivers minimal access to base table for joins (only non-sensitive columns via column privileges is complex;
-- instead keep a narrowed RLS policy that still allows row visibility but app code should prefer the view).
-- We re-add a row-level policy but rely on the view for column masking. Apps should query the view.
CREATE POLICY "Caregivers can view assigned clients limited"
ON public.clients
FOR SELECT
TO authenticated
USING (
  id IN (SELECT DISTINCT s.client_id FROM public.shifts s WHERE s.caregiver_id = auth.uid())
);

-- 2. Restrict message updates: recipients may only flip `read`, nothing else
DROP POLICY IF EXISTS "Users can update own received messages" ON public.messages;

CREATE POLICY "Recipients can mark messages as read"
ON public.messages
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (
  recipient_id = auth.uid()
  AND sender_id    = (SELECT m.sender_id    FROM public.messages m WHERE m.id = messages.id)
  AND recipient_id = (SELECT m.recipient_id FROM public.messages m WHERE m.id = messages.id)
  AND content      = (SELECT m.content      FROM public.messages m WHERE m.id = messages.id)
  AND shift_id IS NOT DISTINCT FROM (SELECT m.shift_id FROM public.messages m WHERE m.id = messages.id)
  AND created_at   = (SELECT m.created_at   FROM public.messages m WHERE m.id = messages.id)
);

-- 3. Lock down Realtime channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive scoped realtime" ON realtime.messages;

CREATE POLICY "Authenticated users can receive scoped realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Admins receive everything
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR
  -- Otherwise, only allow topics scoped to the user's own id, or general app channels they can use
  (
    realtime.topic() = 'messages-realtime'
    OR realtime.topic() LIKE 'chat-%'
    OR realtime.topic() = ('user:' || (SELECT auth.uid())::text)
  )
);
