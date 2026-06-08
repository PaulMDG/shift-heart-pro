import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CareSummary {
  id: string;
  shift_id: string;
  meals_status: string | null;
  meals_label: string | null;
  medications_status: string | null;
  medications_count: number | null;
  hydration: string | null;
  bowel_movement: string | null;
  mobility_assisted: boolean | null;
  incident_severity: string | null;
  incident_note: string | null;
  notes_text: string | null;
  voice_url: string | null;
  voice_transcript: string | null;
  photo_urls: string[];
  visibility: "family_care_team" | "care_team_only";
  submitted_at: string | null;
}

export function useCareSummary(shiftId?: string) {
  return useQuery({
    queryKey: ["care-summary", shiftId],
    enabled: !!shiftId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("visit_care_summary")
        .select("*")
        .eq("shift_id", shiftId!)
        .maybeSingle();
      if (error) throw error;
      return (data as CareSummary | null) ?? null;
    },
  });
}

export function useUpsertCareSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CareSummary> & { shift_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...input, created_by: input.shift_id ? user?.id ?? null : null };
      const { data, error } = await (supabase as any)
        .from("visit_care_summary")
        .upsert(payload, { onConflict: "shift_id" })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as CareSummary;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["care-summary", vars.shift_id] });
    },
  });
}

export interface QuickNoteTemplate {
  id: string;
  user_id: string;
  label: string;
  icon: string | null;
  content: string;
}

export const DEFAULT_QUICK_NOTES: { label: string; icon: string; content: string }[] = [
  { label: "All went well", icon: "✅", content: "Visit went smoothly. Client was in good spirits and all care tasks completed." },
  { label: "Refused meal", icon: "🍽️", content: "Client declined the prepared meal. Hydration was offered." },
  { label: "Mood low", icon: "💭", content: "Client appeared withdrawn today. Encouraged conversation and engagement." },
  { label: "Pain reported", icon: "⚠️", content: "Client reported pain. Comfort measures applied; family/nurse notified." },
  { label: "Family visited", icon: "👪", content: "Family member visited during the shift." },
];

export function useQuickNoteTemplates() {
  return useQuery({
    queryKey: ["quick-note-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quick_note_templates")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuickNoteTemplate[];
    },
  });
}

export function useAddQuickNoteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; icon?: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("quick_note_templates")
        .insert({ user_id: user.id, label: input.label, icon: input.icon ?? "📝", content: input.content })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as QuickNoteTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quick-note-templates"] }),
  });
}