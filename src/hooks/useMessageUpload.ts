import { supabase } from "@/integrations/supabase/client";

const BUCKET = "message-attachments";
const MAX_BYTES = 25 * 1024 * 1024;

export async function uploadMessageFile(file: File | Blob, filename: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if ((file as File).size && (file as File).size > MAX_BYTES) {
    throw new Error("File exceeds 25 MB limit.");
  }
  const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: (file as File).type || `application/${ext}`,
  });
  if (error) throw error;
  // Private bucket: create a long-lived signed URL (1 year) so recipients can view.
  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) throw signErr;
  return { url: data.signedUrl, path };
}