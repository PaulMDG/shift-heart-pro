-- Allow caregivers to read safe client columns via the view.
-- The view restricts columns to non-PII (id, name, address, care_type, lat, lng).
-- Switch to security_definer so caregivers don't need SELECT on the base clients table,
-- which keeps emergency_contact / care_plan_summary protected by base-table RLS.
ALTER VIEW public.clients_caregiver_safe SET (security_invoker = false);

GRANT SELECT ON public.clients_caregiver_safe TO authenticated;