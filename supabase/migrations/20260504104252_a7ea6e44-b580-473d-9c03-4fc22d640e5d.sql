
-- Revoke from PUBLIC (the default grant target) for all security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_swap_request(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_swap_request(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_caregiver_shift_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

-- Re-grant to authenticated for functions that authenticated users need
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_swap_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_swap_request(uuid, uuid) TO authenticated;
-- check_caregiver_shift_update is a trigger function, no direct call needed
-- handle_new_user is a trigger function, no direct call needed  
-- rls_auto_enable is an event trigger, no direct call needed
