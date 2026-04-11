import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSignedSelfieUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }

    // If it's already a full URL (legacy public URLs), use as-is
    if (path.startsWith("http")) {
      setUrl(path);
      return;
    }

    // Generate a signed URL for private bucket
    supabase.storage
      .from("verification-selfies")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (!error && data?.signedUrl) {
          setUrl(data.signedUrl);
        }
      });
  }, [path]);

  return url;
}
