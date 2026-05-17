
create table if not exists public.care_note_audits (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  old_value text,
  new_value text
);

create index if not exists idx_care_note_audits_shift on public.care_note_audits(shift_id, changed_at desc);

alter table public.care_note_audits enable row level security;

drop policy if exists "Admins can view all care note audits" on public.care_note_audits;
create policy "Admins can view all care note audits"
  on public.care_note_audits for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Caregivers can view own shift audits" on public.care_note_audits;
create policy "Caregivers can view own shift audits"
  on public.care_note_audits for select
  to authenticated
  using (
    exists (select 1 from public.shifts s where s.id = shift_id and s.caregiver_id = auth.uid())
  );

create or replace function public.log_care_note_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE') and (new.clock_out_notes is distinct from old.clock_out_notes) then
    insert into public.care_note_audits (shift_id, changed_by, old_value, new_value)
    values (new.id, auth.uid(), old.clock_out_notes, new.clock_out_notes);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_care_note_changes on public.shifts;
create trigger trg_log_care_note_changes
  after update of clock_out_notes on public.shifts
  for each row execute function public.log_care_note_changes();
