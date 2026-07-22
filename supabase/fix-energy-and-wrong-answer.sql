-- ============================================================
-- Apply di Supabase SQL Editor (setelah backup ringan)
-- Energy polish: clamp + clock skew + seconds_to_next
-- + wrong-answer RPCs
-- ============================================================

-- RPC: sync_energy — regen energy server-side (1 per 150s, cap 25, floor 0)
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

    -- Clamp corrupt values
    v_energy := LEAST(v_max, GREATEST(0, COALESCE(v_energy, v_max)));
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

    -- Guard clock skew: last di masa depan → reset ke now
    IF v_last > v_now THEN
        v_last := v_now;
    END IF;

    v_elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_last)))::INTEGER);
    v_recovered := FLOOR(v_elapsed / v_interval)::INTEGER;
    v_remainder := v_elapsed % v_interval;

    IF v_recovered > 0 THEN
        v_energy := LEAST(v_max, v_energy + v_recovered);
        IF v_energy >= v_max THEN
            v_last := v_now;
            v_seconds_to_next := 0;
        ELSE
            v_last := v_now - (v_remainder || ' seconds')::INTERVAL;
            v_seconds_to_next := v_interval - v_remainder;
        END IF;
    ELSE
        v_seconds_to_next := GREATEST(0, v_interval - v_elapsed);
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


-- RPC: consume_energy — clamp + regen dulu, lalu potong atomik
-- Parameter: p_amount
-- Return: { success, energy_after, seconds_to_next?, reason? }
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
    v_seconds_to_next INTEGER := 0;
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

    v_energy := LEAST(v_max, GREATEST(0, COALESCE(v_energy, v_max)));

    -- Regen sebelum potong
    IF v_energy < v_max THEN
        IF v_last IS NULL OR v_last > v_now THEN
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
        IF v_energy < v_max THEN
            v_elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - COALESCE(v_last, v_now))))::INTEGER);
            v_seconds_to_next := GREATEST(0, v_interval - (v_elapsed % v_interval));
        END IF;
        UPDATE public.profiles
        SET energy = v_energy,
            last_energy_update = COALESCE(v_last, v_now)
        WHERE id = v_user_id;
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'insufficient_energy',
            'energy_after', v_energy,
            'seconds_to_next', v_seconds_to_next
        );
    END IF;

    v_energy_after := v_energy - p_amount;
    -- Setelah consume, timer mulai dari now (fair)
    UPDATE public.profiles
    SET energy = v_energy_after,
        last_energy_update = v_now
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'energy_after', v_energy_after,
        'seconds_to_next', CASE WHEN v_energy_after >= v_max THEN 0 ELSE v_interval END
    );
END; $$;

REVOKE EXECUTE ON FUNCTION public.consume_energy(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_energy(INTEGER) TO authenticated;


-- record_wrong_answer
CREATE OR REPLACE FUNCTION public.record_wrong_answer(p_question_id TEXT, p_quiz_type TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_catatan JSONB;
    v_arr JSONB;
    v_found BOOLEAN := false;
    v_item JSONB;
    v_i INTEGER;
    v_len INTEGER;
    v_type TEXT := upper(coalesce(nullif(trim(p_quiz_type), ''), ''));
BEGIN
    IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated'); END IF;
    IF p_question_id IS NULL OR length(trim(p_question_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_question');
    END IF;
    IF p_question_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_question_id');
    END IF;

    SELECT COALESCE(catatan_salah, '[]'::jsonb) INTO v_catatan
    FROM public.profiles WHERE id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found'); END IF;
    IF jsonb_typeof(v_catatan) IS DISTINCT FROM 'array' THEN v_catatan := '[]'::jsonb; END IF;

    v_arr := '[]'::jsonb;
    v_len := jsonb_array_length(v_catatan);
    FOR v_i IN 0..GREATEST(v_len - 1, -1) LOOP
        EXIT WHEN v_len = 0;
        v_item := v_catatan -> v_i;
        IF jsonb_typeof(v_item) = 'string' AND (v_item #>> '{}') = p_question_id THEN
            v_found := true;
            v_arr := v_arr || jsonb_build_array(jsonb_build_object('id', p_question_id, 'type', v_type, 'mastery', 0));
        ELSIF jsonb_typeof(v_item) = 'object' AND (v_item ->> 'id') = p_question_id THEN
            v_found := true;
            v_arr := v_arr || jsonb_build_array(jsonb_build_object(
                'id', p_question_id,
                'type', CASE WHEN v_type <> '' THEN v_type ELSE COALESCE(v_item ->> 'type', '') END,
                'mastery', 0
            ));
        ELSE
            v_arr := v_arr || jsonb_build_array(v_item);
        END IF;
    END LOOP;
    IF NOT v_found THEN
        v_arr := v_arr || jsonb_build_array(jsonb_build_object('id', p_question_id, 'type', v_type, 'mastery', 0));
    END IF;

    UPDATE public.profiles SET catatan_salah = v_arr WHERE id = v_user_id;
    RETURN jsonb_build_object('success', true);
END; $$;

REVOKE ALL ON FUNCTION public.record_wrong_answer(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_wrong_answer(TEXT, TEXT) TO authenticated;

-- increment_wrong_mastery
CREATE OR REPLACE FUNCTION public.increment_wrong_mastery(p_question_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_catatan JSONB;
    v_arr JSONB := '[]'::jsonb;
    v_item JSONB;
    v_i INTEGER;
    v_len INTEGER;
    v_found BOOLEAN := false;
    v_mastery INTEGER := 0;
    v_id TEXT;
BEGIN
    IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated'); END IF;
    IF p_question_id IS NULL OR length(trim(p_question_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_question');
    END IF;

    SELECT COALESCE(catatan_salah, '[]'::jsonb) INTO v_catatan
    FROM public.profiles WHERE id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found'); END IF;
    IF jsonb_typeof(v_catatan) IS DISTINCT FROM 'array' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'empty');
    END IF;

    v_len := jsonb_array_length(v_catatan);
    FOR v_i IN 0..GREATEST(v_len - 1, -1) LOOP
        EXIT WHEN v_len = 0;
        v_item := v_catatan -> v_i;
        IF jsonb_typeof(v_item) = 'string' THEN
            v_id := v_item #>> '{}';
            IF v_id = p_question_id THEN
                v_found := true; v_mastery := 1;
                v_arr := v_arr || jsonb_build_array(jsonb_build_object('id', p_question_id, 'type', '', 'mastery', 1));
            ELSE
                v_arr := v_arr || jsonb_build_array(v_item);
            END IF;
        ELSIF jsonb_typeof(v_item) = 'object' AND (v_item ->> 'id') = p_question_id THEN
            v_found := true;
            v_mastery := LEAST(99, COALESCE((v_item ->> 'mastery')::INTEGER, 0) + 1);
            v_arr := v_arr || jsonb_build_array(jsonb_build_object(
                'id', p_question_id,
                'type', COALESCE(v_item ->> 'type', ''),
                'mastery', v_mastery
            ));
        ELSE
            v_arr := v_arr || jsonb_build_array(v_item);
        END IF;
    END LOOP;

    IF NOT v_found THEN RETURN jsonb_build_object('success', false, 'reason', 'not_in_list'); END IF;
    UPDATE public.profiles SET catatan_salah = v_arr WHERE id = v_user_id;
    RETURN jsonb_build_object('success', true, 'mastery', v_mastery);
END; $$;

REVOKE ALL ON FUNCTION public.increment_wrong_mastery(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_wrong_mastery(TEXT) TO authenticated;



SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('sync_energy','consume_energy','record_wrong_answer','increment_wrong_mastery')
ORDER BY 1, 2;
