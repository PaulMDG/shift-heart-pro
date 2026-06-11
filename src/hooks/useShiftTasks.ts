import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ShiftTask {
  id: string;
  shift_id: string;
  template_id: string | null;
  label: string;
  sort_order: number;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useShiftTasks(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["shift-tasks", shiftId],
    enabled: !!shiftId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_tasks")
        .select("*")
        .eq("shift_id", shiftId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ShiftTask[];
    },
  });
}

export function useSeedShiftTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { data, error } = await supabase.rpc("seed_shift_tasks", {
        p_shift_id: shiftId,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (_d, shiftId) => qc.invalidateQueries({ queryKey: ["shift-tasks", shiftId] }),
  });
}

export function useToggleShiftTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean; shiftId: string }) => {
      const { error } = await supabase
        .from("shift_tasks")
        .update({ completed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["shift-tasks", vars.shiftId] }),
  });
}

export function useAddShiftTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, label, sortOrder }: { shiftId: string; label: string; sortOrder?: number }) => {
      const { error } = await supabase.from("shift_tasks").insert({
        shift_id: shiftId,
        label,
        sort_order: sortOrder ?? 1000,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["shift-tasks", vars.shiftId] }),
  });
}

export function useDeleteShiftTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; shiftId: string }) => {
      const { error } = await supabase.from("shift_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["shift-tasks", vars.shiftId] }),
  });
}