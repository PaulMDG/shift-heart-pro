import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface NotificationPrefs {
  in_shift_messages: boolean;
  admin_alerts: boolean;
}

const DEFAULTS: NotificationPrefs = {
  in_shift_messages: true,
  admin_alerts: true,
};

export function useNotificationPrefs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification-prefs", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NotificationPrefs> => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("in_shift_messages, admin_alerts")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return {
        in_shift_messages: data?.in_shift_messages ?? DEFAULTS.in_shift_messages,
        admin_alerts: data?.admin_alerts ?? DEFAULTS.admin_alerts,
      };
    },
  });
}

export function useUpdateNotificationPrefs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: user.id, ...patch, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-prefs", user?.id] });
    },
  });
}