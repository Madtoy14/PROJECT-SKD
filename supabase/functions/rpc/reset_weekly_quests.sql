-- RPC: reset_weekly_quests — reset misi mingguan (id 4-5) sekali per minggu Asia/Jakarta
-- Return: { success, reset, quests_progress, reason? }
CREATE OR REPLACE FUNCTION public.reset_weekly_quests()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_now TIMESTAMPTZ := now() AT TIME ZONE 'Asia/Jakarta';
    v_start_of_week TEXT;
    v_last TEXT;
    v_progress JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    SELECT id, quests_progress, metadata
    INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
    END IF;

    -- Start of week = Senin 00:00 minggu ini (ISO week start = Monday)
    v_start_of_week := to_char(
        date_trunc('week', v_now::date),
        'YYYY-MM-DD'
    );

    -- Ambil last_weekly_reset dari metadata
    v_last := v_profile.metadata->>'last_weekly_reset';

    IF v_last IS NOT NULL AND v_last >= v_start_of_week THEN
        -- Already reset this week
        RETURN jsonb_build_object(
            'success', true,
            'reset', false,
            'quests_progress', COALESCE(v_profile.quests_progress, '{}'::jsonb)
        );
    END IF;

    v_progress := COALESCE(v_profile.quests_progress, '{}'::jsonb);
    -- Reset weekly quests 4-5 only; daily 1-3 tetap
    v_progress := v_progress - '4' - '5';
    v_progress := jsonb_set(v_progress, '{4}', '0'::jsonb, true);
    v_progress := jsonb_set(v_progress, '{5}', '0'::jsonb, true);

    -- Update metadata with last_weekly_reset
    UPDATE public.profiles
    SET quests_progress = v_progress,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('last_weekly_reset', v_start_of_week)
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'reset', true,
        'quests_progress', v_progress
    );
END; $$;

REVOKE EXECUTE ON FUNCTION public.reset_weekly_quests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_weekly_quests() TO authenticated;
