// Sends notification emails directly via Resend API (no gateway dependency).
// Triggered from client code on shift events (clock-in/out, swap, assignment, accept/decline).
// Supports looking up caregiver email from auth.users when caregiver_id is provided.
// Stores email payload on notification rows for retry on failure.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function safeErrorMessage(msg: string): string {
  if (msg === 'Unauthorized' || msg === 'Requires admin role') return msg;
  if (msg.includes('RESEND_API_KEY')) return 'Email service not configured';
  return 'An internal error occurred. Please try again.';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Direct Resend API — no Lovable gateway needed
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM = 'ComfortLink <noreply@comfortlink.app>';

interface Payload {
  to: string | string[];
  subject: string;
  html: string;
  /** If provided, the function will look up the user's email from auth.users */
  caregiver_id?: string;
  /** If provided, creates an in-app notification for the caregiver */
  create_notification?: {
    user_id: string;
    title: string;
    message: string;
    type?: string;
    related_shift_id?: string;
  };
  /** If provided, retries an existing notification instead of creating a new one */
  retry_notification_id?: string;
}

function isValidEmail(e: string) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Send a push notification via OneSignal REST API (best-effort, fire-and-forget) */
async function sendPushNotification(userId: string, title: string, message: string): Promise<void> {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return;

  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_external_user_ids: [userId],
        headings: { en: title },
        contents: { en: message },
      }),
    });
    if (!res.ok) {
      console.warn('[OneSignal] push failed:', res.status, await res.text());
    }
  } catch (e) {
    console.warn('[OneSignal] push error:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // ── 1. Authenticate caller ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('[Auth] getUser failed:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Verify Resend is configured ─────────────────────────────────────
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('[Config] RESEND_API_KEY is not set in Supabase secrets');
      throw new Error('RESEND_API_KEY not configured');
    }

    // ── 3. Build admin client (needed for caregiver lookup & notification ops)
    if (!SERVICE_ROLE_KEY) {
      console.warn('[Config] SUPABASE_SERVICE_ROLE_KEY not set — caregiver lookup and notifications disabled');
    }
    const adminClient = SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
      : null;

    // ── 4. Resolve recipients ───────────────────────────────────────────────
    const body = (await req.json()) as Payload;
    let recipients: string[] = Array.isArray(body.to) ? body.to : body.to ? [body.to] : [];

    if (body.caregiver_id) {
      if (adminClient) {
        const { data: userData, error: userErr } = await adminClient.auth.admin.getUserById(body.caregiver_id);
        if (!userErr && userData?.user?.email) {
          console.log('[Recipients] resolved caregiver email via auth.users');
          recipients = [...recipients, userData.user.email];
        } else {
          console.warn('[Recipients] caregiver email lookup failed:', userErr?.message);
        }
      } else {
        console.warn('[Recipients] adminClient unavailable — skipping caregiver email lookup');
      }
    }

    const validRecipients = recipients.filter(isValidEmail);
    if (validRecipients.length === 0) {
      console.error('[Recipients] no valid email addresses after filtering. Raw input:', recipients);
      return new Response(JSON.stringify({ error: 'No valid recipients' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!body.subject || !body.html) {
      return new Response(JSON.stringify({ error: 'subject and html are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Email] Sending to: ${validRecipients.join(', ')} | Subject: "${body.subject}"`);

    // ── 5. Send via Resend directly ─────────────────────────────────────────
    let resendResponseData: any = null;
    let emailSuccess = false;

    try {
      const resendRes = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM,
          to: validRecipients,
          subject: body.subject,
          html: body.html,
        }),
      });

      // Guard against non-JSON responses (e.g. gateway 502 HTML pages)
      const contentType = resendRes.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        resendResponseData = await resendRes.json();
      } else {
        const raw = await resendRes.text();
        console.error('[Resend] non-JSON response:', resendRes.status, raw);
        resendResponseData = { error: raw };
      }

      if (resendRes.ok) {
        emailSuccess = true;
        console.log('[Resend] email sent. id:', resendResponseData?.id);
      } else {
        console.error('[Resend] send failed:', resendRes.status, resendResponseData);
      }
    } catch (fetchErr) {
      console.error('[Resend] fetch threw:', fetchErr);
      resendResponseData = { error: String(fetchErr) };
    }

    // ── 6. Persist notification / retry record ──────────────────────────────
    const emailPayload = {
      to: validRecipients,
      subject: body.subject,
      html: body.html,
      caregiver_id: body.caregiver_id,
    };

    if (body.retry_notification_id && adminClient) {
      const { error: updateErr } = await adminClient
        .from('notifications')
        .update({
          email_status: emailSuccess ? 'sent' : 'failed',
          email_payload: emailSuccess ? null : emailPayload,
        })
        .eq('id', body.retry_notification_id);
      if (updateErr) console.error('[Notifications] retry update failed:', updateErr.message);

    } else if (body.create_notification && adminClient) {
      const { error: insertErr } = await adminClient.from('notifications').insert({
        user_id: body.create_notification.user_id,
        title: body.create_notification.title,
        message: body.create_notification.message,
        type: body.create_notification.type || 'shift',
        email_status: emailSuccess ? 'sent' : 'failed',
        related_shift_id: body.create_notification.related_shift_id || null,
        email_payload: emailSuccess ? null : emailPayload,
      });
      if (insertErr) console.error('[Notifications] insert failed:', insertErr.message);

      // Push notification is fire-and-forget — do NOT await
      sendPushNotification(
        body.create_notification.user_id,
        body.create_notification.title,
        body.create_notification.message,
      );
    }

    // ── 7. Return result ────────────────────────────────────────────────────
    if (!emailSuccess) {
      return new Response(
        JSON.stringify({ error: 'Email send failed', details: resendResponseData }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendResponseData?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[send-notification-email] unhandled error:', message);
    return new Response(JSON.stringify({ error: safeErrorMessage(message) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
