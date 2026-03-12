import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTimesheetApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, timesheet_status }: { id: string; timesheet_status: string }) => {
      // Update the shift timesheet status
      const { error } = await supabase
        .from("shifts")
        .update({ timesheet_status } as any)
        .eq("id", id);
      if (error) throw error;

      // Fetch the shift to get caregiver_id and client info for the notification
      const { data: shift } = await supabase
        .from("shifts")
        .select("caregiver_id, date, client:clients(name)")
        .eq("id", id)
        .single();

      if (shift?.caregiver_id) {
        const clientName = (shift as any).client?.name || "Unknown";
        const title = timesheet_status === "approved" ? "Timesheet Approved ✅" : "Timesheet Rejected ❌";
        const message = `Your timesheet for ${clientName} on ${shift.date} has been ${timesheet_status}.`;

        await supabase.from("notifications").insert({
          user_id: shift.caregiver_id,
          title,
          message,
          type: "timesheet",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-shifts"] });
      qc.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}
