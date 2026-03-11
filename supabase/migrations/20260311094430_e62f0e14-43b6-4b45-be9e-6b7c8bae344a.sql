
-- Certifications table
CREATE TABLE public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  issuer text NOT NULL DEFAULT '',
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certifications" ON public.certifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own certifications" ON public.certifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own certifications" ON public.certifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all certifications" ON public.certifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Billing rates table (admin sets hourly rate per client or global)
CREATE TABLE public.billing_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  hourly_rate numeric(10,2) NOT NULL DEFAULT 25.00,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, effective_from)
);

ALTER TABLE public.billing_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage billing rates" ON public.billing_rates
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Caregivers can view billing rates" ON public.billing_rates
  FOR SELECT TO authenticated USING (true);
