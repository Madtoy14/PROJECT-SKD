// Supabase Edge Function: Validate Energy
// Deploy with: supabase functions deploy validate-energy

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateEnergyRequest {
  userId: string;
  energyRequired: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, energyRequired }: ValidateEnergyRequest = await req.json();

    // Verify user can only validate their own energy
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('energy, last_energy_update')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate regenerated energy
    const lastUpdate = new Date(profile.last_energy_update);
    const now = new Date();
    const minutesPassed = (now.getTime() - lastUpdate.getTime()) / 1000 / 60;
    const energyGained = Math.floor(minutesPassed / 2.5);
    const currentEnergy = Math.min(profile.energy + energyGained, 25);

    // Update energy if regenerated
    if (energyGained > 0) {
      await supabaseClient
        .from('profiles')
        .update({
          energy: currentEnergy,
          last_energy_update: now.toISOString(),
        })
        .eq('id', userId);
    }

    // Check if user has enough energy
    const hasEnough = currentEnergy >= energyRequired;

    return new Response(
      JSON.stringify({
        valid: hasEnough,
        currentEnergy,
        required: energyRequired,
        message: hasEnough
          ? 'Sufficient energy'
          : `Need ${energyRequired - currentEnergy} more energy`,
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
