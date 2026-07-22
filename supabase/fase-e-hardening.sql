-- ============================================================
-- Fase E — Hardening (apply di Supabase SQL Editor, SETELAH backup)
-- Project: PROJECT-SKD
-- Isi:
--   1) consume_powerup + log used_powerups
--   2) complete_quiz_session + quest progress server-side
--   3) claim_quest (sentinel 999 + coins_after)
--   4) reset_daily_quests (baru)
-- Signature RPC lama client TIDAK diubah (kecuali reset_daily_quests = baru).
-- ============================================================

-- ############################################################
-- 1) consume_powerup
-- ############################################################
CREATE OR REPLACE FUNCTION public.consume_powerup(
    p_session_id UUID,
    p_item_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_session RECORD;
    v_inv_val INTEGER;
    v_new_qty INTEGER;
    v_used JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    IF p_item_id IS NULL OR length(trim(p_item_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_item');
    END IF;

    SELECT id, user_id, status, used_powerups, current_index INTO v_session
    FROM public.quiz_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'session_not_found');
    END IF;
    IF v_session.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_your_session');
    END IF;
    IF v_session.status NOT IN ('active', 'paused') THEN
        RETURN jsonb_build_object('success', false, 'reason', 'session_not_active');
    END IF;

    SELECT id, inventory INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    v_inv_val := COALESCE((v_profile.inventory ->> p_item_id)::INTEGER, 0);
    IF v_inv_val <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'item_not_available');
    END IF;

    v_new_qty := v_inv_val - 1;
    UPDATE public.profiles
    SET inventory = jsonb_set(
        COALESCE(inventory, '{}'::jsonb),
        ARRAY[p_item_id],
        to_jsonb(v_new_qty)
    )
    WHERE id = v_user_id;

    v_used := COALESCE(v_session.used_powerups, '[]'::jsonb);
    IF jsonb_typeof(v_used) IS DISTINCT FROM 'array' THEN
        v_used := '[]'::jsonb;
    END IF;
    v_used := v_used || jsonb_build_array(
        jsonb_build_object(
            'powerup', p_item_id,
            'questionIndex', COALESCE(v_session.current_index, 0),
            'at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )
    );

    UPDATE public.quiz_sessions
    SET used_powerups = v_used,
        last_activity_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'item_remaining', v_new_qty,
        'item_id', p_item_id
    );
END; $$;

REVOKE EXECUTE ON FUNCTION public.consume_powerup(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_powerup(UUID, TEXT) TO authenticated;

-- ############################################################
-- 2) complete_quiz_session
-- ############################################################
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
AS $$
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
    v_twk_answered INTEGER := 0;
    v_tiu_answered INTEGER := 0;
    v_answers_count INTEGER := 0;
    v_max_combo INTEGER := 0;
    v_cur_combo INTEGER := 0;
    v_progress JSONB;
    v_q1 INTEGER;
    v_q2 INTEGER;
    v_q3 INTEGER;
    v_q4 INTEGER;
    v_q5 INTEGER;
    rec RECORD;
BEGIN
    SELECT * INTO v_session
    FROM public.quiz_sessions
    WHERE id = p_session_id AND user_id = auth.uid()
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Session not found or not yours'; END IF;

    IF v_session.status = 'completed' THEN
        SELECT id INTO v_result_id FROM public.quiz_results WHERE session_id = p_session_id LIMIT 1;
        IF FOUND THEN RETURN v_result_id; END IF;
    END IF;

    v_user_id := v_session.user_id;

    WITH qa AS (
        SELECT
            (q.idx - 1)::int AS q_index,
            (q.value->>'category') AS category,
            q.value->>'correct' AS correct_opt,
            a.value AS user_opt,
            q.value->'options' AS options
        FROM jsonb_array_elements(v_session.questions_json) WITH ORDINALITY AS q(value, idx)
        LEFT JOIN jsonb_each_text(COALESCE(v_session.answers_json, '{}'::jsonb)) AS a(key, value)
          ON a.key::int = (q.idx - 1)
    ),
    scored AS (
        SELECT
            qa.q_index,
            qa.category,
            qa.user_opt,
            COALESCE((
                SELECT (o->>'score')::int
                FROM jsonb_array_elements(qa.options) AS o
                WHERE o->>'id' = qa.user_opt
            ), 0) AS score,
            CASE
              WHEN qa.user_opt IS NULL THEN false
              WHEN qa.category = 'TKP' THEN COALESCE((
                  SELECT (o->>'score')::int
                  FROM jsonb_array_elements(qa.options) AS o
                  WHERE o->>'id' = qa.user_opt
              ), 0) >= 5
              ELSE qa.user_opt = qa.correct_opt
            END AS is_best
        FROM qa
    )
    SELECT
        COALESCE(SUM(score), 0),
        COALESCE(SUM(CASE WHEN category = 'TWK' THEN score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'TIU' THEN score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'TKP' THEN score ELSE 0 END), 0),
        COUNT(CASE WHEN category = 'TWK' THEN 1 END),
        COUNT(CASE WHEN category = 'TIU' THEN 1 END),
        COUNT(CASE WHEN category = 'TKP' THEN 1 END),
        COUNT(CASE WHEN user_opt IS NOT NULL AND category = 'TWK' THEN 1 END),
        COUNT(CASE WHEN user_opt IS NOT NULL AND category = 'TIU' THEN 1 END),
        COUNT(CASE WHEN user_opt IS NOT NULL THEN 1 END)
    INTO v_score, v_twk_score, v_tiu_score, v_tkp_score,
         v_twk_count, v_tiu_count, v_tkp_count,
         v_twk_answered, v_tiu_answered, v_answers_count
    FROM scored;

    v_cur_combo := 0;
    v_max_combo := 0;
    FOR rec IN
        SELECT is_best
        FROM (
            SELECT
                CASE
                  WHEN a.value IS NULL THEN false
                  WHEN (q.value->>'category') = 'TKP' THEN COALESCE((
                      SELECT (o->>'score')::int
                      FROM jsonb_array_elements(q.value->'options') AS o
                      WHERE o->>'id' = a.value
                  ), 0) >= 5
                  ELSE a.value = (q.value->>'correct')
                END AS is_best
            FROM jsonb_array_elements(v_session.questions_json) WITH ORDINALITY AS q(value, idx)
            LEFT JOIN jsonb_each_text(COALESCE(v_session.answers_json, '{}'::jsonb)) AS a(key, value)
              ON a.key::int = (q.idx - 1)
            ORDER BY q.idx
        ) s
    LOOP
        IF rec.is_best THEN
            v_cur_combo := v_cur_combo + 1;
            IF v_cur_combo > v_max_combo THEN v_max_combo := v_cur_combo; END IF;
        ELSE
            v_cur_combo := 0;
        END IF;
    END LOOP;

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
    SET status = 'completed', completed_at = NOW(),
        score = v_score, twk_score = v_twk_score, tiu_score = v_tiu_score, tkp_score = v_tkp_score
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

    SELECT COALESCE(quests_progress, '{}'::jsonb) INTO v_progress
    FROM public.profiles WHERE id = v_user_id FOR UPDATE;

    v_q1 := COALESCE((v_progress->>'1')::int, 0);
    v_q2 := COALESCE((v_progress->>'2')::int, 0);
    v_q3 := COALESCE((v_progress->>'3')::int, 0);
    v_q4 := COALESCE((v_progress->>'4')::int, 0);
    v_q5 := COALESCE((v_progress->>'5')::int, 0);

    IF v_q1 < 999 THEN
        v_q1 := LEAST(10, v_q1 + v_twk_answered);
    END IF;
    IF v_q2 < 999 THEN
        v_q2 := GREATEST(v_q2, LEAST(5, v_max_combo));
    END IF;
    IF v_q3 < 999 AND v_session.mode = 'latihan' AND v_tiu_answered > 0 THEN
        v_q3 := 1;
    END IF;
    IF v_q4 < 999 THEN
        v_q4 := LEAST(10, v_q4 + 1);
    END IF;
    IF v_q5 < 999 AND v_session.mode = 'survival' THEN
        v_q5 := LEAST(30, v_q5 + v_answers_count);
    END IF;

    v_progress := jsonb_build_object(
        '1', v_q1,
        '2', v_q2,
        '3', v_q3,
        '4', v_q4,
        '5', v_q5
    );

    UPDATE public.profiles
    SET coins = COALESCE(coins, 0) + v_coins_earned,
        score = COALESCE(score, 0) + v_xp_earned,
        total_quizzes_completed = COALESCE(total_quizzes_completed, 0) + 1,
        quests_progress = v_progress
    WHERE id = v_user_id;

    RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_quiz_session(UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_quiz_session(UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- ############################################################
-- 3) claim_quest
-- ############################################################
CREATE OR REPLACE FUNCTION public.claim_quest(
    p_quest_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_reward INTEGER;
    v_required_total INTEGER;
    v_progress_val INTEGER;
    v_new_coins INTEGER;
    v_progress JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    SELECT reward, total INTO v_reward, v_required_total
    FROM (VALUES
        (1, 100, 10),
        (2, 50, 5),
        (3, 150, 1),
        (4, 500, 10),
        (5, 300, 30)
    ) AS quests(id, reward, total)
    WHERE id = p_quest_id;

    IF v_reward IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'unknown_quest');
    END IF;

    SELECT id, coins, quests_progress, quests_claimed
    INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
    END IF;

    IF v_profile.quests_claimed IS NOT NULL AND v_profile.quests_claimed @> ARRAY[p_quest_id] THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_claimed');
    END IF;

    v_progress_val := COALESCE((v_profile.quests_progress ->> p_quest_id::TEXT)::INTEGER, 0);
    IF v_progress_val = 999 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_claimed');
    END IF;

    IF v_progress_val < v_required_total THEN
        RETURN jsonb_build_object('success', false, 'reason', 'progress_insufficient');
    END IF;

    v_new_coins := COALESCE(v_profile.coins, 0) + v_reward;
    v_progress := COALESCE(v_profile.quests_progress, '{}'::jsonb);
    v_progress := jsonb_set(v_progress, ARRAY[p_quest_id::TEXT], to_jsonb(999));

    UPDATE public.profiles
    SET coins = v_new_coins,
        quests_claimed = array_append(COALESCE(quests_claimed, '{}'), p_quest_id),
        quests_progress = v_progress
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'coins_earned', v_reward,
        'coins_after', v_new_coins
    );
END; $$;

REVOKE EXECUTE ON FUNCTION public.claim_quest(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_quest(INTEGER) TO authenticated;

-- ############################################################
-- 4) reset_daily_quests (baru)
-- ############################################################
CREATE OR REPLACE FUNCTION public.reset_daily_quests()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_today TEXT := to_char((now() AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD');
    v_last TEXT;
    v_progress JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    SELECT id, quests_progress, last_login
    INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
    END IF;

    IF v_profile.last_login IS NULL OR btrim(v_profile.last_login::text) = '' THEN
        v_last := NULL;
    ELSIF v_profile.last_login::text ~ '^\d{4}-\d{2}-\d{2}' THEN
        v_last := left(v_profile.last_login::text, 10);
    ELSE
        BEGIN
            v_last := to_char(v_profile.last_login::timestamptz AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD');
        EXCEPTION WHEN OTHERS THEN
            v_last := NULL;
        END;
    END IF;

    IF v_last IS NOT NULL AND v_last = v_today THEN
        RETURN jsonb_build_object(
            'success', true,
            'reset', false,
            'quests_progress', COALESCE(v_profile.quests_progress, '{}'::jsonb)
        );
    END IF;

    v_progress := COALESCE(v_profile.quests_progress, '{}'::jsonb);
    v_progress := v_progress - '1' - '2' - '3';
    v_progress := jsonb_set(v_progress, '{1}', '0'::jsonb, true);
    v_progress := jsonb_set(v_progress, '{2}', '0'::jsonb, true);
    v_progress := jsonb_set(v_progress, '{3}', '0'::jsonb, true);

    UPDATE public.profiles
    SET quests_progress = v_progress,
        last_login = v_today,
        quests_claimed = array_remove(array_remove(array_remove(COALESCE(quests_claimed, '{}'), 1), 2), 3)
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'reset', true,
        'quests_progress', v_progress
    );
END; $$;

REVOKE EXECUTE ON FUNCTION public.reset_daily_quests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_daily_quests() TO authenticated;

-- Verifikasi
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'consume_powerup','complete_quiz_session','claim_quest','reset_daily_quests'
  )
ORDER BY 1, 2;
