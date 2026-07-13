-- ============================================
-- SKDQUEST ATTEMPT INTEGRITY MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Tambahkan kolom package_id dan package_version ke quiz_sessions
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS package_id TEXT;
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS package_version INTEGER DEFAULT 1;

-- 2. Tambahkan kolom package_id dan package_version ke quiz_results
ALTER TABLE public.quiz_results ADD COLUMN IF NOT EXISTS package_id TEXT;
ALTER TABLE public.quiz_results ADD COLUMN IF NOT EXISTS package_version INTEGER DEFAULT 1;

-- 3. Tambahkan constraint UNIQUE pada session_id di quiz_results untuk mencegah double reward
ALTER TABLE public.quiz_results DROP CONSTRAINT IF EXISTS quiz_results_session_id_key;
ALTER TABLE public.quiz_results ADD CONSTRAINT quiz_results_session_id_key UNIQUE (session_id);

-- 4. Buat RPC idempotent untuk menyelesaikan quiz
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
BEGIN
    -- Ambil session dan kunci baris untuk update (mencegah race condition)
    SELECT * INTO v_session
    FROM public.quiz_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    -- Pastikan session hanya bisa di-complete jika masih active atau paused
    IF v_session.status = 'completed' THEN
        -- Jika sudah completed, mungkin ini double klik. Return result id yang sudah ada.
        SELECT id INTO v_result_id FROM public.quiz_results WHERE session_id = p_session_id LIMIT 1;
        IF FOUND THEN
            RETURN v_result_id;
        END IF;
    END IF;

    v_user_id := v_session.user_id;

    -- Update session status
    UPDATE public.quiz_sessions
    SET status = 'completed',
        completed_at = NOW(),
        score = p_score,
        twk_score = p_twk_score,
        tiu_score = p_tiu_score,
        tkp_score = p_tkp_score
    WHERE id = p_session_id;

    -- Insert ke quiz_results menggunakan snapshot dari session
    INSERT INTO public.quiz_results (
        user_id,
        session_id,
        mode,
        package_id,
        package_version,
        score,
        twk_score,
        tiu_score,
        tkp_score,
        accuracy,
        time_spent_seconds,
        coins_earned,
        xp_earned,
        questions_json,
        answers_json,
        powerups_used,
        passed_twk,
        passed_tiu,
        passed_tkp,
        passed_overall,
        completed_at
    ) VALUES (
        v_user_id,
        p_session_id,
        v_session.mode,
        v_session.package_id,
        v_session.package_version,
        p_score,
        p_twk_score,
        p_tiu_score,
        p_tkp_score,
        p_accuracy,
        v_session.time_spent_seconds,
        p_coins_earned,
        p_xp_earned,
        v_session.questions_json,
        v_session.answers_json,
        v_session.used_powerups,
        p_passed_twk,
        p_passed_tiu,
        p_passed_tkp,
        p_passed_overall,
        NOW()
    ) RETURNING id INTO v_result_id;

    -- Update user profile (Reward)
    UPDATE public.profiles
    SET coins = coins + p_coins_earned,
        score = score + p_xp_earned
    WHERE id = v_user_id;

    RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
