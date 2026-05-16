import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notifyAdmins, sendNotificationEmail, emailTemplate } from "@/lib/notifyEmail";

/** Notify the swap requester (caregiver) that their request was decided. */
async function notifyRequesterOfDecision(swapId: string, decision: "approved" | "rejected") {
  try {
    const { data: swap } = await supabase
      .from("shift_swap_requests")
      .select("requester_id, shift_id, shift:shifts(date, start_time, end_time, client:clients(name))")
      .eq("id", swapId)
      .maybeSingle();
    if (!swap?.requester_id) return;
    const s: any = (swap as any).shift;
    const when = s ? `${s.date} · ${s.start_time}–${s.end_time}${s.client?.name ? ` (${s.client.name})` : ""}` : "your shift";
    // Fetch requester email
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("email")
      .eq("id", swap.requester_id)
      .maybeSingle();
    const email = (profile as any)?.email as string | undefined;
    const title = decision === "approved" ? "Swap request approved" : "Swap request rejected";
    const message = `Your swap request for ${when} was ${decision} by an admin.`;
    await sendNotificationEmail({
      to: email ? [email] : [],
      subject: title,
      html: emailTemplate(title, `<p>${message}</p>`),
      create_notification: {
        user_id: swap.requester_id,
        title,
        message,
        type: "swap",
        related_shift_id: (swap as any).shift_id ?? undefined,
      },
    });
  } catch (e) {
    console.warn("[notifyRequesterOfDecision] failed", e);
  }
}

async function logAdminSwapDecision(swapId: string, decision: "approved" | "rejected") {
  try {
    const { data: swap } = await supabase
      .from("shift_swap_requests")
      .select("shift_id")
      .eq("id", swapId)
      .maybeSingle();
    const { data: { user } } = await supabase.auth.getUser();
    const admin = user?.user_metadata?.full_name || user?.email || "An admin";
    const when = new Date().toLocaleString();
    await notifyAdmins({
      title: `Swap ${decision} by admin`,
      message: `${admin} ${decision} swap request ${swapId.slice(0, 8)} at ${when}.`,
      type: "swap",
      related_shift_id: swap?.shift_id ?? undefined,
      subject: `Swap ${decision} by admin`,
      html: emailTemplate(
        `Swap ${decision}`,
        `<p><strong>${admin}</strong> ${decision} a swap request.</p><p>Timestamp: ${when}</p>`
      ),
    });
  } catch (e) {
    console.warn("[logAdminSwapDecision] notify failed", e);
  }
}

export interface AdminShift {
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
  client: { id: string; name: string; address: string; care_type: string };
  caregiver: { id: string; full_name: string } | null;
}

export function useAllShifts() {
  return useQuery({
    queryKey: ["admin-shifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*, client:clients(id, name, address, care_type, lat, lng)")
        .order("date", { ascending: false });
      if (error) throw error;

      // Fetch caregiver profiles
      const ids = [...new Set((data || []).map((s: any) => s.caregiver_id).filter(Boolean))];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] };
      const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return (data || []).map((s: any) => ({
        ...s,
        caregiver: s.caregiver_id ? pMap.get(s.caregiver_id) || null : null,
      })) as AdminShift[];
    },
  });
}

export function useAllClients() {
  return useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAllCaregivers() {
  return useQuery({
    queryKey: ["admin-caregivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;

      // Fetch roles for all caregivers
      const ids = (data || []).map((p: any) => p.id);
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] };
      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

      return (data || []).map((p: any) => ({
        ...p,
        role: roleMap.get(p.id) || null,
      }));
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetUserId, role }: { targetUserId: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-update-role", {
        body: { target_user_id: targetUserId, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-caregivers"] }),
  });
}

export function useAllSwapRequests() {
  return useQuery({
    queryKey: ["admin-swap-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_swap_requests")
        .select("*, shift:shifts(id, date, start_time, end_time, status, client:clients(id, name))")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = [...new Set((data || []).flatMap((r: any) => [r.requester_id, r.target_id].filter(Boolean)))];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] };
      const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return (data || []).map((r: any) => ({
        ...r,
        requester: pMap.get(r.requester_id) || { id: r.requester_id, full_name: "Unknown" },
        target: r.target_id ? pMap.get(r.target_id) || null : null,
      }));
    },
  });
}

export function useAdminApproveSwap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (swapId: string) => {
      const { error } = await supabase
        .from("shift_swap_requests")
        .update({ status: "accepted" })
        .eq("id", swapId);
      if (error) throw error;
      await logAdminSwapDecision(swapId, "approved");
      await notifyRequesterOfDecision(swapId, "approved");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-swap-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-shifts"] });
    },
  });
}

export function useAdminDeclineSwap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (swapId: string) => {
      const { error } = await supabase
        .from("shift_swap_requests")
        .update({ status: "rejected" })
        .eq("id", swapId);
      if (error) throw error;
      await logAdminSwapDecision(swapId, "rejected");
      await notifyRequesterOfDecision(swapId, "rejected");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-swap-requests"] });
    },
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shift: {
      client_id: string;
      caregiver_id: string | null;
      date: string;
      start_time: string;
      end_time: string;
      admin_notes?: string;
    }) => {
      const { error } = await supabase.from("shifts").insert(shift);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-shifts"] }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shifts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-shifts"] }),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: {
      name: string;
      address?: string;
      care_type?: string;
      care_plan_summary?: string;
      emergency_contact?: string;
      emergency_phone?: string;
      lat?: number | null;
      lng?: number | null;
    }) => {
      const { error } = await supabase.from("clients").insert(client);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; address?: string; care_type?: string; care_plan_summary?: string; emergency_contact?: string; emergency_phone?: string; lat?: number | null; lng?: number | null }) => {
      const { error } = await supabase.from("clients").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clients"] }),
  });
}

export function useCreateCaregiver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (caregiver: any) => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: caregiver,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-caregivers"] }),
  });
}

export function useDeleteCaregiver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-caregivers"] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clients"] }),
  });
}
