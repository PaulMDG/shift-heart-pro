import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  recipient_id: string;
  shift_id?: string;
  preview: string;
  category?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.warn("[send-push-notification] OneSignal env vars missing");
      return json({ ok: false, reason: "onesignal_not_configured" }, 200);
    }

    // Validate caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as Body;
    if (!body?.recipient_id || typeof body.preview !== "string") {
      return json({ error: "Invalid body" }, 400);
    }

    // Resolve admins via service role
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = (roleRows ?? []).map((r: any) => r.user_id as string);

    // Sender name
    const { data: senderProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    const senderName = (senderProfile?.full_name as string) || "New message";

    // Build candidate list with reason (recipient vs admin) so we can apply
    // each user's notification preferences independently.
    const adminSet = new Set(adminIds);
    const candidateIds = Array.from(
      new Set([body.recipient_id, ...adminIds].filter((id) => id && id !== user.id)),
    );
    if (candidateIds.length === 0) return json({ ok: true, sent: 0 });

    // Fetch notification preferences for all candidates
    const { data: prefRows } = await admin
      .from("notification_preferences")
      .select("user_id, in_shift_messages, admin_alerts")
      .in("user_id", candidateIds);
    const prefs = new Map(
      (prefRows ?? []).map((r: any) => [r.user_id as string, r]),
    );

    const externalUserIds = candidateIds.filter((id) => {
      const p = prefs.get(id);
      const isRecipient = id === body.recipient_id;
      const isAdmin = adminSet.has(id);
      // Default ON when no row exists
      const wantsInShift = p?.in_shift_messages ?? true;
      const wantsAdminAlerts = p?.admin_alerts ?? true;
      // Recipient channel: in_shift_messages
      if (isRecipient && wantsInShift) return true;
      // Admin fan-out channel: admin_alerts (skip if same user already
      // qualified as recipient above)
      if (isAdmin && !isRecipient && wantsAdminAlerts) return true;
      return false;
    });

    if (externalUserIds.length === 0) {
      return json({ ok: true, sent: 0, reason: "all_recipients_opted_out" });
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: externalUserIds,
      channel_for_external_user_ids: "push",
      headings: { en: `${senderName}${body.shift_id ? " • Active shift" : ""}` },
      contents: { en: body.preview || "New message" },
      data: {
        type: "chat_message",
        shift_id: body.shift_id ?? null,
        sender_id: user.id,
        category: body.category ?? "general",
      },
    };

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[send-push-notification] OneSignal error", res.status, result);
      return json({ ok: false, status: res.status, result }, 200);
    }
    return json({ ok: true, recipients: externalUserIds.length, result });
  } catch (e) {
    console.error("[send-push-notification] fatal", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}