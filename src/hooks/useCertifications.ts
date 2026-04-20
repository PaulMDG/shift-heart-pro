import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Certification {
  id: string;
  user_id: string;
  name: string;
  issuer: string;
  expiry_date: string | null;
  created_at: string;
}

export function useCertifications() {
  return useQuery({
    queryKey: ["certifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("certifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Certification[];
    },
  });
}

export function useAddCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cert: { name: string; issuer: string; expiry_date: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("certifications").insert({
        user_id: user.id,
        name: cert.name,
        issuer: cert.issuer,
        expiry_date: cert.expiry_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certifications"] }),
  });
}

export function useRemoveCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("certifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certifications"] }),
  });
}

export function useUpdateCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cert: { id: string; name: string; issuer: string; expiry_date: string | null }) => {
      const { error } = await supabase
        .from("certifications")
        .update({
          name: cert.name,
          issuer: cert.issuer,
          expiry_date: cert.expiry_date || null,
        })
        .eq("id", cert.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certifications"] }),
  });
}
