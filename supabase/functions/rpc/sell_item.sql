-- ============================================================
-- RPC: sell_item — atomic, server-authoritative sell price
-- Parameter dari client: p_item_id (harga dari katalog server)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sell_item(
    p_item_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id    UUID;
    v_profile    RECORD;
    v_cost       INTEGER;
    v_reward     INTEGER;
    v_new_coins  INTEGER;
    v_inv_val    INTEGER;
    v_new_qty    INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Tidak terautentikasi');
    END IF;

    -- Ambil harga jual dari katalog (50% dari harga beli)
    SELECT FLOOR(cost * 0.5)::INTEGER INTO v_reward
    FROM (VALUES
        ('item_5050',             300),
        ('item_hint',             250),
        ('item_waktu_beku',       300),
        ('item_skor_ganda',       400),
        ('item_terawangan',       350),
        ('item_kesempatan_kedua', 500),
        ('item_energy_refill',    200),
        ('item_streak_protector', 150),
        ('item_tinta_hitam',      250),
        ('item_lompatan_kilat',   300)
    ) AS katalog(id, cost)
    WHERE id = p_item_id;

    IF v_reward IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Item tidak dikenal atau tidak bisa dijual');
    END IF;

    -- Lock profil
    SELECT id, coins, inventory
    INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Profil tidak ditemukan');
    END IF;

    -- Cek stok
    v_inv_val := COALESCE((v_profile.inventory ->> p_item_id)::INTEGER, 0);
    IF v_inv_val <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Item tidak cukup di inventori');
    END IF;

    v_new_coins := v_profile.coins + v_reward;
    v_new_qty   := v_inv_val - 1;

    -- Update
    UPDATE public.profiles
    SET coins     = v_new_coins,
        inventory = jsonb_set(
            COALESCE(inventory, '{}'::jsonb),
            ARRAY[p_item_id],
            to_jsonb(v_new_qty)
        )
    WHERE id = v_user_id;

    -- Catat transaksi
    INSERT INTO public.transactions (user_id, type, item_id, amount, details)
    VALUES (v_user_id, 'sell', p_item_id, v_reward,
            jsonb_build_object('old_qty', v_inv_val, 'new_qty', v_new_qty));

    RETURN jsonb_build_object(
        'success', true,
        'coins_after', v_new_coins,
        'coins_earned', v_reward,
        'new_qty', v_new_qty
    );
END; $$;

REVOKE EXECUTE ON FUNCTION public.sell_item(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sell_item(TEXT) TO authenticated;
