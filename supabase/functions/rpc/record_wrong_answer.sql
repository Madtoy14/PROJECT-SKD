-- RPC: record_wrong_answer — catat soal salah ke profiles.catatan_salah (server)
-- Signature: record_wrong_answer(p_question_id text, p_quiz_type text)
-- Return: { success, reason? }
CREATE OR REPLACE FUNCTION public.record_wrong_answer(
    p_question_id TEXT,
    p_quiz_type TEXT DEFAULT ''
)
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
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    IF p_question_id IS NULL OR length(trim(p_question_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_question');
    END IF;

    -- Hanya UUID (hindari id legacy non-uuid merusak query)
    IF p_question_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_question_id');
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
        v_catatan := '[]'::jsonb;
    END IF;

    v_arr := '[]'::jsonb;
    v_len := jsonb_array_length(v_catatan);

    FOR v_i IN 0..GREATEST(v_len - 1, -1) LOOP
        EXIT WHEN v_len = 0;
        v_item := v_catatan -> v_i;
        IF jsonb_typeof(v_item) = 'string' AND (v_item #>> '{}') = p_question_id THEN
            v_found := true;
            v_arr := v_arr || jsonb_build_array(jsonb_build_object(
                'id', p_question_id,
                'type', CASE WHEN v_type = '' THEN '' ELSE v_type END,
                'mastery', 0
            ));
        ELSIF jsonb_typeof(v_item) = 'object' AND (v_item ->> 'id') = p_question_id THEN
            v_found := true;
            v_arr := v_arr || jsonb_build_array(jsonb_build_object(
                'id', p_question_id,
                'type', CASE
                    WHEN v_type <> '' THEN v_type
                    ELSE COALESCE(v_item ->> 'type', '')
                END,
                'mastery', 0
            ));
        ELSE
            v_arr := v_arr || jsonb_build_array(v_item);
        END IF;
    END LOOP;

    IF NOT v_found THEN
        v_arr := v_arr || jsonb_build_array(jsonb_build_object(
            'id', p_question_id,
            'type', v_type,
            'mastery', 0
        ));
    END IF;

    UPDATE public.profiles
    SET catatan_salah = v_arr
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
END; $$;

REVOKE ALL ON FUNCTION public.record_wrong_answer(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_wrong_answer(TEXT, TEXT) TO authenticated;
