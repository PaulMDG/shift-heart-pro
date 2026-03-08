
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS on user_roles: users can see their own roles, admins can see all
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Admin RLS policies for full data access
-- Admins can view ALL shifts
CREATE POLICY "Admins can view all shifts"
ON public.shifts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any shift
CREATE POLICY "Admins can update all shifts"
ON public.shifts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert shifts
CREATE POLICY "Admins can insert shifts"
ON public.shifts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete shifts
CREATE POLICY "Admins can delete shifts"
ON public.shifts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all clients
CREATE POLICY "Admins can view all clients"
ON public.clients FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage clients
CREATE POLICY "Admins can insert clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update clients"
ON public.clients FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete clients"
ON public.clients FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all swap requests
CREATE POLICY "Admins can view all swap requests"
ON public.shift_swap_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any swap request
CREATE POLICY "Admins can update all swap requests"
ON public.shift_swap_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Assign admin role to current user
INSERT INTO public.user_roles (user_id, role)
VALUES ('718008a2-a52b-4456-be45-673a5ac6f052', 'admin');
