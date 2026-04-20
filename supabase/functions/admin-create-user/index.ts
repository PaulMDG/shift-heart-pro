import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function safeErrorMessage(msg: string): string {
  if (msg.includes('already been registered') || msg.includes('duplicate') || msg.includes('unique')) {
    return 'A user with this email already exists.';
  }
  if (msg === 'Unauthorized' || msg === 'Requires admin role') {
    return msg;
  }
  if (msg.includes('Invalid') || msg.includes('valid email')) {
    return 'Invalid input provided. Please check email and password.';
  }
  return 'An internal error occurred. Please try again.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error('Unauthorized');
    }
    const userId = claimsData.claims.sub;

    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      throw new Error('Requires admin role');
    }

    const { email, password, full_name, phone, role } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (createError) throw createError;

    if (phone) {
      await supabaseAdmin.from('profiles').update({ phone }).eq('id', newUser.user.id);
    }

    if (role && ['admin', 'moderator', 'user'].includes(role)) {
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        user_id: newUser.user.id,
        role,
      });
      if (roleError) console.error('Failed to assign role:', roleError);
    }

    return new Response(JSON.stringify({ success: true, user: newUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[admin-create-user] error:', error);
    const msg = safeErrorMessage(error?.message || '');
    const status = msg === 'Unauthorized' ? 401 : msg === 'Requires admin role' ? 403 : 400;
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  }
});
