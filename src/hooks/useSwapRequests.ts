import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notifyAdmins, emailTemplate } from "@/lib/notifyEmail";

async function logSwapEvent(swapId: string, action: "accepted" | "declined" | "cancelled") {
  try {
    const { data: swap } = await supabase
      .from("shift_swap_requests")
      .select("shift_id, requester_id, target_id")
      .eq("id", swapId)
      .maybeSingle();
    const { data: { user } } = await supabase.auth.getUser();
    const name = user?.user_metadata?.full_name || user?.email || "A caregiver";
    const when = new Date().toLocaleString();
    await notifyAdmins({
      title: `Swap request ${action}`,
      message: `${name} ${action} swap request ${swapId.slice(0, 8)} at ${when}.`,
      type: "swap",
      related_shift_id: swap?.shift_id ?? undefined,
      subject: `Swap ${action}`,
      html: emailTemplate(
        `Shift swap ${action}`,
        `<p><strong>${name}</strong> ${action} a swap request.</p><p>Timestamp: ${when}</p>`
      ),
    });
  } catch (e) {
    console.warn("[logSwapEvent] notify failed", e);
  }
}

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
        .select("*, shift:shifts(id, date, start_time, end_time, status, client:clients(id, name, address, care_type))")
        .eq("target_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch requester profiles separately
      const requesterIds = [...new Set((data || []).map((d: any) => d.requester_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", requesterIds);
      
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      return (data || []).map((d: any) => ({
        ...d,
        requester: profileMap.get(d.requester_id) || { id: d.requester_id, full_name: "Unknown" },
      })) as SwapRequestWithDetails[];
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
      await logSwapEvent(swapId, "accepted");
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
        .update({ status: "rejected" })
        .eq("id", swapId);
      if (error) throw error;
      await logSwapEvent(swapId, "declined");
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
      await logSwapEvent(swapId, "cancelled");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swap-requests"] });
    },
  });
}
