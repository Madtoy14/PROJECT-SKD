-- ============================================================
-- SECURITY FIX: RPC Functions untuk Shop & Quiz Session
-- Jalankan di Supabase SQL Editor SETELAH supabase_security_fixes.sql
-- 
-- Fungsi yang dibuat:
--   1. purchase_item       — atomic beli item/paket/avatar/energi
--   2. sell_item           — atomic jual balik item
--   3. complete_quiz_session (UPDATE) — tambah p_answers_json & p_package_id
-- ============================================================

-- ============================================================
-- 1. RPC: purchase_item
--    Atomic: validasi koin → deduct → update inventory/paket/avatar/energi
--    Return: { success, coins_after, reason }
-- ============================================================
CREATE OR REPLACE FUNCTION public.purchase_item(
    p_item_id    TEXT,
    p_cost       INTEGER,
    p_item_type  TEXT,   -- 'inventory' | 'avatar' | 'premium_package' | 'energy'
    p_quantity   INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id    UUID;
    v_profile    RECORD;
    v_coins_now  INTEGER;
    v_new_coins  INTEGER;
    v_inv_key    TEXT;
    v_inv_val    INTEGER;
BEGIN
    -- Autentikasi
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Tidak terautentikasi');
    END IF;

    -- Validasi parameter dasar
    IF p_cost <= 0 OR p_cost > 200000 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Harga tidak valid');
    END IF;
    IF p_quantity <= 0 OR p_quantity > 100 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Kuantitas tidak valid');
    END IF;
    IF p_item_type NOT IN ('inventory', 'avatar', 'premium_package', 'energy') THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Tipe item tidak valid');
    END IF;

    -- Lock baris profil (FOR UPDATE) untuk cegah race condition
    SELECT id, coins, inventory, unlocked_avatars, purchased_packages, energy
    INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Profil tidak ditemukan');
    END IF;

    v_coins_now := v_profile.coins;

    -- Cek kecukupan koin
    IF v_coins_now < p_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'Koin tidak cukup (dimiliki: ' || v_coins_now || ', dibutuhkan: ' || p_cost || ')'
        );
    END IF;

    -- Cek kepemilikan untuk avatar & paket (idempotency guard)
    IF p_item_type = 'avatar' AND (v_profile.unlocked_avatars @> ARRAY[p_item_id]) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Avatar sudah dimiliki');
    END IF;
    IF p_item_type = 'premium_package' AND (v_profile.purchased_packages @> ARRAY[p_item_id]) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Paket sudah dimiliki');
    END IF;

    v_new_coins := v_coins_now - p_cost;

    -- Update berdasarkan tipe item
    IF p_item_type = 'inventory' THEN
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

    ELSIF p_item_type = 'energy' THEN
        UPDATE public.profiles
        SET coins  = v_new_coins,
            energy = LEAST(COALESCE(energy, 0) + (5 * p_quantity), 25)
        WHERE id = v_user_id;

    ELSIF p_item_type = 'avatar' THEN
        UPDATE public.profiles
        SET coins            = v_new_coins,
            unlocked_avatars = array_append(COALESCE(unlocked_avatars, '{}'), p_item_id)
        WHERE id = v_user_id;

    ELSIF p_item_type = 'premium_package' THEN
        UPDATE public.profiles
        SET coins              = v_new_coins,
            purchased_packages = array_append(COALESCE(purchased_packages, '{}'), p_item_id)
        WHERE id = v_user_id;
    END IF;

    -- Log transaksi (audit trail server-side)
    INSERT INTO public.transactions (
        user_id, type, category, item_id, amount, balance_after, source, metadata
    ) VALUES (
        v_user_id, 'purchase', 'coin', p_item_id,
        -p_cost, v_new_coins, 'shop_purchase',
        jsonb_build_object('item_type', p_item_type, 'quantity', p_quantity)
    );

    RETURN jsonb_build_object(
        'success',     true,
        'coins_after', v_new_coins
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Kesalahan server: ' || SQLERRM);
END;
$$;

-- ============================================================
-- 2. RPC: sell_item
--    Atomic: validasi qty → tambah koin (50%) → kurang inventory
--    Return: { success, coins_after, reward, quantity_remaining, reason }
-- ============================================================
CREATE OR REPLACE FUNCTION public.sell_item(
    p_item_id       TEXT,
    p_original_cost INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id   UUID;
    v_profile   RECORD;
    v_inv_val   INTEGER;
    v_reward    INTEGER;
    v_new_coins INTEGER;
    v_new_qty   INTEGER;
BEGIN
    -- Autentikasi
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Tidak terautentikasi');
    END IF;

    -- Validasi harga asli (mencegah manipulasi reward)
    IF p_original_cost <= 0 OR p_original_cost > 200000 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Harga tidak valid');
    END IF;

    -- Lock baris profil untuk cegah race condition
    SELECT id, coins, inventory
    INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Profil tidak ditemukan');
    END IF;

    -- Cek stok item
    v_inv_val := COALESCE((v_profile.inventory ->> p_item_id)::INTEGER, 0);
    IF v_inv_val <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Item tidak cukup di inventori');
    END IF;

    -- Hitung reward 50% (server menghitung, bukan client)
    v_reward    := FLOOR(p_original_cost * 0.5);
    v_new_coins := v_profile.coins + v_reward;
    v_new_qty   := v_inv_val - 1;

    -- Update profil secara atomic
    UPDATE public.profiles
    SET coins     = v_new_coins,
        inventory = jsonb_set(
            COALESCE(inventory, '{}'::jsonb),
            ARRAY[p_item_id],
            to_jsonb(v_new_qty)
        )
    WHERE id = v_user_id;

    -- Log transaksi
    INSERT INTO public.transactions (
        user_id, type, category, item_id, amount, balance_after, source, metadata
    ) VALUES (
        v_user_id, 'sell', 'coin', p_item_id,
        v_reward, v_new_coins, 'shop_sellback',
        jsonb_build_object('original_price', p_original_cost, 'quantity_remaining', v_new_qty)
    );

    RETURN jsonb_build_object(
        'success',            true,
        'coins_after',        v_new_coins,
        'reward',             v_reward,
        'quantity_remaining', v_new_qty
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Kesalahan server: ' || SQLERRM);
END;
$$;

-- ============================================================
-- 3. RPC: complete_quiz_session (UPDATE SIGNATURE)
--    Tambah parameter: p_answers_json & p_package_id
--    Seluruh operasi dalam SATU transaksi DB:
--      a. UPDATE quiz_sessions  → status='completed', simpan answers & skor
--      b. INSERT quiz_results   → simpan hasil permanen
--      c. UPDATE profiles       → tambah koin, xp/skor, total_quizzes_completed
--    Return: UUID result_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_quiz_session(
    p_session_id     UUID,
    p_score          INTEGER,
    p_twk_score      INTEGER   DEFAULT 0,
    p_tiu_score      INTEGER   DEFAULT 0,
    p_tkp_score      INTEGER   DEFAULT 0,
    p_accuracy       NUMERIC   DEFAULT 0,
    p_coins_earned   INTEGER   DEFAULT 0,
    p_xp_earned      INTEGER   DEFAULT 0,
    p_passed_twk     BOOLEAN   DEFAULT NULL,
    p_passed_tiu     BOOLEAN   DEFAULT NULL,
    p_passed_tkp     BOOLEAN   DEFAULT NULL,
    p_passed_overall BOOLEAN   DEFAULT NULL,
    -- Parameter baru: dikirim langsung dari frontend agar atomic
    p_answers_json   JSONB     DEFAULT NULL,
    p_package_id     TEXT      DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id     UUID;
    v_session     RECORD;
    v_result_id   UUID;
    v_new_score   INTEGER;
    v_new_coins   INTEGER;
    v_new_level   INTEGER;
    v_questions   JSONB;
    v_answers     JSONB;
    v_mode        TEXT;
    v_time_spent  INTEGER;
BEGIN
    -- Autentikasi
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Tidak terautentikasi';
    END IF;

    -- Ambil & validasi session (hanya milik user ini, harus masih active)
    -- Gunakan FOR UPDATE untuk lock — cegah double-submit
    SELECT id, user_id, mode, questions_json, answers_json,
           time_spent_seconds, status, package_id
    INTO v_session
    FROM public.quiz_sessions
    WHERE id = p_session_id
      AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session tidak ditemukan atau bukan milik user ini';
    END IF;

    -- Idempotency: jika sudah completed, kembalikan result_id yang ada
    IF v_session.status = 'completed' THEN
        SELECT id INTO v_result_id
        FROM public.quiz_results
        WHERE session_id = p_session_id
        LIMIT 1;
        RETURN v_result_id;
    END IF;

    IF v_session.status NOT IN ('active', 'paused') THEN
        RAISE EXCEPTION 'Session tidak bisa diselesaikan (status: %)', v_session.status;
    END IF;

    -- Resolusi answers_json: prioritaskan dari parameter (final answers),
    -- fallback ke yang sudah tersimpan di DB
    v_answers    := COALESCE(p_answers_json, v_session.answers_json, '{}'::jsonb);
    v_questions  := v_session.questions_json;
    v_mode       := v_session.mode;
    v_time_spent := COALESCE(v_session.time_spent_seconds, 0);

    -- Validasi skor dasar (anti-cheat: tidak boleh negatif)
    IF p_score < 0 OR p_twk_score < 0 OR p_tiu_score < 0 OR p_tkp_score < 0 THEN
        RAISE EXCEPTION 'Skor tidak valid (nilai negatif)';
    END IF;
    IF p_coins_earned < 0 OR p_coins_earned > 5000 THEN
        RAISE EXCEPTION 'Koin earned tidak valid';
    END IF;

    -- ── a. UPDATE quiz_sessions (atomic, dalam transaksi ini) ──
    UPDATE public.quiz_sessions
    SET status        = 'completed',
        completed_at  = NOW(),
        answers_json  = v_answers,
        score         = p_score,
        twk_score     = p_twk_score,
        tiu_score     = p_tiu_score,
        tkp_score     = p_tkp_score,
        package_id    = COALESCE(p_package_id, v_session.package_id)
    WHERE id = p_session_id;

    -- ── b. INSERT quiz_results (permanent record) ──
    INSERT INTO public.quiz_results (
        user_id, session_id, mode,
        score, twk_score, tiu_score, tkp_score,
        accuracy, time_spent_seconds,
        coins_earned, xp_earned,
        questions_json, answers_json,
        passed_twk, passed_tiu, passed_tkp, passed_overall,
        package_id,
        completed_at
    ) VALUES (
        v_user_id, p_session_id, v_mode,
        p_score, p_twk_score, p_tiu_score, p_tkp_score,
        p_accuracy, v_time_spent,
        p_coins_earned, p_xp_earned,
        v_questions, v_answers,
        p_passed_twk, p_passed_tiu, p_passed_tkp, p_passed_overall,
        p_package_id,
        NOW()
    )
    RETURNING id INTO v_result_id;

    -- ── c. UPDATE profiles (koin, skor kumulatif, level) ──
    SELECT coins, score INTO v_new_coins, v_new_score
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    v_new_coins := v_new_coins + p_coins_earned;
    v_new_score := v_new_score + p_xp_earned;

    -- Level naik setiap 1000 XP (sederhana, bisa disesuaikan)
    v_new_level := GREATEST(1, FLOOR(v_new_score / 1000)::INTEGER + 1);

    UPDATE public.profiles
    SET coins                   = v_new_coins,
        score                   = v_new_score,
        level                   = v_new_level,
        total_quizzes_completed = COALESCE(total_quizzes_completed, 0) + 1
    WHERE id = v_user_id;

    -- Log transaksi koin (audit trail)
    IF p_coins_earned > 0 THEN
        INSERT INTO public.transactions (
            user_id, type, category, amount, balance_after, source, metadata
        ) VALUES (
            v_user_id, 'reward', 'coin',
            p_coins_earned, v_new_coins, 'quiz_completion',
            jsonb_build_object(
                'session_id', p_session_id,
                'result_id',  v_result_id,
                'mode',       v_mode,
                'score',      p_score
            )
        );
    END IF;

    RETURN v_result_id;

EXCEPTION WHEN OTHERS THEN
    -- Re-raise agar frontend bisa catch dan tidak clear session
    RAISE;
END;
$$;

-- ============================================================
-- Tambah kolom package_id ke quiz_sessions & quiz_results
-- jika belum ada (idempotent)
-- ============================================================
ALTER TABLE public.quiz_sessions
    ADD COLUMN IF NOT EXISTS package_id TEXT DEFAULT NULL;

ALTER TABLE public.quiz_results
    ADD COLUMN IF NOT EXISTS package_id TEXT DEFAULT NULL;

-- ============================================================
-- Revoke akses langsung ke fungsi dari anon/public,
-- hanya authenticated user yang boleh panggil RPC ini
-- ============================================================
REVOKE ALL ON FUNCTION public.purchase_item(TEXT, INTEGER, TEXT, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.sell_item(TEXT, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.complete_quiz_session(UUID, INTEGER, INTEGER, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, JSONB, TEXT) FROM anon;

GRANT EXECUTE ON FUNCTION public.purchase_item(TEXT, INTEGER, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sell_item(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_quiz_session(UUID, INTEGER, INTEGER, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, JSONB, TEXT) TO authenticated;

-- ============================================================
-- Verifikasi: tampilkan fungsi yang berhasil dibuat
-- ============================================================
SELECT
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('purchase_item', 'sell_item', 'complete_quiz_session')
ORDER BY routine_name;
