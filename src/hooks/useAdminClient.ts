import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ["admin-client", clientId],
    enabled: !!clientId,
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