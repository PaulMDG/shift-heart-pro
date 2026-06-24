import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client photos live in the private `avatars` bucket under `clients/<clientId>/<file>`.
 * `clients.photo_url` stores the storage object path (not a URL).
 * We resolve to short-lived signed URLs on demand and cache them in memory
 * for the lifetime of the tab.
 */
const CACHE = new Map<string, { url: string; expiresAt: number }>();
const SIGN_TTL_SECONDS = 60 * 60; // 1h

export async function getClientPhotoUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const cached = CACHE.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, SIGN_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  CACHE.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGN_TTL_SECONDS * 1000,
  });
  return data.signedUrl;
}

/** React hook variant that resolves the signed URL asynchronously. */
export function useClientPhotoUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!path) return null;
    const c = CACHE.get(path);
    return c && c.expiresAt > Date.now() + 60_000 ? c.url : null;
  });
  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    getClientPhotoUrl(path).then((v) => {
      if (!cancelled) setUrl(v);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}

export function clientStoragePath(clientId: string, file: File): string {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^(jpe?g|png|webp)$/.test(ext) ? ext : "jpg";
  return `clients/${clientId}/${crypto.randomUUID()}.${safeExt}`;
}

/** Upload a client photo, update the clients row, and remove the previous object. */
export async function uploadClientPhoto(clientId: string, file: File, previousPath?: string | null): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Photo must be under 5 MB");
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
    throw new Error("Only PNG, JPEG, or WebP photos are supported");
  }
  const path = clientStoragePath(clientId, file);
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (upErr) throw upErr;
  const { error: dbErr } = await (supabase.from("clients") as any)
    .update({ photo_url: path })
    .eq("id", clientId);
  if (dbErr) {
    // Best-effort cleanup of orphaned object.
    await supabase.storage.from("avatars").remove([path]).catch(() => undefined);
    throw dbErr;
  }
  if (previousPath && previousPath !== path) {
    await supabase.storage.from("avatars").remove([previousPath]).catch(() => undefined);
  }
  return path;
}

export async function removeClientPhoto(clientId: string, path: string | null | undefined): Promise<void> {
  const { error: dbErr } = await (supabase.from("clients") as any)
    .update({ photo_url: null })
    .eq("id", clientId);
  if (dbErr) throw dbErr;
  if (path) {
    CACHE.delete(path);
    await supabase.storage.from("avatars").remove([path]).catch(() => undefined);
  }
}