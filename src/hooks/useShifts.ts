import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ShiftWithClient {
  id: string;
  caregiver_id: string | null;
  client_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  admin_notes: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  clock_out_notes: string | null;
  client: {
    id: string;
    name: string;
    address: string;
    care_type: string;
    emergency_contact: string;
    emergency_phone: string;
    care_plan_summary: string;
    lat: number | null;
    lng: number | null;
  };
}

export function useShifts() {
  return useQuery({
    queryKey: ["shifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*, client:clients(*)")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as unknown as ShiftWithClient[];
    },
  });
}

export function useShift(id: string | undefined) {
  return useQuery({
    queryKey: ["shifts", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*, client:clients(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ShiftWithClient | null;
    },
  });
}

export function useUpdateShiftStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, clock_in_time, clock_out_time, clock_out_notes, clock_in_lat, clock_in_lng, clock_out_lat, clock_out_lng, clock_in_selfie_url }: {
      id: string;
      status: string;
      clock_in_time?: string;
      clock_out_time?: string;
      clock_out_notes?: string;
      clock_in_lat?: number;
      clock_in_lng?: number;
      clock_out_lat?: number;
      clock_out_lng?: number;
      clock_in_selfie_url?: string;
    }) => {
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (clock_in_time) updates.clock_in_time = clock_in_time;
      if (clock_out_time) updates.clock_out_time = clock_out_time;
      if (clock_out_notes !== undefined) updates.clock_out_notes = clock_out_notes;
      if (clock_in_lat !== undefined) updates.clock_in_lat = clock_in_lat;
      if (clock_in_lng !== undefined) updates.clock_in_lng = clock_in_lng;
      if (clock_out_lat !== undefined) updates.clock_out_lat = clock_out_lat;
      if (clock_out_lng !== undefined) updates.clock_out_lng = clock_out_lng;
      if (clock_in_selfie_url) updates.clock_in_selfie_url = clock_in_selfie_url;
      const { error } = await supabase.from("shifts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}
