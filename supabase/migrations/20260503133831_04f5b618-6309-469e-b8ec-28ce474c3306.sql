-- Add GPS accuracy columns to shifts
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS clock_in_accuracy double precision,
ADD COLUMN IF NOT EXISTS clock_out_accuracy double precision;

-- Add US biodata fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ssn_last4 text,
ADD COLUMN IF NOT EXISTS government_id_number text,
ADD COLUMN IF NOT EXISTS government_id_state text,
ADD COLUMN IF NOT EXISTS drivers_license_number text,
ADD COLUMN IF NOT EXISTS drivers_license_state text;