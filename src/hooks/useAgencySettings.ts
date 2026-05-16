import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgencySettings {
  id: string;
  geofence_radius_m: number;
  accuracy_threshold_m: number;
  repeat_failure_threshold: number;
  updated_at: string;
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
    mutationFn: async (patch: Partial<Pick<AgencySettings, "geofence_radius_m" | "accuracy_threshold_m" | "repeat_failure_threshold">>) => {
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