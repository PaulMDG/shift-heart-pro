
-- Enable Realtime on the tables we want to subscribe to
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_swap_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
