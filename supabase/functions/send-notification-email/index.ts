// Sends notification emails via Resend connector gateway.
// Triggered from client code on shift events (clock-in/out, swap, assignment, accept/decline).
// Supports looking up caregiver email from auth.users when caregiver_id is provided.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';
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
}

function isValidEmail(e: string) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const body = (await req.json()) as Payload;
    let recipients = Array.isArray(body.to) ? body.to : body.to ? [body.to] : [];

    // If caregiver_id is provided, look up their email server-side
    if (body.caregiver_id) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (SUPABASE_URL && SERVICE_ROLE_KEY) {
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        const { data: userData, error: userErr } = await adminClient.auth.admin.getUserById(body.caregiver_id);
        if (!userErr && userData?.user?.email) {
          recipients = [...recipients, userData.user.email];
        } else {
          console.warn('Could not look up caregiver email:', userErr?.message);
        }
      }
    }

    const validRecipients = recipients.filter(isValidEmail);
    if (validRecipients.length === 0) {
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

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM,
        to: validRecipients,
        subject: body.subject,
        html: body.html,
      }),
    });

    const data = await response.json();
    const emailSuccess = response.ok;

    // Create in-app notification if requested
    if (body.create_notification) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (SUPABASE_URL && SERVICE_ROLE_KEY) {
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        await adminClient.from('notifications').insert({
          user_id: body.create_notification.user_id,
          title: body.create_notification.title,
          message: body.create_notification.message,
          type: body.create_notification.type || 'shift',
          email_status: emailSuccess ? 'sent' : 'failed',
          related_shift_id: body.create_notification.related_shift_id || null,
        });
      }
    }

    if (!response.ok) {
      console.error('Resend API error', response.status, data);
      return new Response(JSON.stringify({ error: 'Email send failed', details: data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('send-notification-email error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});