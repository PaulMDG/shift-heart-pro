import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to Supabase Realtime changes on specified tables
 * and invalidates the corresponding React Query cache keys.
 */
export function useRealtimeSync(
  subscriptions: { table: string; queryKey: string[] }[]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
          queryClient.invalidateQueries({ queryKey: ["shifts"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_swap_requests" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-swap-requests"] });
          queryClient.invalidateQueries({ queryKey: ["swap-requests"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
