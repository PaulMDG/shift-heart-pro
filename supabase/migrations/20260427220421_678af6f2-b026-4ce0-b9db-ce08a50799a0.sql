
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS certifications text,
  ADD COLUMN IF NOT EXISTS availability_notes text;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS assignment_status text NOT NULL DEFAULT 'pending';

-- Existing shifts that already have caregivers and aren't pending should be considered accepted
UPDATE public.shifts SET assignment_status = 'accepted'
  WHERE caregiver_id IS NOT NULL AND status IN ('in_progress','completed');

-- Allow caregivers to update assignment_status on their own shifts
-- (the existing trigger blocks most caregiver updates; we need to allow this column)
CREATE OR REPLACE FUNCTION public.check_caregiver_shift_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'Cannot change client assignment';
  END IF;
  IF NEW.caregiver_id IS DISTINCT FROM OLD.caregiver_id THEN
    RAISE EXCEPTION 'Cannot change caregiver assignment';
  END IF;
  IF NEW.date IS DISTINCT FROM OLD.date THEN
    RAISE EXCEPTION 'Cannot change shift date';
  END IF;
  IF NEW.start_time IS DISTINCT FROM OLD.start_time THEN
    RAISE EXCEPTION 'Cannot change start time';
  END IF;
  IF NEW.end_time IS DISTINCT FROM OLD.end_time THEN
    RAISE EXCEPTION 'Cannot change end time';
  END IF;
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    RAISE EXCEPTION 'Cannot change admin notes';
  END IF;
  IF NEW.timesheet_status IS DISTINCT FROM OLD.timesheet_status THEN
    RAISE EXCEPTION 'Cannot change timesheet status';
  END IF;
  -- assignment_status: caregivers may only set pending->accepted or pending->declined
  IF NEW.assignment_status IS DISTINCT FROM OLD.assignment_status THEN
    IF OLD.assignment_status <> 'pending' OR NEW.assignment_status NOT IN ('accepted','declined') THEN
      RAISE EXCEPTION 'Invalid assignment status change';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
