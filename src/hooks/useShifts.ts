import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendNotificationEmail, getAdminEmails, emailTemplate } from "@/lib/notifyEmail";

export interface ShiftWithClient {
  id: string;
  caregiver_id: string | null;
  client_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  assignment_status?: string;
  admin_notes: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  clock_out_notes: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  clock_in_selfie_url: string | null;
  client: {
    id: string;
    name: string;
    address: string;
    care_type: string;
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
        .select("*, client:clients_caregiver_safe(id, name, address, care_type, lat, lng)")
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
        .select("*, client:clients_caregiver_safe(id, name, address, care_type, lat, lng)")
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
      const updates: { status: string; updated_at: string; clock_in_time?: string; clock_out_time?: string; clock_out_notes?: string; clock_in_lat?: number; clock_in_lng?: number; clock_out_lat?: number; clock_out_lng?: number; clock_in_selfie_url?: string } = { status, updated_at: new Date().toISOString() };
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

      // Notify admins of clock-in / clock-out events (best-effort).
      try {
        if (status === "in_progress" || status === "completed") {
          const { data: shift } = await supabase
            .from("shifts")
            .select("date, start_time, end_time, caregiver_id, client_id")
            .eq("id", id)
            .maybeSingle();
          const { data: { user } } = await supabase.auth.getUser();
          const adminEmails = await getAdminEmails();
          const action = status === "in_progress" ? "clocked in" : "clocked out of";
          const caregiverName = user?.user_metadata?.full_name || user?.email || "A caregiver";
          await sendNotificationEmail({
            to: adminEmails,
            subject: `Shift ${action} — ${shift?.date ?? ""}`,
            html: emailTemplate(
              `Caregiver ${action} a shift`,
              `<p><strong>${caregiverName}</strong> just ${action} their shift.</p>
               <p>Date: ${shift?.date} &middot; ${shift?.start_time} – ${shift?.end_time}</p>`
            ),
          });
        }
      } catch (e) {
        console.warn("[useUpdateShiftStatus] email notify failed", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assignment_status }: { id: string; assignment_status: "accepted" | "declined" }) => {
      const { error } = await supabase
        .from("shifts")
        .update({ assignment_status, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;

      try {
        const { data: shift } = await supabase
          .from("shifts")
          .select("date, start_time, end_time")
          .eq("id", id)
          .maybeSingle();
        const { data: { user } } = await supabase.auth.getUser();
        const adminEmails = await getAdminEmails();
        const name = user?.user_metadata?.full_name || user?.email || "A caregiver";
        await sendNotificationEmail({
          to: adminEmails,
          subject: `Shift ${assignment_status} — ${shift?.date ?? ""}`,
          html: emailTemplate(
            `Caregiver ${assignment_status} an assigned shift`,
            `<p><strong>${name}</strong> has <strong>${assignment_status}</strong> a shift.</p>
             <p>Date: ${shift?.date} &middot; ${shift?.start_time} – ${shift?.end_time}</p>`
          ),
        });
      } catch (e) {
        console.warn("[useUpdateAssignmentStatus] email notify failed", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}
