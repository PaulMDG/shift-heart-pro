
-- =========================================================
-- PROFILES: caregiver employment/skills fields
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS employment_type text CHECK (employment_type IN ('employee','contractor')),
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS pay_rate numeric,
  ADD COLUMN IF NOT EXISTS payroll_method text,
  ADD COLUMN IF NOT EXISTS tax_form_status text CHECK (tax_form_status IN ('w4','w9','pending') OR tax_form_status IS NULL),
  ADD COLUMN IF NOT EXISTS direct_deposit_on_file boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_status boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS skills_availability jsonb NOT NULL DEFAULT '{}'::jsonb;

-- =========================================================
-- CLIENTS: expanded intake
-- =========================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS primary_language text,
  ADD COLUMN IF NOT EXISTS responsible_party text,
  ADD COLUMN IF NOT EXISTS billing_contact text,
  ADD COLUMN IF NOT EXISTS service_start_date date,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS authorized_hours_per_week numeric,
  ADD COLUMN IF NOT EXISTS backup_caregiver_id uuid,
  ADD COLUMN IF NOT EXISTS care_needs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS home_safety jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance jsonb NOT NULL DEFAULT '{}'::jsonb;

-- =========================================================
-- CAREGIVER DOCUMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.caregiver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id uuid NOT NULL,
  doc_type text NOT NULL,
  file_path text,
  expiry_date date,
  status text NOT NULL DEFAULT 'on_file' CHECK (status IN ('on_file','verified','expired','missing')),
  notes text,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_caregiver_documents_caregiver ON public.caregiver_documents(caregiver_id);

ALTER TABLE public.caregiver_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage caregiver documents"
  ON public.caregiver_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Caregivers view own documents"
  ON public.caregiver_documents FOR SELECT TO authenticated
  USING (caregiver_id = auth.uid());

-- =========================================================
-- CLIENT DOCUMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  doc_type text NOT NULL,
  file_path text,
  expiry_date date,
  status text NOT NULL DEFAULT 'on_file' CHECK (status IN ('on_file','verified','expired','missing')),
  notes text,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_documents_client ON public.client_documents(client_id);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client documents"
  ON public.client_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- INCIDENT REPORTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid,
  client_id uuid,
  caregiver_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  incident_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  description text NOT NULL,
  action_taken text,
  reported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incident_reports_caregiver ON public.incident_reports(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_client ON public.incident_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_shift ON public.incident_reports(shift_id);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage incidents"
  ON public.incident_reports FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Caregivers create own incidents"
  ON public.incident_reports FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid() AND (caregiver_id = auth.uid() OR caregiver_id IS NULL));

CREATE POLICY "Caregivers view own incidents"
  ON public.incident_reports FOR SELECT TO authenticated
  USING (caregiver_id = auth.uid() OR reported_by = auth.uid());

-- updated_at triggers
CREATE TRIGGER caregiver_documents_touch
  BEFORE UPDATE ON public.caregiver_documents
  FOR EACH ROW EXECUTE FUNCTION public.agency_settings_touch_updated_at();

CREATE TRIGGER client_documents_touch
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.agency_settings_touch_updated_at();

CREATE TRIGGER incident_reports_touch
  BEFORE UPDATE ON public.incident_reports
  FOR EACH ROW EXECUTE FUNCTION public.agency_settings_touch_updated_at();

-- =========================================================
-- STORAGE BUCKETS
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('caregiver-documents','caregiver-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents','client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- caregiver-documents policies: admins full access; caregivers read their own folder
CREATE POLICY "Admins manage caregiver-documents storage"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'caregiver-documents' AND has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (bucket_id = 'caregiver-documents' AND has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Caregivers read own caregiver-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'caregiver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- client-documents policies: admin-only
CREATE POLICY "Admins manage client-documents storage"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'client-documents' AND has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (bucket_id = 'client-documents' AND has_role(auth.uid(),'admin'::app_role));
