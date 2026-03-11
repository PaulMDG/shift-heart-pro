import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BillingRate {
  id: string;
  client_id: string | null;
  hourly_rate: number;
  effective_from: string;
  created_by: string;
  created_at: string;
}

export function useBillingRates() {
  return useQuery({
    queryKey: ["billing_rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_rates")
        .select("*")
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return data as BillingRate[];
    },
  });
}

export function useSetBillingRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { client_id: string | null; hourly_rate: number; effective_from: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("billing_rates").upsert({
        client_id: params.client_id,
        hourly_rate: params.hourly_rate,
        effective_from: params.effective_from,
        created_by: user.id,
      }, { onConflict: "client_id,effective_from" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing_rates"] }),
  });
}

/** Get the applicable hourly rate for a client on a given date */
export function getApplicableRate(rates: BillingRate[], clientId: string, date: string): number {
  // First try client-specific rate
  const clientRate = rates
    .filter((r) => r.client_id === clientId && r.effective_from <= date)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
  if (clientRate) return Number(clientRate.hourly_rate);

  // Fall back to global rate (client_id = null)
  const globalRate = rates
    .filter((r) => r.client_id === null && r.effective_from <= date)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
  if (globalRate) return Number(globalRate.hourly_rate);

  return 25; // default
}
