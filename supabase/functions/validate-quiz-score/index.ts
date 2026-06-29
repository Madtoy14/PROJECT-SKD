// Supabase Edge Function: Validate Quiz Score
// Deploy with: supabase functions deploy validate-quiz-score
// Prevents client-side score manipulation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Question {
  id: string;
  correct: string;
  category: string;
}

interface ValidateScoreRequest {
  sessionId: string;
  answers: Record<string, string>;
  claimedScore: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

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

    const { sessionId, answers, claimedScore }: ValidateScoreRequest = await req.json();

    // Get session data
    const { data: session, error: sessionError } = await supabaseClient
      .from('quiz_sessions')
      .select('user_id, questions_json, used_powerups')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    if (session.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate actual score
    const questions: Question[] = session.questions_json;
    let actualScore = 0;
    let twkScore = 0;
    let tiuScore = 0;
    let tkpScore = 0;
    let correctCount = 0;

    // Check if score multiplier was used
    const usedPowerups = session.used_powerups || [];
    const hasScoreMultiplier = usedPowerups.some(
      (p: any) => p.powerup === 'item_skor_ganda'
    );

    questions.forEach((q, index) => {
      const userAnswer = answers[index.toString()];
      if (userAnswer === q.correct) {
        correctCount++;
        const points = hasScoreMultiplier ? 10 : 5; // Check if multiplier was used
        actualScore += points;

        // Category scores (always 5 points per correct)
        if (q.category === 'TWK') twkScore += 5;
        else if (q.category === 'TIU') tiuScore += 5;
        else if (q.category === 'TKP') tkpScore += 5;
      }
    });

    // Validate claimed score
    const isValid = Math.abs(actualScore - claimedScore) <= 5; // Allow small margin for powerup timing

    // Calculate accuracy
    const accuracy = (correctCount / questions.length) * 100;

    return new Response(
      JSON.stringify({
        valid: isValid,
        actualScore,
        claimedScore,
        twkScore,
        tiuScore,
        tkpScore,
        correctCount,
        totalQuestions: questions.length,
        accuracy: accuracy.toFixed(2),
        message: isValid ? 'Score validated' : 'Score mismatch detected',
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
