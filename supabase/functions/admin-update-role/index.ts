import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function safeErrorMessage(msg: string): string {
  if (msg === 'Unauthorized' || msg === 'Requires admin role' || msg === 'Invalid target_user_id or role') {
    return msg;
  }
  return 'An internal error occurred. Please try again.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const { target_user_id, role } = await req.json();

    if (!target_user_id || !role || !['admin', 'moderator', 'user'].includes(role)) {
      throw new Error('Invalid target_user_id or role');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseAdmin.from('user_roles').delete().eq('user_id', target_user_id);
    const { error: insertError } = await supabaseAdmin.from('user_roles').insert({
      user_id: target_user_id,
      role,
    });
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[admin-update-role] error:', error);
    const msg = safeErrorMessage(error?.message || '');
    const status = msg === 'Unauthorized' ? 401 : msg === 'Requires admin role' ? 403 : 400;
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  }
});
