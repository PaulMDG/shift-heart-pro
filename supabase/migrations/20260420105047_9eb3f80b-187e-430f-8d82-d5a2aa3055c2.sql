-- Replace caregiver shift UPDATE policy with field-locked WITH CHECK
DROP POLICY IF EXISTS "Caregivers can update own shifts" ON public.shifts;

CREATE POLICY "Caregivers can update own shifts"
ON public.shifts
FOR UPDATE
TO authenticated
USING (caregiver_id = auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  caregiver_id = auth.uid()
  AND caregiver_id IS NOT DISTINCT FROM (SELECT s.caregiver_id FROM public.shifts s WHERE s.id = shifts.id)
  AND client_id    IS NOT DISTINCT FROM (SELECT s.client_id    FROM public.shifts s WHERE s.id = shifts.id)
  AND date         IS NOT DISTINCT FROM (SELECT s.date         FROM public.shifts s WHERE s.id = shifts.id)
  AND start_time   IS NOT DISTINCT FROM (SELECT s.start_time   FROM public.shifts s WHERE s.id = shifts.id)
  AND end_time     IS NOT DISTINCT FROM (SELECT s.end_time     FROM public.shifts s WHERE s.id = shifts.id)
  AND admin_notes  IS NOT DISTINCT FROM (SELECT s.admin_notes  FROM public.shifts s WHERE s.id = shifts.id)
  AND timesheet_status IS NOT DISTINCT FROM (SELECT s.timesheet_status FROM public.shifts s WHERE s.id = shifts.id)
);

-- Add missing UPDATE policy for certifications
CREATE POLICY "Users can update own certifications"
ON public.certifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Stop broadcasting profiles (contains phone numbers) over Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;