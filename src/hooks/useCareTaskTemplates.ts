import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CareTaskTemplate {
  id: string;
  care_type: string;
  label: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCareTaskTemplates() {
  return useQuery({
    queryKey: ["care-task-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_task_templates")
        .select("*")
        .order("care_type", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CareTaskTemplate[];
    },
  });
}

export function useCreateCareTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { care_type: string; label: string; sort_order?: number }) => {
      const { error } = await supabase.from("care_task_templates").insert({
        care_type: t.care_type.trim(),
        label: t.label.trim(),
        sort_order: t.sort_order ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["care-task-templates"] }),
  });
}

export function useUpdateCareTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; label?: string; sort_order?: number; active?: boolean; care_type?: string }) => {
      const { error } = await supabase.from("care_task_templates").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["care-task-templates"] }),
  });
}

export function useDeleteCareTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("care_task_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["care-task-templates"] }),
  });
}