-- RPC: increment_wrong_mastery — +1 mastery untuk soal di catatan_salah
-- Signature: increment_wrong_mastery(p_question_id text)
-- Return: { success, mastery?, reason? }
CREATE OR REPLACE FUNCTION public.increment_wrong_mastery(
    p_question_id TEXT
)
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
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    IF p_question_id IS NULL OR length(trim(p_question_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_question');
    END IF;

    SELECT COALESCE(catatan_salah, '[]'::jsonb)
      INTO v_catatan
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
    END IF;

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
                v_found := true;
                v_mastery := 1;
                v_arr := v_arr || jsonb_build_array(jsonb_build_object(
                    'id', p_question_id,
                    'type', '',
                    'mastery', v_mastery
                ));
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

    IF NOT v_found THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_in_list');
    END IF;

    UPDATE public.profiles
    SET catatan_salah = v_arr
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'mastery', v_mastery);
END; $$;

REVOKE ALL ON FUNCTION public.increment_wrong_mastery(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_wrong_mastery(TEXT) TO authenticated;
