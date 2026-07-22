-- RPC: consume_energy — regen dulu (server), lalu potong atomik
-- Parameter: p_amount
-- Return: { success, energy_after, reason? }
CREATE OR REPLACE FUNCTION public.consume_energy(
    p_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_energy INTEGER;
    v_last TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
    v_elapsed INTEGER;
    v_recovered INTEGER;
    v_remainder INTEGER;
    v_max INTEGER := 25;
    v_interval INTEGER := 150;
    v_energy_after INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    IF p_amount <= 0 OR p_amount > 100 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_amount');
    END IF;

    SELECT energy, last_energy_update
      INTO v_energy, v_last
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
    END IF;

    v_energy := COALESCE(v_energy, v_max);

    -- Regen sebelum potong
    IF v_energy < v_max THEN
        IF v_last IS NULL THEN
            v_last := v_now;
        END IF;
        v_elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_last)))::INTEGER);
        v_recovered := FLOOR(v_elapsed / v_interval)::INTEGER;
        v_remainder := v_elapsed % v_interval;
        IF v_recovered > 0 THEN
            v_energy := LEAST(v_max, v_energy + v_recovered);
            IF v_energy >= v_max THEN
                v_last := v_now;
            ELSE
                v_last := v_now - (v_remainder || ' seconds')::INTERVAL;
            END IF;
        END IF;
    ELSE
        v_last := v_now;
    END IF;

    IF v_energy < p_amount THEN
        UPDATE public.profiles
        SET energy = v_energy,
            last_energy_update = v_last
        WHERE id = v_user_id;
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'insufficient_energy',
            'energy_after', v_energy
        );
    END IF;

    v_energy_after := v_energy - p_amount;

    UPDATE public.profiles
    SET energy = v_energy_after,
        last_energy_update = v_now
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'energy_after', v_energy_after);
END; $$;

REVOKE EXECUTE ON FUNCTION public.consume_energy(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_energy(INTEGER) TO authenticated;
