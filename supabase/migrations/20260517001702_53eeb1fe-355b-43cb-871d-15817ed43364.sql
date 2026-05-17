
UPDATE public.clients
SET lat = 39.2155593, lng = -76.8650852
WHERE id = 'b77d1d45-644e-407d-8f6e-fb2521e833dc'
  AND (lat IS NULL OR lng IS NULL);
