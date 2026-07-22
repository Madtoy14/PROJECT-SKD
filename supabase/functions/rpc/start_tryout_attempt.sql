-- RPC: start_tryout_attempt — potong entry fee tryout server-side
-- Signature: start_tryout_attempt(p_package_id text default null, p_tier text default 'standar')
-- Return: { success, coins_after, cost, package_id, reason? }
-- Catalog:
--   standar = 1000 koin
--   akbar   = 1500 koin
CREATE OR REPLACE FUNCTION public.start_tryout_attempt(
    p_package_id TEXT DEFAULT NULL,
    p_tier TEXT DEFAULT 'standar'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_coins INTEGER;
    v_cost INTEGER;
    v_tier TEXT := lower(coalesce(nullif(trim(p_tier), ''), 'standar'));
    v_new_coins INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    IF v_tier = 'akbar' THEN
        v_cost := 1500;
    ELSE
        v_cost := 1000; -- standar
        v_tier := 'standar';
    END IF;

    SELECT coins INTO v_coins
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
    END IF;

    IF coalesce(v_coins, 0) < v_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'insufficient_coins',
            'coins', coalesce(v_coins, 0),
            'cost', v_cost
        );
    END IF;

    v_new_coins := v_coins - v_cost;

    UPDATE public.profiles
    SET coins = v_new_coins
    WHERE id = v_user_id;

    -- Audit trail (best-effort; ignore if table/policy issues)
    BEGIN
        INSERT INTO public.transactions (
            user_id, type, category, amount, balance_after, source, metadata
        ) VALUES (
            v_user_id, 'spend', 'coin', -v_cost, v_new_coins, 'tryout_entry',
            jsonb_build_object(
                'package_id', p_package_id,
                'tier', v_tier,
                'cost', v_cost
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL; -- jangan gagalkan attempt karena log
    END;

    RETURN jsonb_build_object(
        'success', true,
        'coins_after', v_new_coins,
        'cost', v_cost,
        'tier', v_tier,
        'package_id', p_package_id
    );
END; $$;

REVOKE ALL ON FUNCTION public.start_tryout_attempt(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_tryout_attempt(TEXT, TEXT) TO authenticated;
