import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IncidentRow {
  id: string;
  occurred_at: string;
  incident_type: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  description: string;
  action_taken: string | null;
  client_id: string | null;
  caregiver_id: string | null;
  shift_id: string | null;
  reported_by: string;
  attachment_path: string | null;
  created_at: string;
}

export function useAllIncidents() {
  return useQuery({
    queryKey: ["incident-reports", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("incident_reports")
        .select("*")
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as IncidentRow[];
    },
  });
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      incident_type: string;
      severity: string;
      description: string;
      action_taken?: string | null;
      client_id?: string | null;
      caregiver_id?: string | null;
      shift_id?: string | null;
      occurred_at: string;
      attachment?: File | null;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not authenticated");

      let attachment_path: string | null = null;
      if (input.attachment) {
        const path = `${uid}/${Date.now()}-${sanitize(input.attachment.name)}`;
        const { error: upErr } = await supabase.storage
          .from("incident-attachments")
          .upload(path, input.attachment, {
            contentType: input.attachment.type || undefined,
          });
        if (upErr) throw upErr;
        attachment_path = path;
      }

      const { error } = await (supabase as any).from("incident_reports").insert({
        incident_type: input.incident_type,
        severity: input.severity,
        description: input.description,
        action_taken: input.action_taken || null,
        client_id: input.client_id || null,
        caregiver_id: input.caregiver_id || null,
        shift_id: input.shift_id || null,
        occurred_at: input.occurred_at,
        reported_by: uid,
        attachment_path,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incident-reports"] }),
  });
}

export async function getIncidentAttachmentUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("incident-attachments")
    .createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}