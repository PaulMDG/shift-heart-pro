import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLogCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipientId,
      recipientName,
      recipientPhone,
      status = "initiated",
    }: {
      recipientId: string;
      recipientName?: string | null;
      recipientPhone?: string | null;
      status?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("call_logs").insert({
        caller_id: user.id,
        recipient_id: recipientId,
        recipient_name: recipientName ?? null,
        recipient_phone: recipientPhone ?? null,
        status,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call-logs"] }),
  });
}