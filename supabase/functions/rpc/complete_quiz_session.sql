-- RPC: complete_quiz_session — server scoring + quest progress
-- Signature (JANGAN diubah tanpa migrasi client):
--   complete_quiz_session(p_session_id uuid, p_coins_earned int default 0,
--     p_xp_earned int default 0, p_passed_twk bool, p_passed_tiu bool,
--     p_passed_tkp bool, p_passed_overall bool) RETURNS uuid
-- Catatan: p_coins_earned / p_xp_earned / passed flags diabaikan (server authority).
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
    -- Autentikasi dan lock session
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

    -- Hitung skor server-side + metrik quest
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

    -- Combo max (urutan soal)
    v_cur_combo := 0;
    v_max_combo := 0;
    FOR rec IN
        SELECT is_best
        FROM (
            SELECT
                (q.idx - 1)::int AS q_index,
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

    -- Reward server-side (parameter client p_coins_earned / p_xp_earned / passed* diabaikan)
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

    -- Quest progress (server-side, never decrease claimed=999)
    SELECT COALESCE(quests_progress, '{}'::jsonb) INTO v_progress
    FROM public.profiles WHERE id = v_user_id FOR UPDATE;

    v_q1 := COALESCE((v_progress->>'1')::int, 0);
    v_q2 := COALESCE((v_progress->>'2')::int, 0);
    v_q3 := COALESCE((v_progress->>'3')::int, 0);
    v_q4 := COALESCE((v_progress->>'4')::int, 0);
    v_q5 := COALESCE((v_progress->>'5')::int, 0);

    -- 1: Jawab 10 Soal TWK
    IF v_q1 < 999 THEN
        v_q1 := LEAST(10, v_q1 + v_twk_answered);
    END IF;
    -- 2: Combo 5x (ambil max combo run)
    IF v_q2 < 999 THEN
        v_q2 := GREATEST(v_q2, LEAST(5, v_max_combo));
    END IF;
    -- 3: Selesaikan Latihan TIU (1x)
    IF v_q3 < 999 AND v_session.mode = 'latihan' AND v_tiu_answered > 0 THEN
        v_q3 := 1;
    END IF;
    -- 4: Selesaikan 10 Kuis
    IF v_q4 < 999 THEN
        v_q4 := LEAST(10, v_q4 + 1);
    END IF;
    -- 5: Survival 30 soal
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
