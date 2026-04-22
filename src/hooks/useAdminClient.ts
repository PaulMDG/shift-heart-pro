import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ["admin-client", clientId],
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 min: cache full client per shift, avoid refetch on re-render
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, address, care_type, emergency_contact, emergency_phone, care_plan_summary")
        .eq("id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}