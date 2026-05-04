
-- Revoke EXECUTE from anon on all public SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_swap_request(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_swap_request(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_caregiver_shift_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
