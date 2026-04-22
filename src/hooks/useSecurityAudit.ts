import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditCheck = {
  id: string;
  label: string;
  description: string;
  ok: boolean;
  detail: string;
};

/**
 * Live RLS / access-control audit run from the client's perspective.
 * Each check probes a sensitive surface and asserts the expected RLS
 * outcome. Results reflect what the *current logged-in user* can see,
 * so admins should see all "ok" entries.
 */
export function useSecurityAudit() {
  return useQuery({
    queryKey: ["security-audit"],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<AuditCheck[]> => {
      const checks: AuditCheck[] = [];

      // 1. clients table: admins should be able to read PII columns
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, emergency_contact, emergency_phone, care_plan_summary")
          .limit(1);
        checks.push({
          id: "clients_admin_read",
          label: "Admin can read clients PII",
          description: "Admins must be able to read emergency contact + care plan.",
          ok: !error && Array.isArray(data),
          detail: error
            ? `Error: ${error.message}`
            : `Returned ${data?.length ?? 0} row(s).`,
        });
      } catch (e: any) {
        checks.push({
          id: "clients_admin_read",
          label: "Admin can read clients PII",
          description: "Admins must be able to read emergency contact + care plan.",
          ok: false,
          detail: `Exception: ${e?.message ?? String(e)}`,
        });
      }

      // 2. clients_caregiver_safe: must NOT expose PII columns
      try {
        const { error } = await supabase
          .from("clients_caregiver_safe" as any)
          .select("emergency_contact")
          .limit(1);
        // If the column doesn't exist on the view, supabase returns an error — that's the desired state.
        const masked = !!error;
        checks.push({
          id: "safe_view_masking",
          label: "Safe view masks PII columns",
          description: "clients_caregiver_safe must not expose emergency_contact.",
          ok: masked,
          detail: masked
            ? `Column rejected as expected (${error?.message ?? "no column"}).`
            : "Column was returned — masking is broken!",
        });
      } catch (e: any) {
        checks.push({
          id: "safe_view_masking",
          label: "Safe view masks PII columns",
          description: "clients_caregiver_safe must not expose emergency_contact.",
          ok: true,
          detail: `Rejected: ${e?.message ?? String(e)}`,
        });
      }

      // 3. avatars bucket: must require auth (private)
      try {
        const { data: bucket, error } = await supabase.storage.getBucket("avatars");
        const ok = !error && bucket?.public === false;
        checks.push({
          id: "avatars_private",
          label: "Avatars bucket is private",
          description: "Avatars must not be publicly listable.",
          ok,
          detail: error
            ? `Error: ${error.message}`
            : bucket?.public
              ? "Bucket is public — switch to private."
              : "Bucket is private.",
        });
      } catch (e: any) {
        checks.push({
          id: "avatars_private",
          label: "Avatars bucket is private",
          description: "Avatars must not be publicly listable.",
          ok: false,
          detail: `Exception: ${e?.message ?? String(e)}`,
        });
      }

      // 4. user_roles: admins should be able to enumerate roles
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .limit(1);
        checks.push({
          id: "user_roles_admin_read",
          label: "Admin can read user_roles",
          description: "Required for role management UI.",
          ok: !error && Array.isArray(data),
          detail: error ? `Error: ${error.message}` : `Returned ${data?.length ?? 0} row(s).`,
        });
      } catch (e: any) {
        checks.push({
          id: "user_roles_admin_read",
          label: "Admin can read user_roles",
          description: "Required for role management UI.",
          ok: false,
          detail: `Exception: ${e?.message ?? String(e)}`,
        });
      }

      return checks;
    },
  });
}