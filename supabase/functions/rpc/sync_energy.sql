-- RPC: sync_energy — regen energy server-side (1 per 150s, cap 25)
-- Return: { success, energy, seconds_to_next, recovered }
CREATE OR REPLACE FUNCTION public.sync_energy()
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
    v_seconds_to_next INTEGER;
    v_max INTEGER := 25;
    v_interval INTEGER := 150;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
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
    v_recovered := 0;
    v_seconds_to_next := 0;

    IF v_energy >= v_max THEN
        v_energy := v_max;
        UPDATE public.profiles
        SET energy = v_energy,
            last_energy_update = v_now
        WHERE id = v_user_id;
        RETURN jsonb_build_object(
            'success', true,
            'energy', v_energy,
            'seconds_to_next', 0,
            'recovered', 0
        );
    END IF;

    IF v_last IS NULL THEN
        v_last := v_now;
    END IF;

    v_elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_last)))::INTEGER);
    v_recovered := FLOOR(v_elapsed / v_interval)::INTEGER;
    v_remainder := v_elapsed % v_interval;

    IF v_recovered > 0 THEN
        v_energy := LEAST(v_max, v_energy + v_recovered);
        -- Geser last_energy_update ke sisa interval (atau now jika full)
        IF v_energy >= v_max THEN
            v_last := v_now;
            v_seconds_to_next := 0;
        ELSE
            v_last := v_now - (v_remainder || ' seconds')::INTERVAL;
            v_seconds_to_next := v_interval - v_remainder;
        END IF;
    ELSE
        v_seconds_to_next := v_interval - v_elapsed;
        IF v_seconds_to_next < 0 THEN v_seconds_to_next := 0; END IF;
    END IF;

    UPDATE public.profiles
    SET energy = v_energy,
        last_energy_update = v_last
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'energy', v_energy,
        'seconds_to_next', v_seconds_to_next,
        'recovered', v_recovered
    );
END; $$;

REVOKE ALL ON FUNCTION public.sync_energy() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_energy() TO authenticated;
