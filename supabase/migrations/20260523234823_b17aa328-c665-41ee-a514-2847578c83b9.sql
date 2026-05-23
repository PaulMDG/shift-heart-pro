
-- 1) Billing rates: caregivers should only see rates for clients they actually have shifts with.
DROP POLICY IF EXISTS "Caregivers can view relevant billing rates" ON public.billing_rates;
CREATE POLICY "Caregivers can view relevant billing rates"
  ON public.billing_rates
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR client_id IN (
      SELECT DISTINCT shifts.client_id
      FROM public.shifts
      WHERE shifts.caregiver_id = auth.uid()
    )
  );

-- 2) Profiles: prevent self-escalation of HR / payroll fields by non-admins.
CREATE OR REPLACE FUNCTION public.check_profile_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may modify anything.
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-admins editing their own profile cannot change protected HR/payroll fields.
  IF NEW.pay_rate IS DISTINCT FROM OLD.pay_rate THEN
    RAISE EXCEPTION 'Only admins can change pay_rate';
  END IF;
  IF NEW.employment_type IS DISTINCT FROM OLD.employment_type THEN
    RAISE EXCEPTION 'Only admins can change employment_type';
  END IF;
  IF NEW.tax_form_status IS DISTINCT FROM OLD.tax_form_status THEN
    RAISE EXCEPTION 'Only admins can change tax_form_status';
  END IF;
  IF NEW.direct_deposit_on_file IS DISTINCT FROM OLD.direct_deposit_on_file THEN
    RAISE EXCEPTION 'Only admins can change direct_deposit_on_file';
  END IF;
  IF NEW.payroll_method IS DISTINCT FROM OLD.payroll_method THEN
    RAISE EXCEPTION 'Only admins can change payroll_method';
  END IF;
  IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
    RAISE EXCEPTION 'Only admins can change start_date';
  END IF;
  IF NEW.position IS DISTINCT FROM OLD.position THEN
    RAISE EXCEPTION 'Only admins can change position';
  END IF;
  IF NEW.active_status IS DISTINCT FROM OLD.active_status THEN
    RAISE EXCEPTION 'Only admins can change active_status';
  END IF;
  IF NEW.ssn_last4 IS DISTINCT FROM OLD.ssn_last4 THEN
    RAISE EXCEPTION 'Only admins can change ssn_last4';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_profile_self_update_trigger ON public.profiles;
CREATE TRIGGER check_profile_self_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_self_update();

-- 3) Lock down SECURITY DEFINER functions from anonymous callers.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_swap_request(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_swap_request(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_swap_request(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_swap_request(uuid) TO authenticated;
