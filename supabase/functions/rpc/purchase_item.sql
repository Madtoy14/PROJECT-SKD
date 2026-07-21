-- ============================================================
-- RPC: purchase_item — atomic, harga server-authoritative
-- Parameter dari client: p_item_id, p_quantity (default 1)
-- Harga, tipe, dan validasi dari katalog server-side
-- ============================================================
CREATE OR REPLACE FUNCTION public.purchase_item(
    p_item_id   TEXT,
    p_quantity  INTEGER DEFAULT 1
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
    v_item_type  TEXT;
    v_inv_key    TEXT;
    v_inv_val    INTEGER;
    v_new_coins  INTEGER;
    v_coins_now  INTEGER;
BEGIN
    -- Autentikasi
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Tidak terautentikasi');
    END IF;

    -- Ambil harga dan tipe dari katalog server
    SELECT cost, item_type INTO v_cost, v_item_type
    FROM (VALUES
        -- Power-ups (inventory)
        ('item_5050',              300, 'inventory'),
        ('item_hint',              250, 'inventory'),
        ('item_waktu_beku',        300, 'inventory'),
        ('item_skor_ganda',        400, 'inventory'),
        ('item_terawangan',        350, 'inventory'),
        ('item_kesempatan_kedua',  500, 'inventory'),
        ('item_energy_refill',     200, 'inventory'),
        ('item_streak_protector',  150, 'inventory'),
        ('item_tinta_hitam',       250, 'inventory'),
        ('item_lompatan_kilat',    300, 'inventory'),
        -- Avatar (karakter)
        ('ipdn_male',             500, 'avatar'),
        ('perhubungan_male',      500, 'avatar'),
        ('kemenkeu_male',         500, 'avatar'),
        ('bkn_male',              500, 'avatar'),
        ('polor_male',            500, 'avatar'),
        ('stis_female',           500, 'avatar'),
        ('stmkg_female',          500, 'avatar'),
        ('ipdn_female',           500, 'avatar'),
        ('perhubungan_female',    500, 'avatar'),
        ('stan_female',           500, 'avatar'),
        -- Premium packages
        ('paket_premium_basic',  2000, 'premium_package'),
        ('paket_premium_pro',    5000, 'premium_package'),
        ('paket_premium_ultra', 10000, 'premium_package'),
        -- Energy (special: 5 energy per unit)
        ('energy',                200, 'energy')
    ) AS katalog(id, cost, item_type)
    WHERE id = p_item_id;

    IF v_cost IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Item tidak dikenal');
    END IF;

    -- Validasi quantity
    IF p_quantity < 1 OR p_quantity > 99 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Kuantitas tidak valid');
    END IF;

    -- Hitung total biaya (khusus energy: 200/5 energy)
    IF v_item_type = 'energy' THEN
        v_cost := v_cost * p_quantity;
    ELSE
        v_cost := v_cost * p_quantity;
    END IF;

    -- Lock profil
    SELECT id, coins, inventory, unlocked_avatars, purchased_packages
    INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Profil tidak ditemukan');
    END IF;

    v_coins_now := COALESCE(v_profile.coins, 0);
    v_new_coins := v_coins_now - v_cost;

    -- Cek saldo
    IF v_new_coins < 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'Koin tidak cukup (dimiliki: ' || v_coins_now || ', dibutuhkan: ' || v_cost || ')'
        );
    END IF;

    -- Cek kepemilikan (idempotency guard)
    IF v_item_type = 'avatar' AND v_profile.unlocked_avatars @> ARRAY[p_item_id] THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Avatar sudah dimiliki');
    END IF;
    IF v_item_type = 'premium_package' AND v_profile.purchased_packages @> ARRAY[p_item_id] THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Paket sudah dimiliki');
    END IF;

    -- Update berdasarkan tipe
    IF v_item_type = 'inventory' THEN
        v_inv_key := p_item_id;
        v_inv_val := COALESCE((v_profile.inventory ->> v_inv_key)::INTEGER, 0) + p_quantity;
        UPDATE public.profiles
        SET coins     = v_new_coins,
            inventory = jsonb_set(
                COALESCE(inventory, '{}'::jsonb),
                ARRAY[v_inv_key],
                to_jsonb(v_inv_val)
            )
        WHERE id = v_user_id;

    ELSIF v_item_type = 'energy' THEN
        UPDATE public.profiles
        SET coins  = v_new_coins,
            energy = LEAST(COALESCE(energy, 0) + (5 * p_quantity), 25)
        WHERE id = v_user_id;

    ELSIF v_item_type = 'avatar' THEN
        UPDATE public.profiles
        SET coins            = v_new_coins,
            unlocked_avatars = array_append(COALESCE(unlocked_avatars, '{}'), p_item_id)
        WHERE id = v_user_id;

    ELSIF v_item_type = 'premium_package' THEN
        UPDATE public.profiles
        SET coins              = v_new_coins,
            purchased_packages = array_append(COALESCE(purchased_packages, '{}'), p_item_id)
        WHERE id = v_user_id;
    END IF;

    -- Catat transaksi (server-side, no double log)
    INSERT INTO public.transactions (user_id, type, item_id, amount, details)
    VALUES (v_user_id, 'purchase', p_item_id, v_cost,
            jsonb_build_object('quantity', p_quantity, 'item_type', v_item_type));

    RETURN jsonb_build_object('success', true, 'coins_after', v_new_coins, 'coins_spent', v_cost);
END; $$;

-- Grant access
REVOKE EXECUTE ON FUNCTION public.purchase_item(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_item(TEXT, INTEGER) TO authenticated;
