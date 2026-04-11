-- Fix 1: Restrict profiles SELECT to owner + admins
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can view own profile select" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Remove requester self-approve from swap requests
DROP POLICY IF EXISTS "Target can update swap requests" ON public.shift_swap_requests;
CREATE POLICY "Target can update swap requests" ON public.shift_swap_requests
  FOR UPDATE TO authenticated USING (target_id = auth.uid());

-- Fix 3: Restrict caregiver shift updates to allowed columns only via a trigger
CREATE OR REPLACE FUNCTION public.check_caregiver_shift_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is admin, allow all updates
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  
  -- For caregivers, prevent changes to protected columns
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
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_caregiver_shift_update_trigger ON public.shifts;
CREATE TRIGGER check_caregiver_shift_update_trigger
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_caregiver_shift_update();

-- Fix 4: Make verification-selfies bucket private
UPDATE storage.buckets SET public = false WHERE id = 'verification-selfies';

-- Remove public read policy on selfies
DROP POLICY IF EXISTS "Public selfie read access" ON storage.objects;

-- Add restricted read policy for selfies
CREATE POLICY "Authenticated selfie read access" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-selfies' 
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );