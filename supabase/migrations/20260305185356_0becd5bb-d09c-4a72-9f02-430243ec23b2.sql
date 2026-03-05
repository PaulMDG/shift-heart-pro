-- Drop the overly permissive clients SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

-- Create a restrictive policy: users can only see clients they have shifts for
CREATE POLICY "Caregivers can view assigned clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT DISTINCT client_id FROM public.shifts WHERE caregiver_id = auth.uid()
  )
);