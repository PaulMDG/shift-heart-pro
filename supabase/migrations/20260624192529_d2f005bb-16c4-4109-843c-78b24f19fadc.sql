DROP VIEW IF EXISTS public.clients_caregiver_safe;
CREATE VIEW public.clients_caregiver_safe AS
SELECT id,
       name,
       address,
       care_type,
       lat,
       lng,
       photo_url,
       created_at
  FROM clients c
 WHERE (id IN (SELECT DISTINCT s.client_id FROM shifts s WHERE s.caregiver_id = auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role);

GRANT SELECT ON public.clients_caregiver_safe TO authenticated;
