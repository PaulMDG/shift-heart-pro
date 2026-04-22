import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Lightweight in-memory metrics for the admin client fetch.
// Exposed on window for ad-hoc inspection: window.__adminClientMetrics
export interface AdminClientMetrics {
  attempts: number;
  successes: number;
  errors: number;
  totalDurationMs: number;
  lastDurationMs: number | null;
  lastError: string | null;
  errorRate: number;
  avgDurationMs: number;
}

const metrics: AdminClientMetrics = {
  attempts: 0,
  successes: 0,
  errors: 0,
  totalDurationMs: 0,
  lastDurationMs: null,
  lastError: null,
  get errorRate() {
    return this.attempts === 0 ? 0 : this.errors / this.attempts;
  },
  get avgDurationMs() {
    return this.successes === 0 ? 0 : this.totalDurationMs / this.successes;
  },
} as AdminClientMetrics;

if (typeof window !== "undefined") {
  (window as any).__adminClientMetrics = metrics;
}

export function getAdminClientMetrics(): AdminClientMetrics {
  return metrics;
}

/**
 * Admin-only fetch of full client row (incl. emergency contact + care plan).
 * Cached per (shiftId, clientId) so the panel stays accurate when the same
 * client appears across multiple shifts.
 */
export function useAdminClient(
  clientId: string | undefined,
  shiftId?: string | undefined,
) {
  return useQuery({
    queryKey: ["admin-client", shiftId ?? null, clientId],
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 min: cache full client per shift, avoid refetch on re-render
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const start = performance.now();
      metrics.attempts += 1;
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, address, care_type, emergency_contact, emergency_phone, care_plan_summary")
        .eq("id", clientId!)
        .maybeSingle();
      const duration = performance.now() - start;
      metrics.lastDurationMs = duration;
      if (error) {
        metrics.errors += 1;
        metrics.lastError = error.message;
        // eslint-disable-next-line no-console
        console.warn("[useAdminClient] fetch failed", {
          shiftId,
          clientId,
          durationMs: Math.round(duration),
          message: error.message,
          errorRate: metrics.errorRate,
        });
        throw error;
      }
      metrics.successes += 1;
      metrics.totalDurationMs += duration;
      // eslint-disable-next-line no-console
      console.debug("[useAdminClient] fetch ok", {
        shiftId,
        clientId,
        durationMs: Math.round(duration),
        avgMs: Math.round(metrics.avgDurationMs),
        errorRate: Number(metrics.errorRate.toFixed(3)),
      });
      return data;
    },
  });
}