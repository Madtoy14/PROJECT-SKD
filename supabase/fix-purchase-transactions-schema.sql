-- Fix purchase_item/sell_item: transactions.metadata (bukan details)
-- Error: column "details" of relation "transactions" does not exist
-- Apply FULL file di SQL Editor production.

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
        ('paket_tryout_1',        1000, 'premium_package'),
        ('paket_tryout_2',        1000, 'premium_package'),
        ('paket_tryout_3',        1000, 'premium_package'),
        ('paket_tryout_4',        1000, 'premium_package'),
        ('paket_tryout_5',        1000, 'premium_package'),
        ('paket_tryout_6',        1000, 'premium_package'),
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

    -- Catat transaksi (schema: category/amount/balance_after/source/metadata — bukan details)
    BEGIN
        INSERT INTO public.transactions (
            user_id, type, category, item_id, amount, balance_after, source, metadata
        ) VALUES (
            v_user_id, 'purchase', 'coin', p_item_id, -v_cost, v_new_coins, 'purchase_item',
            jsonb_build_object('quantity', p_quantity, 'item_type', v_item_type)
        );
    EXCEPTION WHEN OTHERS THEN
        NULL; -- jangan gagalkan pembelian karena log
    END;

    RETURN jsonb_build_object('success', true, 'coins_after', v_new_coins, 'coins_spent', v_cost);
END; $$;

-- Grant access
REVOKE EXECUTE ON FUNCTION public.purchase_item(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_item(TEXT, INTEGER) TO authenticated;


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

    -- Ambil harga jual dari katalog (45% dari harga beli)
    SELECT GREATEST(1, FLOOR(cost * 0.45)::INTEGER) INTO v_reward
    FROM (VALUES
        ('item_hint',               40),
        ('item_5050',               60),
        ('item_waktu_beku',         70),
        ('item_energy_refill',      80),
        ('item_skor_ganda',         90),
        ('item_terawangan',        100),
        ('item_tinta_hitam',       100),
        ('item_shield',            120),
        ('item_streak_protector',  120),
        ('item_kesempatan_kedua',  160),
        ('item_lompatan_kilat',    180)
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

    -- Catat transaksi (schema: metadata, bukan details)
    BEGIN
        INSERT INTO public.transactions (
            user_id, type, category, item_id, amount, balance_after, source, metadata
        ) VALUES (
            v_user_id, 'sell', 'coin', p_item_id, v_reward, v_new_coins, 'sell_item',
            jsonb_build_object('old_qty', v_inv_val, 'new_qty', v_new_qty)
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'coins_after', v_new_coins,
        'coins_earned', v_reward,
        'new_qty', v_new_qty
    );
END; $$;

REVOKE EXECUTE ON FUNCTION public.sell_item(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sell_item(TEXT) TO authenticated;


NOTIFY pgrst, 'reload schema';

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('purchase_item','sell_item')
ORDER BY 1;
