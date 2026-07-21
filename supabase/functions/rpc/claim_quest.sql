-- RPC: claim_quest — atomic quest claim with progress validation
-- Parameter: p_quest_id (quest metadata can be hardcoded or from config table)
-- Return: { success, coins_earned, coins_after }
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
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    -- Ambil reward dan target dari quest metadata (hardcoded sesuai DAILY_QUESTS_METADATA & WEEKLY_QUESTS_METADATA di Quest.tsx)
    SELECT reward, total INTO v_reward, v_required_total
    FROM (VALUES
        (1, 100, 10),   -- Jawab 10 Soal TWK
        (2, 50, 5),     -- Combo 5x
        (3, 150, 1),    -- Selesaikan Latihan TIU
        (4, 500, 10),   -- 10 Kuis
        (5, 300, 30)    -- Survival 30 Soal
    ) AS quests(id, reward, total)
    WHERE id = p_quest_id;

    IF v_reward IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'unknown_quest');
    END IF;

    -- Lock profil
    SELECT id, coins, quests_progress, quests_claimed
    INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
    END IF;

    -- Cek sudah claimed
    IF v_profile.quests_claimed @> ARRAY[p_quest_id] THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_claimed');
    END IF;

    -- Validasi progress cukup
    IF COALESCE((v_profile.quests_progress ->> p_quest_id::TEXT)::INTEGER, 0) < v_required_total THEN
        RETURN jsonb_build_object('success', false, 'reason', 'progress_insufficient');
    END IF;

    -- Mark claimed & tambah koin atomik
    UPDATE public.profiles
    SET coins = COALESCE(coins, 0) + v_reward,
        quests_claimed = array_append(COALESCE(quests_claimed, '{}'), p_quest_id)
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'coins_earned', v_reward
    );
END; $$;

REVOKE EXECUTE ON FUNCTION public.claim_quest(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_quest(INTEGER) TO authenticated;
