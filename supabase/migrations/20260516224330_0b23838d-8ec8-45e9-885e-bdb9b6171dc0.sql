
CREATE TABLE public.agency_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  geofence_radius_m INTEGER NOT NULL DEFAULT 200,
  accuracy_threshold_m INTEGER NOT NULL DEFAULT 100,
  repeat_failure_threshold INTEGER NOT NULL DEFAULT 2,
  is_global BOOLEAN NOT NULL DEFAULT true UNIQUE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
ON public.agency_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert settings"
ON public.agency_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
ON public.agency_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.agency_settings_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER agency_settings_touch_updated_at
BEFORE UPDATE ON public.agency_settings
FOR EACH ROW
EXECUTE FUNCTION public.agency_settings_touch_updated_at();

-- Seed the single global row
INSERT INTO public.agency_settings (geofence_radius_m, accuracy_threshold_m, repeat_failure_threshold, is_global)
VALUES (200, 100, 2, true)
ON CONFLICT DO NOTHING;
