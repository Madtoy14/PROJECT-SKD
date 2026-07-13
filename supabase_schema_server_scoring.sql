-- ============================================
-- SKDQUEST SERVER-SIDE SCORING & RLS MIGRATION
-- ============================================

-- 1. Aktifkan RLS
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.quiz_sessions;
CREATE POLICY "Users can view own sessions" ON public.quiz_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.quiz_sessions;
CREATE POLICY "Users can insert own sessions" ON public.quiz_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own sessions" ON public.quiz_sessions;
CREATE POLICY "Users can update own sessions" ON public.quiz_sessions FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own results" ON public.quiz_results;
CREATE POLICY "Users can view own results" ON public.quiz_results FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own results" ON public.quiz_results;
CREATE POLICY "Users can insert own results" ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own results" ON public.quiz_results;
CREATE POLICY "Users can update own results" ON public.quiz_results FOR UPDATE USING (auth.uid() = user_id);

-- 2. Perbarui RPC complete_quiz_session
CREATE OR REPLACE FUNCTION complete_quiz_session(
    p_session_id UUID,
    p_score INTEGER,
    p_twk_score INTEGER,
    p_tiu_score INTEGER,
    p_tkp_score INTEGER,
    p_accuracy NUMERIC,
    p_coins_earned INTEGER,
    p_xp_earned INTEGER,
    p_passed_twk BOOLEAN,
    p_passed_tiu BOOLEAN,
    p_passed_tkp BOOLEAN,
    p_passed_overall BOOLEAN
)
RETURNS UUID AS $$
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
BEGIN
    SELECT * INTO v_session FROM public.quiz_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;

    IF v_session.status = 'completed' THEN
        SELECT id INTO v_result_id FROM public.quiz_results WHERE session_id = p_session_id LIMIT 1;
        IF FOUND THEN RETURN v_result_id; END IF;
    END IF;

    v_user_id := v_session.user_id;

    -- Hitung skor server-side
    WITH qa AS (
        SELECT 
            (q.value->>'category') AS category,
            q.value->>'correct' AS correct_opt,
            a.value AS user_opt,
            q.value->'options' AS options
        FROM jsonb_array_elements(v_session.questions_json) WITH ORDINALITY AS q(value, idx)
        LEFT JOIN jsonb_each_text(v_session.answers_json) AS a(key, value) ON a.key::int = (q.idx - 1)
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
        v_passed_twk := p_passed_twk;
        v_passed_tiu := p_passed_tiu;
        v_passed_tkp := p_passed_tkp;
        v_passed_overall := p_passed_overall;
    END IF;

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
        v_score, v_twk_score, v_tiu_score, v_tkp_score, p_accuracy,
        v_session.time_spent_seconds, p_coins_earned, p_xp_earned,
        v_session.questions_json, v_session.answers_json, v_session.used_powerups,
        v_passed_twk, v_passed_tiu, v_passed_tkp, v_passed_overall, NOW()
    ) RETURNING id INTO v_result_id;

    UPDATE public.profiles
    SET coins = coins + p_coins_earned, score = score + p_xp_earned
    WHERE id = v_user_id;

    RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
