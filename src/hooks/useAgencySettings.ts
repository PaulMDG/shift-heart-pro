import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgencySettings {
  id: string;
  geofence_radius_m: number;
  accuracy_threshold_m: number;
  repeat_failure_threshold: number;
  updated_at: string;
  // Quick Communication contact directory (all optional)
  agency_name?: string | null;
  agency_phone?: string | null;
  agency_email?: string | null;
  scheduler_name?: string | null;
  scheduler_phone?: string | null;
  scheduler_email?: string | null;
  clinical_supervisor_name?: string | null;
  clinical_supervisor_phone?: string | null;
  clinical_supervisor_email?: string | null;
  family_contact_label?: string | null;
  family_contact_phone?: string | null;
  family_contact_email?: string | null;
  documents_url?: string | null;
}

export const DEFAULT_SETTINGS: AgencySettings = {
  id: "default",
  geofence_radius_m: 200,
  accuracy_threshold_m: 100,
  repeat_failure_threshold: 2,
  updated_at: new Date(0).toISOString(),
};

export function useAgencySettings() {
  return useQuery({
    queryKey: ["agency-settings"],
    staleTime: 60_000,
    queryFn: async (): Promise<AgencySettings> => {
      const { data, error } = await (supabase.from("agency_settings") as any)
        .select("*")
        .eq("is_global", true)
        .maybeSingle();
      if (error) {
        console.warn("[useAgencySettings]", error.message);
        return DEFAULT_SETTINGS;
      }
      return (data as AgencySettings) ?? DEFAULT_SETTINGS;
    },
  });
}

export function useUpdateAgencySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AgencySettings>) => {
      const { data: existing } = await (supabase.from("agency_settings") as any)
        .select("id")
        .eq("is_global", true)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await (supabase.from("agency_settings") as any)
          .update(patch)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("agency_settings") as any)
          .insert({ ...patch, is_global: true });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agency-settings"] }),
  });
}

/** Async fetcher for use outside React components (mutations, helpers). */
export async function fetchAgencySettings(): Promise<AgencySettings> {
  const { data, error } = await (supabase.from("agency_settings") as any)
    .select("*")
    .eq("is_global", true)
    .maybeSingle();
  if (error) return DEFAULT_SETTINGS;
  return (data as AgencySettings) ?? DEFAULT_SETTINGS;
}