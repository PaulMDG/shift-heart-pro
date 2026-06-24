import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notifyAdmins, sendNotificationEmail, emailTemplate } from "@/lib/notifyEmail";
import { evaluateShiftSuspicion } from "@/lib/suspiciousShift";
import { fetchAgencySettings } from "@/hooks/useAgencySettings";
import { formatDateTime, formatDate, formatTime } from "@/lib/format";

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
      const { data: shifts, error } = await supabase
        .from("shifts")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      const clientIds = Array.from(
        new Set((shifts ?? []).map((s: any) => s.client_id).filter(Boolean))
      );
      let clientsById = new Map<string, any>();
      if (clientIds.length) {
        const { data: clients, error: cErr } = await supabase
          .from("clients_caregiver_safe" as any)
          .select("id, name, address, care_type, lat, lng, photo_url")
          .in("id", clientIds);
        if (cErr) console.warn("[useShifts] clients fetch failed", cErr);
        (clients ?? []).forEach((c: any) => clientsById.set(c.id, c));
      }
      return (shifts ?? []).map((s: any) => ({
        ...s,
        client: clientsById.get(s.client_id) ?? {
          id: s.client_id,
          name: "Assigned Client",
          address: "",
          care_type: "",
          lat: null,
          lng: null,
        },
      })) as unknown as ShiftWithClient[];
    },
  });
}

export function useShift(id: string | undefined) {
  return useQuery({
    queryKey: ["shifts", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: shift, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!shift) return null;
      const { data: client, error: cErr } = await supabase
        .from("clients_caregiver_safe" as any)
        .select("id, name, address, care_type, lat, lng, photo_url")
        .eq("id", (shift as any).client_id)
        .maybeSingle();
      if (cErr) console.warn("[useShift] client fetch failed", cErr);
      return {
        ...(shift as any),
        client: client ?? {
          id: (shift as any).client_id,
          name: "Assigned Client",
          address: "",
          care_type: "",
          lat: null,
          lng: null,
        },
      } as unknown as ShiftWithClient;
    },
  });
}

export function useUpdateShiftStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, clock_in_time, clock_out_time, clock_out_notes, clock_in_lat, clock_in_lng, clock_out_lat, clock_out_lng, clock_in_selfie_url, clock_in_accuracy, clock_out_accuracy }: {
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
      clock_in_accuracy?: number;
      clock_out_accuracy?: number;
    }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (clock_in_time) updates.clock_in_time = clock_in_time;
      if (clock_out_time) updates.clock_out_time = clock_out_time;
      if (clock_out_notes !== undefined) updates.clock_out_notes = clock_out_notes;
      if (clock_in_lat !== undefined) updates.clock_in_lat = clock_in_lat;
      if (clock_in_lng !== undefined) updates.clock_in_lng = clock_in_lng;
      if (clock_out_lat !== undefined) updates.clock_out_lat = clock_out_lat;
      if (clock_out_lng !== undefined) updates.clock_out_lng = clock_out_lng;
      if (clock_in_selfie_url) updates.clock_in_selfie_url = clock_in_selfie_url;
      if (clock_in_accuracy !== undefined) updates.clock_in_accuracy = clock_in_accuracy;
      if (clock_out_accuracy !== undefined) updates.clock_out_accuracy = clock_out_accuracy;
      const { error } = await supabase.from("shifts").update(updates).eq("id", id);
      if (error) throw error;

      // Notify admins of clock-in / clock-out events (best-effort).
      try {
        if (status === "in_progress" || status === "completed") {
          const { data: shift } = await supabase
            .from("shifts")
            .select("date, start_time, end_time, caregiver_id, client_id, clock_in_lat, clock_in_lng, clock_out_lat, clock_out_lng, clock_in_accuracy, clock_out_accuracy")
            .eq("id", id)
            .maybeSingle();
          const { data: { user } } = await supabase.auth.getUser();
          const action = status === "in_progress" ? "clocked in" : "clocked out of";
          const caregiverName = user?.user_metadata?.full_name || user?.email || "A caregiver";
          const when = formatDateTime(new Date());
          await notifyAdmins({
            title: `Caregiver ${action} a shift`,
            message: `${caregiverName} ${action} their shift on ${formatDate(shift?.date)} (${formatTime(shift?.start_time)}–${formatTime(shift?.end_time)}) at ${when}.`,
            type: "shift",
            related_shift_id: id,
            subject: `Shift ${action} — ${formatDate(shift?.date)}`,
            html: emailTemplate(
              `Caregiver ${action} a shift`,
              `<p><strong>${caregiverName}</strong> just ${action} their shift.</p>
               <p>Date: ${formatDate(shift?.date)} &middot; ${formatTime(shift?.start_time)} – ${formatTime(shift?.end_time)}</p>
               <p>Timestamp: ${when}</p>`
            ),
          });

          // Suspicion check: notify caregiver if their visit was flagged.
          try {
            const settings = await fetchAgencySettings();
            const { data: client } = await supabase
              .from("clients_caregiver_safe" as any)
              .select("name, lat, lng")
              .eq("id", (shift as any)?.client_id)
              .maybeSingle();
            const result = evaluateShiftSuspicion(
              { ...(shift as any), client },
              0,
              {
                geofence_radius_m: settings.geofence_radius_m,
                accuracy_threshold_m: settings.accuracy_threshold_m,
                repeat_failure_threshold: settings.repeat_failure_threshold,
              },
            );
            if (result.suspicious && (shift as any)?.caregiver_id) {
              const { data: profile } = await (supabase.from("profiles") as any)
                .select("email")
                .eq("id", (shift as any).caregiver_id)
                .maybeSingle();
              const email = (profile as any)?.email as string | undefined;
              const link = `${window.location.origin}/shifts/${id}`;
              const reasonsHtml = result.reasons.map((r) => `<li>${r}</li>`).join("");
              await sendNotificationEmail({
                to: email ? [email] : [],
                subject: `Visit flagged for review — ${formatDate((shift as any)?.date)}`,
                html: emailTemplate(
                  "Your visit was flagged for review",
                  `<p>One of your visits has been flagged as potentially suspicious.</p>
                   <ul>${reasonsHtml}</ul>
                   <p><a href="${link}" style="color:#ea580c;">View shift details</a></p>`,
                ),
                create_notification: {
                  user_id: (shift as any).caregiver_id,
                  title: "Visit flagged for review",
                  message: `Your visit on ${formatDate((shift as any)?.date)} was flagged: ${result.reasons.join("; ")}`,
                  type: "alert",
                  related_shift_id: id,
                },
              });
            }
          } catch (e) {
            console.warn("[useUpdateShiftStatus] suspicion notify failed", e);
          }
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
        const name = user?.user_metadata?.full_name || user?.email || "A caregiver";
        const when = new Date().toLocaleString();
        await notifyAdmins({
          title: `Shift ${assignment_status}`,
          message: `${name} ${assignment_status} a shift on ${shift?.date} (${shift?.start_time}–${shift?.end_time}) at ${when}.`,
          type: "shift",
          related_shift_id: id,
          subject: `Shift ${assignment_status} — ${shift?.date ?? ""}`,
          html: emailTemplate(
            `Caregiver ${assignment_status} an assigned shift`,
            `<p><strong>${name}</strong> has <strong>${assignment_status}</strong> a shift.</p>
             <p>Date: ${shift?.date} &middot; ${shift?.start_time} – ${shift?.end_time}</p>
             <p>Timestamp: ${when}</p>`
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
