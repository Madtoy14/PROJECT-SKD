-- RPC: consume_powerup — atomic power-up consumption + log used_powerups
-- Parameter: p_session_id (validasi ownership + status), p_item_id
-- Return: { success, item_remaining, item_id?, reason? }
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

    -- Validasi session milik user dan masih active/paused
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

    -- Lock profil & cek stok
    SELECT id, inventory INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    v_inv_val := COALESCE((v_profile.inventory ->> p_item_id)::INTEGER, 0);
    IF v_inv_val <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'item_not_available');
    END IF;

    -- Decrement atomik
    v_new_qty := v_inv_val - 1;
    UPDATE public.profiles
    SET inventory = jsonb_set(
        COALESCE(inventory, '{}'::jsonb),
        ARRAY[p_item_id],
        to_jsonb(v_new_qty)
    )
    WHERE id = v_user_id;

    -- Catat pemakaian di session (audit / anti-cheat skor ganda)
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
