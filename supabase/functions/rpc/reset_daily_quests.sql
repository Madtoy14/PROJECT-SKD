-- RPC: reset_daily_quests — reset misi harian (id 1-3) sekali per hari Asia/Jakarta
-- Return: { success, reset, quests_progress, reason? }
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

    -- Normalisasi last_login ke YYYY-MM-DD (dukung legacy Date.toDateString)
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
    -- Reset daily quests 1-3 only; weekly 4-5 tetap
    v_progress := v_progress - '1' - '2' - '3';
    v_progress := jsonb_set(v_progress, '{1}', '0'::jsonb, true);
    v_progress := jsonb_set(v_progress, '{2}', '0'::jsonb, true);
    v_progress := jsonb_set(v_progress, '{3}', '0'::jsonb, true);

    -- last_login disimpan YYYY-MM-DD Asia/Jakarta (text-compatible)
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
