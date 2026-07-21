-- RPC: consume_energy — atomic energy deduction, auth.uid() based
-- Parameter: p_amount
-- Return: { success, energy_after }
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
    v_energy_after INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    IF p_amount <= 0 OR p_amount > 100 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_amount');
    END IF;

    UPDATE public.profiles
    SET energy = energy - p_amount,
        last_energy_update = NOW()
    WHERE id = v_user_id
      AND energy >= p_amount
    RETURNING energy INTO v_energy_after;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_energy');
    END IF;

    RETURN jsonb_build_object('success', true, 'energy_after', v_energy_after);
END; $$;

REVOKE EXECUTE ON FUNCTION public.consume_energy(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_energy(INTEGER) TO authenticated;
