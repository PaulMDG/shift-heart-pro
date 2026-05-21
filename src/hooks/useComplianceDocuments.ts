import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DocumentRow {
  id: string;
  doc_type: string;
  file_path: string | null;
  expiry_date: string | null;
  status: string;
  notes: string | null;
  uploaded_at: string;
}

export function useAllCaregiverDocuments() {
  return useQuery({
    queryKey: ["caregiver-documents", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("caregiver_documents")
        .select("*");
      if (error) throw error;
      const byCaregiver = new Map<string, DocumentRow[]>();
      for (const row of (data ?? []) as any[]) {
        const list = byCaregiver.get(row.caregiver_id) ?? [];
        list.push(row);
        byCaregiver.set(row.caregiver_id, list);
      }
      return byCaregiver;
    },
  });
}

export function useAllClientDocuments() {
  return useQuery({
    queryKey: ["client-documents", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_documents")
        .select("*");
      if (error) throw error;
      const byClient = new Map<string, DocumentRow[]>();
      for (const row of (data ?? []) as any[]) {
        const list = byClient.get(row.client_id) ?? [];
        list.push(row);
        byClient.set(row.client_id, list);
      }
      return byClient;
    },
  });
}

export function useCaregiverDocuments(caregiverId?: string) {
  return useQuery({
    queryKey: ["caregiver-documents", caregiverId],
    enabled: !!caregiverId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("caregiver_documents")
        .select("*")
        .eq("caregiver_id", caregiverId);
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });
}

export function useClientDocuments(clientId?: string) {
  return useQuery({
    queryKey: ["client-documents", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_documents")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });
}