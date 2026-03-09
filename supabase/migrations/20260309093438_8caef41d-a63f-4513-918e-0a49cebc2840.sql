ALTER TABLE public.shifts
  ADD COLUMN clock_in_lat double precision,
  ADD COLUMN clock_in_lng double precision,
  ADD COLUMN clock_out_lat double precision,
  ADD COLUMN clock_out_lng double precision;