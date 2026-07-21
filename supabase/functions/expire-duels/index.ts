// Supabase Edge Function: Expire Pending Duels
// Deploy with: supabase functions deploy expire-duels
// Run as cron job every 5 minutes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function unauthorized(message = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(async (req) => {
  // Hanya accept POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Verify cron secret — fail-closed: jika secret kosong, tolak request
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return unauthorized('Server misconfiguration: CRON_SECRET not set');
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return unauthorized();
    }

    // Create service role client for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all pending duels that have expired
    const { data: expiredDuels, error: fetchError } = await supabaseClient
      .from('duels')
      .select('id, challenger_id, opponent_id, expires_at')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!expiredDuels || expiredDuels.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No expired duels found',
          expired: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update all expired duels
    const { error: updateError } = await supabaseClient
      .from('duels')
      .update({ status: 'expired' })
      .in('id', expiredDuels.map(d => d.id));

    if (updateError) {
      throw updateError;
    }

    // Create notifications for expired duels
    const notifications = expiredDuels.map(duel => ({
      user_id: duel.challenger_id,
      type: 'system',
      title: 'Tantangan Duel Kadaluarsa',
      message: 'Tantangan duel Anda tidak direspons dan telah kadaluarsa.',
      metadata: { duel_id: duel.id }
    }));

    await supabaseClient.from('notifications').insert(notifications);

    return new Response(
      JSON.stringify({
        message: 'Successfully expired pending duels',
        expired: expiredDuels.length,
        duelIds: expiredDuels.map(d => d.id)
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
