
CREATE OR REPLACE FUNCTION public.search_message_recipients(search_text text DEFAULT '')
RETURNS TABLE (id uuid, full_name text, avatar_url text, role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, ur.role
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT role FROM public.user_roles WHERE user_id = p.id
    ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END
    LIMIT 1
  ) ur ON true
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND (
      COALESCE(search_text, '') = ''
      OR p.full_name ILIKE '%' || search_text || '%'
    )
  ORDER BY p.full_name
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.search_message_recipients(text) TO authenticated;
