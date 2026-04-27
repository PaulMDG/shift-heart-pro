import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget email notification.
 * Failures are logged but never thrown — email is best-effort.
 */
export async function sendNotificationEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("send-notification-email", {
      body: args,
    });
    if (error) console.error("[notifyEmail] invoke error:", error);
  } catch (e) {
    console.error("[notifyEmail] unexpected error:", e);
  }
}

/** Fetch admin emails (users with admin role) for system alerts. */
export async function getAdminEmails(): Promise<string[]> {
  try {
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (rolesErr || !roles?.length) return [];
    // Try to get emails via auth.admin… not available client-side.
    // Fall back to a single configured admin alias on the org domain.
    return ["care@comfortlink.app"];
  } catch {
    return ["care@comfortlink.app"];
  }
}

/** Get the email address of a specific user via their profile/auth (best-effort). */
export async function getUserEmail(userId: string): Promise<string | null> {
  // We can't read auth.users from the client. The recipient email must be
  // surfaced through a server side mechanism if needed. For caregivers we
  // pass the email at call time when available (e.g. from the auth session).
  return null;
}

export const emailTemplate = (title: string, bodyHtml: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a;">
  <div style="border-bottom:2px solid #ea580c;padding-bottom:12px;margin-bottom:20px;">
    <h1 style="margin:0;font-size:20px;color:#ea580c;">ComfortLink</h1>
  </div>
  <h2 style="font-size:18px;margin:0 0 12px;">${title}</h2>
  <div style="font-size:14px;line-height:1.6;color:#334155;">${bodyHtml}</div>
  <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:12px;">
    Sent by ComfortLink &middot; care@comfortlink.app
  </p>
</div>`;