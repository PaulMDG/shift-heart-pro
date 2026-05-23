import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Kind = "caregiver" | "client";

const TABLE: Record<Kind, string> = {
  caregiver: "caregiver_documents",
  client: "client_documents",
};
const BUCKET: Record<Kind, string> = {
  caregiver: "caregiver-documents",
  client: "client-documents",
};
const FK: Record<Kind, string> = {
  caregiver: "caregiver_id",
  client: "client_id",
};

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export function useUploadDocument(kind: Kind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entityId,
      docType,
      file,
      expiryDate,
      notes,
      existingId,
    }: {
      entityId: string;
      docType: string;
      file: File;
      expiryDate?: string | null;
      notes?: string | null;
      existingId?: string | null;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const path = `${entityId}/${docType}/${Date.now()}-${sanitize(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET[kind])
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;

      const payload: any = {
        [FK[kind]]: entityId,
        doc_type: docType,
        file_path: path,
        expiry_date: expiryDate || null,
        notes: notes || null,
        status: "on_file",
        uploaded_by: uid,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingId) {
        const { error } = await (supabase as any)
          .from(TABLE[kind])
          .update(payload)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from(TABLE[kind]).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`${kind}-documents`] });
    },
  });
}

export function useDeleteDocument(kind: Kind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath?: string | null }) => {
      if (filePath) {
        await supabase.storage.from(BUCKET[kind]).remove([filePath]);
      }
      const { error } = await (supabase as any).from(TABLE[kind]).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`${kind}-documents`] }),
  });
}

export async function getSignedDocumentUrl(kind: Kind, path: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET[kind])
    .createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}