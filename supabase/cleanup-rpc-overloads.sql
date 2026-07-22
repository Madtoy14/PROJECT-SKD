-- ============================================================
-- CLEANUP: drop legacy RPC overloads after partial apply
-- Jalankan ini di SQL Editor (boleh berulang / aman)
-- ============================================================

-- Lihat overload yang ada sekarang
SELECT
  p.proname AS routine_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'purchase_item','sell_item','spin_wheel','daily_claim',
    'consume_energy','complete_quiz_session','claim_quest',
    'consume_powerup','update_profile_public'
  )
ORDER BY 1, 2;

-- Drop overload lama (yang tidak dipakai client baru)
DO $$
BEGIN
  -- purchase_item lama: (item_id, cost, item_type, quantity)
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.purchase_item(text, integer, text, integer)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- sell_item lama: (item_id, original_cost)
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.sell_item(text, integer)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- spin/daily lama: (user_id uuid)
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.spin_wheel(uuid)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.daily_claim(uuid)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- consume_energy lama: (user_id, amount)
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.consume_energy(uuid, integer)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- complete_quiz_session legacy panjang
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.complete_quiz_session(uuid, integer, integer, integer, integer, numeric, integer, integer, boolean, boolean, boolean, boolean, jsonb, text)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.complete_quiz_session(uuid, integer, integer, integer, integer, numeric, integer, integer, boolean, boolean, boolean, boolean)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Pastikan signature yang dipakai client ada (CREATE OR REPLACE idempotent)
CREATE OR REPLACE FUNCTION public.complete_quiz_session(
    p_session_id UUID,
    p_coins_earned INTEGER DEFAULT 0,
    p_xp_earned INTEGER DEFAULT 0,
    p_passed_twk BOOLEAN DEFAULT NULL,
    p_passed_tiu BOOLEAN DEFAULT NULL,
    p_passed_tkp BOOLEAN DEFAULT NULL,
    p_passed_overall BOOLEAN DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_session public.quiz_sessions;
    v_result_id UUID;
    v_user_id UUID;
    v_score INTEGER := 0;
    v_twk_score INTEGER := 0;
    v_tiu_score INTEGER := 0;
    v_tkp_score INTEGER := 0;
    v_passed_twk BOOLEAN;
    v_passed_tiu BOOLEAN;
    v_passed_tkp BOOLEAN;
    v_passed_overall BOOLEAN;
    v_twk_count INTEGER := 0;
    v_tiu_count INTEGER := 0;
    v_tkp_count INTEGER := 0;
    v_coins_earned INTEGER := 0;
    v_xp_earned INTEGER := 0;
BEGIN
    SELECT * INTO v_session
    FROM public.quiz_sessions
    WHERE id = p_session_id AND user_id = auth.uid()
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Session not found or not yours';
    END IF;

    IF v_session.status = 'completed' THEN
        SELECT id INTO v_result_id
        FROM public.quiz_results
        WHERE session_id = p_session_id
        LIMIT 1;
        IF FOUND THEN
          RETURN v_result_id;
        END IF;
    END IF;

    v_user_id := v_session.user_id;

    WITH qa AS (
        SELECT
            (q.value->>'category') AS category,
            q.value->>'correct' AS correct_opt,
            a.value AS user_opt,
            q.value->'options' AS options
        FROM jsonb_array_elements(v_session.questions_json) WITH ORDINALITY AS q(value, idx)
        LEFT JOIN jsonb_each_text(v_session.answers_json) AS a(key, value)
          ON a.key::int = (q.idx - 1)
    ),
    scored AS (
        SELECT
            qa.category,
            COALESCE((
                SELECT (o->>'score')::int
                FROM jsonb_array_elements(qa.options) AS o
                WHERE o->>'id' = qa.user_opt
            ), 0) AS score
        FROM qa
    )
    SELECT
        COALESCE(SUM(score), 0),
        COALESCE(SUM(CASE WHEN category = 'TWK' THEN score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'TIU' THEN score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'TKP' THEN score ELSE 0 END), 0),
        COUNT(CASE WHEN category = 'TWK' THEN 1 END),
        COUNT(CASE WHEN category = 'TIU' THEN 1 END),
        COUNT(CASE WHEN category = 'TKP' THEN 1 END)
    INTO v_score, v_twk_score, v_tiu_score, v_tkp_score, v_twk_count, v_tiu_count, v_tkp_count
    FROM scored;

    IF v_session.mode = 'tryout' THEN
        v_passed_twk := v_twk_score >= CASE WHEN v_twk_count < 30 THEN CEIL(v_twk_count * 0.433 * 5) ELSE 65 END;
        v_passed_tiu := v_tiu_score >= CASE WHEN v_tiu_count < 35 THEN CEIL(v_tiu_count * 0.457 * 5) ELSE 80 END;
        v_passed_tkp := v_tkp_score >= CASE WHEN v_tkp_count < 45 THEN CEIL(v_tkp_count * 0.293 * 5) ELSE 166 END;
        v_passed_overall := v_passed_twk AND v_passed_tiu AND v_passed_tkp;
    ELSE
        v_passed_twk := true;
        v_passed_tiu := true;
        v_passed_tkp := true;
        v_passed_overall := true;
    END IF;

    v_coins_earned := LEAST(v_score * 2, 500);
    v_xp_earned := LEAST(v_score, 100);

    UPDATE public.quiz_sessions
    SET status = 'completed',
        completed_at = NOW(),
        score = v_score,
        twk_score = v_twk_score,
        tiu_score = v_tiu_score,
        tkp_score = v_tkp_score
    WHERE id = p_session_id;

    INSERT INTO public.quiz_results (
        user_id, session_id, mode, package_id, package_version,
        score, twk_score, tiu_score, tkp_score, accuracy,
        time_spent_seconds, coins_earned, xp_earned,
        questions_json, answers_json, powerups_used,
        passed_twk, passed_tiu, passed_tkp, passed_overall, completed_at
    ) VALUES (
        v_user_id, p_session_id, v_session.mode, v_session.package_id, v_session.package_version,
        v_score, v_twk_score, v_tiu_score, v_tkp_score,
        CASE WHEN (v_twk_count + v_tiu_count + v_tkp_count) > 0
             THEN ROUND((v_score::numeric / ((v_twk_count + v_tiu_count + v_tkp_count) * 4) * 100), 1)
             ELSE 0 END,
        v_session.time_spent_seconds, v_coins_earned, v_xp_earned,
        v_session.questions_json, v_session.answers_json, v_session.used_powerups,
        v_passed_twk, v_passed_tiu, v_passed_tkp, v_passed_overall, NOW()
    ) RETURNING id INTO v_result_id;

    UPDATE public.profiles
    SET coins = coins + v_coins_earned,
        score = score + v_xp_earned
    WHERE id = v_user_id;

    RETURN v_result_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.complete_quiz_session(UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- Verifikasi akhir: harus 1 baris per function (kecuali memang sengaja multi)
SELECT
  p.proname AS routine_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'purchase_item','sell_item','spin_wheel','daily_claim',
    'consume_energy','complete_quiz_session','claim_quest',
    'consume_powerup','update_profile_public'
  )
ORDER BY 1, 2;
