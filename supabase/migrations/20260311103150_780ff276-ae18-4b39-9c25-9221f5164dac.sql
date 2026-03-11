ALTER TABLE public.shifts ADD COLUMN timesheet_status text NOT NULL DEFAULT 'pending';

-- RLS already covers shifts access, no new policies needed