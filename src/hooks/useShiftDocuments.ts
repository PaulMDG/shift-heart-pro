import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

export const ALLOWED_DOC_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const MAX_DOC_BYTES = 15 * 1024 * 1024; // 15 MB

export function validateDocFile(file: File): string | null {
  if (file.size > MAX_DOC_BYTES) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 15 MB.`;
  }
  const okExt = /\.(jpe?g|png|heic|webp|pdf|docx?|)$/i.test(file.name);
  if (file.type && !ALLOWED_DOC_TYPES.includes(file.type) && !okExt) {
    return "Unsupported file type. Use JPG, PNG, HEIC, WEBP, PDF, DOC or DOCX.";
  }
  return null;
}

/**
 * Past completed shifts the current caregiver worked for the given client.
 * Relies on RLS — caregivers only see their own shifts.
 */
export function useVisitHistory(clientId: string | undefined, excludeShiftId?: string) {
  return useQuery({
    queryKey: ["visit-history", clientId, excludeShiftId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("id, date, start_time, end_time, status, clock_in_time, clock_out_time, clock_out_notes")
        .eq("client_id", clientId!)
        .eq("status", "completed")
        .order("date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.id !== excludeShiftId).slice(0, 4);
    },
  });
}

/** Documents uploaded for a specific visit, tagged with `visit:<shiftId>`. */
export function useShiftDocuments(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["shift-documents", shiftId],
    enabled: !!shiftId,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return [];
      const { data, error } = await (supabase as any)
        .from("caregiver_documents")
        .select("id, file_path, doc_type, uploaded_at, notes")
        .eq("caregiver_id", uid)
        .eq("doc_type", `visit:${shiftId}`)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

/** Upload visit-related documentation under the current caregiver's folder. */
export function useUploadShiftDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, file, notes }: { shiftId: string; file: File; notes?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const path = `${uid}/visit-${shiftId}/${Date.now()}-${sanitize(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from("caregiver-documents")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;

      const { error } = await (supabase as any).from("caregiver_documents").insert({
        caregiver_id: uid,
        doc_type: `visit:${shiftId}`,
        file_path: path,
        status: "on_file",
        uploaded_by: uid,
        notes: notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["shift-documents", vars.shiftId] });
      toast.success("Document uploaded");
    },
    onError: (e: any) => toast.error(e.message ?? "Upload failed"),
  });
}

export async function getShiftDocumentUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("caregiver-documents")
    .createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}