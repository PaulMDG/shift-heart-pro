import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SwapRequestWithDetails {
  id: string;
  shift_id: string;
  requester_id: string;
  target_id: string | null;
  status: string;
  created_at: string;
  shift: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    client: {
      id: string;
      name: string;
      address: string;
      care_type: string;
    };
  };
  requester: {
    id: string;
    full_name: string;
  };
}

export function useMySwapRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["swap-requests", "mine"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_swap_requests")
        .select("*, shift:shifts(id, date, start_time, end_time, status, client:clients(id, name, address, care_type))")
        .eq("requester_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as SwapRequestWithDetails[];
    },
  });
}

export function useIncomingSwapRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["swap-requests", "incoming"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_swap_requests")
        .select("*, shift:shifts(id, date, start_time, end_time, status, client:clients(id, name, address, care_type)), requester:profiles!shift_swap_requests_requester_id_fkey(id, full_name)")
        .eq("target_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as SwapRequestWithDetails[];
    },
  });
}

export function useCreateSwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, targetId }: { shiftId: string; targetId?: string }) => {
      const { data, error } = await (supabase.rpc as any)("create_swap_request", {
        p_shift_id: shiftId,
        p_target_id: targetId ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swap-requests"] });
    },
  });
}

export function useAcceptSwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (swapId: string) => {
      const { error } = await (supabase.rpc as any)("accept_swap_request", { swap_id: swapId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swap-requests"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useDeclineSwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (swapId: string) => {
      const { error } = await supabase
        .from("shift_swap_requests")
        .update({ status: "declined" })
        .eq("id", swapId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swap-requests"] });
    },
  });
}

export function useCancelSwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (swapId: string) => {
      const { error } = await supabase
        .from("shift_swap_requests")
        .update({ status: "cancelled" })
        .eq("id", swapId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swap-requests"] });
    },
  });
}
