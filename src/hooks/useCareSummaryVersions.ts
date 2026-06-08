import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CareSummary } from "@/hooks/useCareSummary";

export interface CareSummaryVersion {
  id: string;
  shift_id: string;
  version_no: number;
  snapshot: Partial<CareSummary> & Record<string, any>;
  created_by: string | null;
  created_at: string;
  changer_name?: string | null;
}

export function useCareSummaryVersions(shiftId?: string) {
  return useQuery({
    queryKey: ["care-summary-versions", shiftId],
    enabled: !!shiftId,
    queryFn: async (): Promise<CareSummaryVersion[]> => {
      const { data, error } = await (supabase as any)
        .from("care_summary_versions")
        .select("id, shift_id, version_no, snapshot, created_by, created_at")
        .eq("shift_id", shiftId!)
        .order("version_no", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as CareSummaryVersion[];
      const ids = Array.from(new Set(rows.map((r) => r.created_by).filter(Boolean))) as string[];
      if (ids.length === 0) return rows;
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name").in("id", ids);
      const byId = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
      return rows.map((r) => ({ ...r, changer_name: r.created_by ? byId.get(r.created_by) ?? null : null }));
    },
  });
}

/** Restore a previous version by writing its snapshot fields back into visit_care_summary. */
export function useRestoreCareSummaryVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, snapshot }: { shiftId: string; snapshot: Partial<CareSummary> & Record<string, any> }) => {
      const allowed = [
        "meals_status","meals_label","medications_status","medications_count",
        "hydration","bowel_movement","mobility_assisted","incident_severity","incident_note",
        "notes_text","voice_url","voice_transcript","photo_urls","visibility","submitted_at",
      ];
      const payload: Record<string, any> = { shift_id: shiftId };
      for (const k of allowed) if (k in snapshot) payload[k] = (snapshot as any)[k];
      const { data, error } = await (supabase as any)
        .from("visit_care_summary")
        .upsert(payload, { onConflict: "shift_id" })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["care-summary", vars.shiftId] });
      qc.invalidateQueries({ queryKey: ["care-summary-versions", vars.shiftId] });
    },
  });
}

/** Tiny diff helper: returns list of changed field names between two snapshots. */
export function diffSnapshots(a: Record<string, any> | null | undefined, b: Record<string, any> | null | undefined): string[] {
  const fields = [
    "meals_status","medications_status","medications_count","hydration","bowel_movement",
    "mobility_assisted","incident_severity","incident_note","notes_text","voice_url","photo_urls","visibility",
  ];
  const out: string[] = [];
  for (const f of fields) {
    const av = a?.[f]; const bv = b?.[f];
    const aJ = JSON.stringify(av ?? null); const bJ = JSON.stringify(bv ?? null);
    if (aJ !== bJ) out.push(f);
  }
  return out;
}