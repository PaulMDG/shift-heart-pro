import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTimesheetApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, timesheet_status }: { id: string; timesheet_status: string }) => {
      const { error } = await supabase
        .from("shifts")
        .update({ timesheet_status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-shifts"] });
      qc.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}
