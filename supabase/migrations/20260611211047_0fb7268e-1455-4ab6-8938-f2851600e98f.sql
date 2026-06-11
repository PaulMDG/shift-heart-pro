
-- Care task templates (admin-defined, per care_type)
CREATE TABLE public.care_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_type text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.care_task_templates TO authenticated;
GRANT ALL ON public.care_task_templates TO service_role;

ALTER TABLE public.care_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read templates"
  ON public.care_task_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage templates"
  ON public.care_task_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER care_task_templates_touch
  BEFORE UPDATE ON public.care_task_templates
  FOR EACH ROW EXECUTE FUNCTION public.agency_settings_touch_updated_at();

-- Per-shift task state
CREATE TABLE public.shift_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.care_task_templates(id) ON DELETE SET NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shift_tasks_shift_id_idx ON public.shift_tasks(shift_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_tasks TO authenticated;
GRANT ALL ON public.shift_tasks TO service_role;

ALTER TABLE public.shift_tasks ENABLE ROW LEVEL SECURITY;

-- Caregivers can view tasks for their assigned shifts; admins see all
CREATE POLICY "View shift tasks"
  ON public.shift_tasks FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_id AND s.caregiver_id = auth.uid())
  );

-- Admins manage all; caregivers can update completion on their shifts
CREATE POLICY "Admins manage shift tasks"
  ON public.shift_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Caregiver update own shift tasks"
  ON public.shift_tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_id AND s.caregiver_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_id AND s.caregiver_id = auth.uid()));

-- Restrict caregiver updates to completion fields only
CREATE OR REPLACE FUNCTION public.check_shift_task_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.shift_id IS DISTINCT FROM OLD.shift_id
     OR NEW.label IS DISTINCT FROM OLD.label
     OR NEW.template_id IS DISTINCT FROM OLD.template_id
     OR NEW.sort_order IS DISTINCT FROM OLD.sort_order THEN
    RAISE EXCEPTION 'Caregivers can only toggle task completion';
  END IF;
  IF NEW.completed IS DISTINCT FROM OLD.completed THEN
    NEW.completed_at = CASE WHEN NEW.completed THEN now() ELSE NULL END;
    NEW.completed_by = CASE WHEN NEW.completed THEN auth.uid() ELSE NULL END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER shift_tasks_update_check
  BEFORE UPDATE ON public.shift_tasks
  FOR EACH ROW EXECUTE FUNCTION public.check_shift_task_update();

-- Helper: seed shift tasks from templates for a given shift
CREATE OR REPLACE FUNCTION public.seed_shift_tasks(p_shift_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_care_type text;
  v_count integer := 0;
BEGIN
  -- Authorization: admin or assigned caregiver
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = p_shift_id AND s.caregiver_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Only seed if no tasks yet
  IF EXISTS (SELECT 1 FROM public.shift_tasks WHERE shift_id = p_shift_id) THEN
    RETURN 0;
  END IF;

  SELECT c.care_type INTO v_care_type
  FROM public.shifts s JOIN public.clients c ON c.id = s.client_id
  WHERE s.id = p_shift_id;

  INSERT INTO public.shift_tasks (shift_id, template_id, label, sort_order)
  SELECT p_shift_id, t.id, t.label, t.sort_order
  FROM public.care_task_templates t
  WHERE t.active = true AND t.care_type = COALESCE(v_care_type, '');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_shift_tasks(uuid) TO authenticated;
