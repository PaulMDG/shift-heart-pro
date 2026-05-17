import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CareNoteAudit {
  id: string;
  shift_id: string;
  changed_by: string | null;
  changed_at: string;
  old_value: string | null;
  new_value: string | null;
  changer_name?: string | null;
}

export function useCareNoteAudits(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["care-note-audits", shiftId],
    enabled: !!shiftId,
    queryFn: async (): Promise<CareNoteAudit[]> => {
      const { data, error } = await (supabase.from("care_note_audits") as any)
        .select("id, shift_id, changed_by, changed_at, old_value, new_value")
        .eq("shift_id", shiftId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as CareNoteAudit[];
      const ids = Array.from(new Set(rows.map((r) => r.changed_by).filter(Boolean))) as string[];
      if (ids.length === 0) return rows;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
      return rows.map((r) => ({ ...r, changer_name: r.changed_by ? nameById.get(r.changed_by) ?? null : null }));
    },
  });
}
