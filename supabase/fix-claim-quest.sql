-- ============================================================
-- Apply di Supabase SQL Editor (opsional, jika claim quest error)
-- claim_quest pakai sentinel 999 di quests_progress (tanpa wajib quests_claimed)
-- ============================================================

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

    SELECT id, coins, quests_progress
    INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
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
NOTIFY pgrst, 'reload schema';

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'claim_quest';
