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
        -- Power-ups (1 koin = Rp10) — sync with Shop.tsx / coins.ts
        ('item_hint',               40, 'inventory'),
        ('item_5050',               60, 'inventory'),
        ('item_waktu_beku',         70, 'inventory'),
        ('item_energy_refill',      80, 'inventory'),
        ('item_skor_ganda',         90, 'inventory'),
        ('item_terawangan',        100, 'inventory'),
        ('item_tinta_hitam',       100, 'inventory'),
        ('item_shield',            120, 'inventory'),
        ('item_streak_protector',  120, 'inventory'),
        ('item_kesempatan_kedua',  160, 'inventory'),
        ('item_lompatan_kilat',    180, 'inventory'),
        -- Avatar (karakter)
        ('ipdn_male',              200, 'avatar'),
        ('perhubungan_male',       200, 'avatar'),
        ('kemenkeu_male',          200, 'avatar'),
        ('bkn_male',               200, 'avatar'),
        ('polor_male',             200, 'avatar'),
        ('stis_female',            200, 'avatar'),
        ('stmkg_female',           200, 'avatar'),
        ('ipdn_female',            200, 'avatar'),
        ('perhubungan_female',     200, 'avatar'),
        ('stan_female',            200, 'avatar'),
        -- Premium content unlock (permanent)
        ('paket_premium_tkp_1',    700, 'premium_package'),
        ('paket_premium_tkp_2',    700, 'premium_package'),
        ('paket_premium_tiu_1',    700, 'premium_package'),
        ('paket_premium_twk_1',    700, 'premium_package'),
        ('paket_premium_tiu_2',    900, 'premium_package'),
        ('paket_premium_twk_2',    900, 'premium_package'),
        ('paket_tryout_standar',  1000, 'premium_package'),
        ('paket_tryout_akbar_1',  1000, 'premium_package'),
        ('paket_tryout_akbar_2',  1000, 'premium_package'),
        ('paket_spesialis_bumn',  1500, 'premium_package'),
        -- Energy convenience alias
        ('energy',                  80, 'energy')
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
