import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget email notification.
 * Failures are logged but never thrown — email is best-effort.
 */
export async function sendNotificationEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
  caregiver_id?: string;
  create_notification?: {
    user_id: string;
    title: string;
    message: string;
    type?: string;
    related_shift_id?: string;
  };
}): Promise<void> {
  try {
    // Confirm session is active before invoking — a missing token causes a
    // silent 401 that never reaches the edge function (empty logs).
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn("[notifyEmail] no active session — skipping notification");
      return;
    }

    const { error } = await supabase.functions.invoke("send-notification-email", {
      body: args,
    });

    if (error) {
      console.error("[notifyEmail] invoke error:", {
        message: error.message,
        // FunctionsHttpError surfaces the HTTP status; log it for diagnostics
        context: (error as any).context ?? null,
      });
    }
  } catch (e) {
    console.error("[notifyEmail] unexpected error:", e);
  }
}

/**
 * Fetch admin email addresses from the profiles table.
 *
 * Requires a `profiles` table with an `email` column (or equivalent view)
 * joined through `user_roles`. Falls back to the configured admin alias
 * if the query fails or returns nothing.
 *
 * NOTE: auth.users is not readable client-side. Email must be stored in
 * `profiles` or a similar public table at sign-up time.
 */
export async function getAdminEmails(): Promise<string[]> {
  const FALLBACK = ["care@comfortlink.app"];

  try {
    // Step 1: get admin user IDs from user_roles
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesErr) {
      console.warn("[getAdminEmails] user_roles query failed:", rolesErr.message);
      return FALLBACK;
    }
    if (!roles?.length) {
      console.warn("[getAdminEmails] no admin roles found — using fallback");
      return FALLBACK;
    }

    const adminIds = roles.map((r) => r.user_id);

    // Step 2: fetch emails from profiles table for those user IDs.
    // Your profiles table must expose an `email` column (populated at sign-up).
    const { data: profiles, error: profilesErr } = await (supabase
      .from("profiles") as any)
      .select("email")
      .in("id", adminIds);

    if (profilesErr) {
      console.warn("[getAdminEmails] profiles query failed:", profilesErr.message);
      return FALLBACK;
    }

    const emails = ((profiles ?? []) as any[])
      .map((p) => p.email as string | null)
      .filter((e): e is string => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (!emails.length) {
      console.warn("[getAdminEmails] profiles returned no valid emails — using fallback");
      return FALLBACK;
    }

    console.log(`[getAdminEmails] resolved ${emails.length} admin email(s)`);
    return emails;

  } catch (e) {
    console.error("[getAdminEmails] unexpected error:", e);
    return FALLBACK;
  }
}

export const emailTemplate = (title: string, bodyHtml: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a;">
  <div style="border-bottom:2px solid #ea580c;padding-bottom:12px;margin-bottom:20px;">
    <h1 style="margin:0;font-size:20px;color:#ea580c;">ComfortLink</h1>
  </div>
  <h2 style="font-size:18px;margin:0 0 12px;">${title}</h2>
  <div style="font-size:14px;line-height:1.6;color:#334155;">${bodyHtml}</div>
  <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:12px;">
    Sent by ComfortLink &middot; noreply@comfortlink.app
  </p>
</div>`;

/**
 * Retry a failed email notification using the stored payload on the notification row.
 * Returns true on success.
 */
export async function retryNotificationEmail(
  notificationId: string,
  emailPayload: {
    to: string[];
    subject: string;
    html: string;
    caregiver_id?: string;
  }
): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn("[retryNotificationEmail] no active session");
      return false;
    }

    const { error } = await supabase.functions.invoke("send-notification-email", {
      body: {
        ...emailPayload,
        retry_notification_id: notificationId,
      },
    });

    if (error) console.error("[retryNotificationEmail] invoke error:", error);
    return !error;
  } catch (e) {
    console.error("[retryNotificationEmail] unexpected error:", e);
    return false;
  }
}
