-- ============================================================
-- SKDQuest: APPLY-ALL SECURITY RPCs (one-shot)
-- Tanggal: 2026-07-22
--
-- CARA PAKAI:
-- 1) Backup Supabase dulu (Dashboard → Database → Backups)
-- 2) Jalankan di STAGING dulu
-- 3) Supabase SQL Editor → New query → paste SELURUH file ini → Run
-- 4) Smoke test client (claim, spin, shop, quest, quiz, energy)
-- 5) Baru apply ke PRODUCTION
--
-- ISI:
--   daily_claim, spin_wheel, consume_energy,
--   purchase_item, sell_item, claim_quest, consume_powerup,
--   update_profile_public, public_profile_view,
--   complete_quiz_session (server-side scoring) + RLS quiz
--
-- CATATAN:
-- - CREATE OR REPLACE function + DROP overload lama
-- - Client sudah sinkron ke signature baru di branch master
-- - Edge Function expire-duels TIDAK termasuk (deploy terpisah via CLI)
-- ============================================================

BEGIN;

-- Pastikan ekstensi/schema dasar ada
CREATE SCHEMA IF NOT EXISTS public;


-- ------------------------------------------------------------
-- Drop overload lama (abaikan error jika tidak ada)
-- ------------------------------------------------------------
DO $$
BEGIN
  -- complete_quiz_session legacy signatures
  BEGIN
    DROP FUNCTION IF EXISTS public.complete_quiz_session(UUID, INTEGER, INTEGER, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, JSONB, TEXT);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP FUNCTION IF EXISTS public.complete_quiz_session(UUID, INTEGER, INTEGER, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP FUNCTION IF EXISTS public.complete_quiz_session(UUID, INTEGER, INTEGER, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, JSONB, TEXT);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP FUNCTION IF EXISTS public.complete_quiz_session(UUID);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- purchase/sell old signatures (harga dari client)
  BEGIN
    DROP FUNCTION IF EXISTS public.purchase_item(TEXT, INTEGER, TEXT, INTEGER);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP FUNCTION IF EXISTS public.sell_item(TEXT, INTEGER);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- daily_claim / spin_wheel old (user_id param)
  BEGIN
    DROP FUNCTION IF EXISTS public.daily_claim(UUID);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP FUNCTION IF EXISTS public.spin_wheel(UUID);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- consume_energy old (user_id, amount)
  BEGIN
    DROP FUNCTION IF EXISTS public.consume_energy(UUID, INTEGER);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;


-- ############################################################
-- FILE: supabase/functions/rpc/daily_claim.sql
-- ############################################################
-- SH-02: daily_claim RPC — server-side streak + coin award
-- Parameter user_id dihapus; identitas dari auth.uid()

create or replace function daily_claim()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p profiles%rowtype;
  uid uuid := auth.uid();
  today_str text := to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD');
  streak_new int;
  bonus int;
  msg text;
  days_diff int;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into p from public.profiles where id = uid for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  -- Cek sudah claim hari ini
  if p.last_claim_date = today_str then
    return jsonb_build_object('error', 'already_claimed');
  end if;

  -- Hitung days_diff
  days_diff := case
    when p.last_claim_date is null then 1
    else (current_date - p.last_claim_date::date)
  end;

  -- Streak logic
  if days_diff <= 1 then
    streak_new := coalesce(p.streak, 0) + 1;
  elsif p.inventory->>'item_streak_protector' is not null
    and (p.inventory->>'item_streak_protector')::int > 0
    and days_diff <= 2 then
    streak_new := coalesce(p.streak, 0) + 1;
    update public.profiles set inventory = jsonb_set(
      inventory, '{item_streak_protector}',
      to_jsonb((p.inventory->>'item_streak_protector')::int - 1)
    ) where id = uid;
  else
    streak_new := 1;
  end if;

  -- Bonus koin
  if streak_new % 30 = 0 then
    bonus := 50; msg := 'Mega Streak 30 Hari! +50 Koin';
  elsif streak_new % 7 = 0 then
    bonus := 10; msg := 'Streak Mingguan! +10 Koin';
  else
    bonus := 5; msg := '+5 Koin Harian';
  end if;

  update public.profiles set
    coins = coalesce(coins, 0) + bonus,
    streak = streak_new,
    last_claim_date = today_str
  where id = uid;

  return jsonb_build_object(
    'bonus', bonus,
    'streak', streak_new,
    'msg', msg,
    'coins_new', coalesce(p.coins, 0) + bonus
  );
end; $$;


-- ############################################################
-- FILE: supabase/functions/rpc/spin_wheel.sql
-- ############################################################
-- SH-01: spin_wheel RPC — server-side prize random
-- Deploy ke Supabase SQL Editor

create or replace function spin_wheel()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p profiles%rowtype;
  uid uuid := auth.uid();
  today_str text := to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD');
  r float := random() * 100;
  cumulative float := 0;
  prize_id text;
  prize_count int;
  prize_title text;
  is_coins bool := false;
  is_energy bool := false;
  paid_spin bool := false;
  -- Weights harus match SPIN_PRIZES di Dashboard.tsx
  prizes jsonb := '[
    {"id":"item_waktu_beku",      "title":"Waktu Beku",          "count":1,   "weight":15, "isCoins":false, "isEnergy":false},
    {"id":"item_skor_ganda",      "title":"Skor Ganda",          "count":1,   "weight":15, "isCoins":false, "isEnergy":false},
    {"id":"item_terawangan",      "title":"Teropong Sakti",      "count":1,   "weight":15, "isCoins":false, "isEnergy":false},
    {"id":"coins_100",            "title":"100 Koin",            "count":100, "weight":20, "isCoins":true,  "isEnergy":false},
    {"id":"item_kesempatan_kedua","title":"Kesempatan Kedua",    "count":1,   "weight":10, "isCoins":false, "isEnergy":false},
    {"id":"energy_5",             "title":"5 Energi",            "count":5,   "weight":12, "isCoins":false, "isEnergy":true},
    {"id":"coins_500",            "title":"500 Koin (Jackpot!)", "count":500, "weight":3,  "isCoins":true,  "isEnergy":false}
  ]'::jsonb;
  prize jsonb;
  i int;
begin
  select * into p from public.profiles where id = uid for update;

  -- Cek gratis atau bayar
  if p.last_spin_date = today_str then
    -- Paid spin — cek koin cukup
    if coalesce(p.coins, 0) < 100 then
      return jsonb_build_object('error', 'insufficient_coins');
    end if;
    paid_spin := true;
    update public.profiles set coins = coins - 100 where id = uid;
  end if;

  -- Pick prize server-side
  for i in 0..jsonb_array_length(prizes)-1 loop
    prize := prizes->i;
    cumulative := cumulative + (prize->>'weight')::float;
    if r <= cumulative then
      prize_id    := prize->>'id';
      prize_count := (prize->>'count')::int;
      prize_title := prize->>'title';
      is_coins    := (prize->>'isCoins')::bool;
      is_energy   := (prize->>'isEnergy')::bool;
      exit;
    end if;
  end loop;

  -- Apply prize
  if is_coins then
    update public.profiles set coins = coins + prize_count where id = uid;
  elsif is_energy then
    update public.profiles set energy = least(24, coalesce(energy,0) + prize_count) where id = uid;
  else
    update public.profiles set
      inventory = jsonb_set(
        coalesce(inventory, '{}'::jsonb),
        array[prize_id],
        to_jsonb(coalesce((inventory->>prize_id)::int, 0) + prize_count)
      )
    where id = uid;
  end if;

  -- Update last_spin_date kalau free spin
  if not paid_spin then
    update public.profiles set last_spin_date = today_str where id = uid;
  end if;

  -- Fetch updated profile
  select coins, energy, inventory into p from public.profiles where id = uid;

  return jsonb_build_object(
    'prize_id',    prize_id,
    'prize_title', prize_title,
    'prize_count', prize_count,
    'is_coins',    is_coins,
    'is_energy',   is_energy,
    'paid',        paid_spin,
    'coins_new',   p.coins,
    'energy_new',  p.energy,
    'inventory',   p.inventory
  );
end; $$;


-- ############################################################
-- FILE: supabase/functions/rpc/consume_energy.sql
-- ############################################################
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


-- ############################################################
-- FILE: supabase/functions/rpc/purchase_item.sql
-- NOTE: transactions table may differ across envs; if INSERT fails, adjust columns
-- ############################################################
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

    -- Catat transaksi (best-effort; jangan gagalkan pembelian jika schema log beda)
    BEGIN
      INSERT INTO public.transactions (user_id, type, item_id, amount, details)
      VALUES (v_user_id, 'purchase', p_item_id, v_cost,
              jsonb_build_object('quantity', p_quantity, 'item_type', v_item_type));
    EXCEPTION WHEN undefined_table OR undefined_column OR others THEN
      NULL;
    END;

    RETURN jsonb_build_object('success', true, 'coins_after', v_new_coins, 'coins_spent', v_cost);
END; $$;

-- Grant access
REVOKE EXECUTE ON FUNCTION public.purchase_item(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_item(TEXT, INTEGER) TO authenticated;


-- ############################################################
-- FILE: supabase/functions/rpc/sell_item.sql
-- ############################################################
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

    -- Catat transaksi (best-effort)
    BEGIN
      INSERT INTO public.transactions (user_id, type, item_id, amount, details)
      VALUES (v_user_id, 'sell', p_item_id, v_reward,
              jsonb_build_object('old_qty', v_inv_val, 'new_qty', v_new_qty));
    EXCEPTION WHEN undefined_table OR undefined_column OR others THEN
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


-- ############################################################
-- FILE: supabase/functions/rpc/claim_quest.sql
-- ############################################################
-- RPC: claim_quest — atomic quest claim with progress validation
-- Parameter: p_quest_id (quest metadata can be hardcoded or from config table)
-- Return: { success, coins_earned, coins_after }
CREATE OR REPLACE FUNCTION public.claim_quest(
    p_quest_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_reward INTEGER;
    v_required_total INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    -- Ambil reward dan target dari quest metadata (hardcoded sesuai DAILY_QUESTS_METADATA & WEEKLY_QUESTS_METADATA di Quest.tsx)
    SELECT reward, total INTO v_reward, v_required_total
    FROM (VALUES
        (1, 100, 10),   -- Jawab 10 Soal TWK
        (2, 50, 5),     -- Combo 5x
        (3, 150, 1),    -- Selesaikan Latihan TIU
        (4, 500, 10),   -- 10 Kuis
        (5, 300, 30)    -- Survival 30 Soal
    ) AS quests(id, reward, total)
    WHERE id = p_quest_id;

    IF v_reward IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'unknown_quest');
    END IF;

    -- Lock profil
    SELECT id, coins, quests_progress, quests_claimed
    INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
    END IF;

    -- Cek sudah claimed
    IF v_profile.quests_claimed @> ARRAY[p_quest_id] THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_claimed');
    END IF;

    -- Validasi progress cukup
    IF COALESCE((v_profile.quests_progress ->> p_quest_id::TEXT)::INTEGER, 0) < v_required_total THEN
        RETURN jsonb_build_object('success', false, 'reason', 'progress_insufficient');
    END IF;

    -- Mark claimed & tambah koin atomik
    UPDATE public.profiles
    SET coins = COALESCE(coins, 0) + v_reward,
        quests_claimed = array_append(COALESCE(quests_claimed, '{}'), p_quest_id)
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'coins_earned', v_reward
    );
END; $$;

REVOKE EXECUTE ON FUNCTION public.claim_quest(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_quest(INTEGER) TO authenticated;


-- ############################################################
-- FILE: supabase/functions/rpc/consume_powerup.sql
-- ############################################################
-- RPC: consume_powerup — atomic power-up consumption
-- Parameter: p_session_id (validasi ownership + status), p_item_id
-- Return: { success, item_remaining }
CREATE OR REPLACE FUNCTION public.consume_powerup(
    p_session_id UUID,
    p_item_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_session RECORD;
    v_inv_val INTEGER;
    v_new_qty INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    -- Validasi session milik user dan masih active
    SELECT id, user_id, status INTO v_session
    FROM public.quiz_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'session_not_found');
    END IF;
    IF v_session.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_your_session');
    END IF;
    IF v_session.status NOT IN ('active', 'paused') THEN
        RETURN jsonb_build_object('success', false, 'reason', 'session_not_active');
    END IF;

    -- Lock profil & cek stok
    SELECT id, inventory INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    v_inv_val := COALESCE((v_profile.inventory ->> p_item_id)::INTEGER, 0);
    IF v_inv_val <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'item_not_available');
    END IF;

    -- Decrement atomik
    v_new_qty := v_inv_val - 1;
    UPDATE public.profiles
    SET inventory = jsonb_set(
        COALESCE(inventory, '{}'::jsonb),
        ARRAY[p_item_id],
        to_jsonb(v_new_qty)
    )
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'item_remaining', v_new_qty,
        'item_id', p_item_id
    );
END; $$;

REVOKE EXECUTE ON FUNCTION public.consume_powerup(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_powerup(UUID, TEXT) TO authenticated;


-- ############################################################
-- FILE: supabase/functions/rpc/update_profile_public.sql
-- ############################################################
-- RPC: update_profile_public — hanya izinkan kolom profil non-ekonomi
-- Mutasi coins, energy, level, score, inventory, dll ditolak.
create or replace function update_profile_public(
  p_username text default null,
  p_avatar_url text default null,
  p_nickname text default null,
  p_bio text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles set
    username   = coalesce(p_username, username),
    avatar_url = coalesce(p_avatar_url, avatar_url),
    nickname   = coalesce(p_nickname, nickname),
    bio        = coalesce(p_bio, bio),
    updated_at = now()
  where id = uid;

  return jsonb_build_object('success', true);
end; $$;


-- ############################################################
-- FILE: supabase_schema_server_scoring.sql
-- ############################################################
-- ============================================
-- SKDQUEST SERVER-SIDE SCORING & RLS MIGRATION
-- ============================================

-- 1. Aktifkan RLS
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.quiz_sessions;
CREATE POLICY "Users can view own sessions" ON public.quiz_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.quiz_sessions;
CREATE POLICY "Users can insert own sessions" ON public.quiz_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own sessions" ON public.quiz_sessions;
CREATE POLICY "Users can update own sessions" ON public.quiz_sessions FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own results" ON public.quiz_results;
CREATE POLICY "Users can view own results" ON public.quiz_results FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own results" ON public.quiz_results;
CREATE POLICY "Users can insert own results" ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own results" ON public.quiz_results;
CREATE POLICY "Users can update own results" ON public.quiz_results FOR UPDATE USING (auth.uid() = user_id);

-- 2. Perbarui RPC complete_quiz_session
CREATE OR REPLACE FUNCTION complete_quiz_session(
    p_session_id UUID,
    p_coins_earned INTEGER DEFAULT 0,
    p_xp_earned INTEGER DEFAULT 0,
    p_passed_twk BOOLEAN DEFAULT NULL,
    p_passed_tiu BOOLEAN DEFAULT NULL,
    p_passed_tkp BOOLEAN DEFAULT NULL,
    p_passed_overall BOOLEAN DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session public.quiz_sessions;
    v_result_id UUID;
    v_user_id UUID;
    v_score INTEGER := 0;
    v_twk_score INTEGER := 0;
    v_tiu_score INTEGER := 0;
    v_tkp_score INTEGER := 0;
    v_passed_twk BOOLEAN;
    v_passed_tiu BOOLEAN;
    v_passed_tkp BOOLEAN;
    v_passed_overall BOOLEAN;
    v_twk_count INTEGER := 0;
    v_tiu_count INTEGER := 0;
    v_tkp_count INTEGER := 0;
    v_coins_earned INTEGER := 0;
    v_xp_earned INTEGER := 0;
BEGIN
    -- Autentikasi dan lock session
    SELECT * INTO v_session 
    FROM public.quiz_sessions 
    WHERE id = p_session_id AND user_id = auth.uid()
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Session not found or not yours'; END IF;

    IF v_session.status = 'completed' THEN
        SELECT id INTO v_result_id FROM public.quiz_results WHERE session_id = p_session_id LIMIT 1;
        IF FOUND THEN RETURN v_result_id; END IF;
    END IF;

    v_user_id := v_session.user_id;

    -- Hitung skor server-side
    WITH qa AS (
        SELECT 
            (q.value->>'category') AS category,
            q.value->>'correct' AS correct_opt,
            a.value AS user_opt,
            q.value->'options' AS options
        FROM jsonb_array_elements(v_session.questions_json) WITH ORDINALITY AS q(value, idx)
        LEFT JOIN jsonb_each_text(v_session.answers_json) AS a(key, value) ON a.key::int = (q.idx - 1)
    ),
    scored AS (
        SELECT 
            qa.category,
            COALESCE((
                SELECT (o->>'score')::int 
                FROM jsonb_array_elements(qa.options) AS o 
                WHERE o->>'id' = qa.user_opt
            ), 0) AS score
        FROM qa
    )
    SELECT 
        COALESCE(SUM(score), 0),
        COALESCE(SUM(CASE WHEN category = 'TWK' THEN score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'TIU' THEN score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'TKP' THEN score ELSE 0 END), 0),
        COUNT(CASE WHEN category = 'TWK' THEN 1 END),
        COUNT(CASE WHEN category = 'TIU' THEN 1 END),
        COUNT(CASE WHEN category = 'TKP' THEN 1 END)
    INTO v_score, v_twk_score, v_tiu_score, v_tkp_score, v_twk_count, v_tiu_count, v_tkp_count
    FROM scored;

    IF v_session.mode = 'tryout' THEN
        v_passed_twk := v_twk_score >= CASE WHEN v_twk_count < 30 THEN CEIL(v_twk_count * 0.433 * 5) ELSE 65 END;
        v_passed_tiu := v_tiu_score >= CASE WHEN v_tiu_count < 35 THEN CEIL(v_tiu_count * 0.457 * 5) ELSE 80 END;
        v_passed_tkp := v_tkp_score >= CASE WHEN v_tkp_count < 45 THEN CEIL(v_tkp_count * 0.293 * 5) ELSE 166 END;
        v_passed_overall := v_passed_twk AND v_passed_tiu AND v_passed_tkp;
    ELSE
        -- Passing flags untuk non-tryout ditentukan server
        v_passed_twk := true;
        v_passed_tiu := true;
        v_passed_tkp := true;
        v_passed_overall := true;
    END IF;

    -- Hitung reward server-side (koin & XP berdasarkan skor)
    v_coins_earned := LEAST(v_score * 2, 500);
    v_xp_earned := LEAST(v_score, 100);

    UPDATE public.quiz_sessions
    SET status = 'completed', completed_at = NOW(),
        score = v_score, twk_score = v_twk_score, tiu_score = v_tiu_score, tkp_score = v_tkp_score
    WHERE id = p_session_id;

    INSERT INTO public.quiz_results (
        user_id, session_id, mode, package_id, package_version,
        score, twk_score, tiu_score, tkp_score, accuracy,
        time_spent_seconds, coins_earned, xp_earned,
        questions_json, answers_json, powerups_used,
        passed_twk, passed_tiu, passed_tkp, passed_overall, completed_at
    ) VALUES (
        v_user_id, p_session_id, v_session.mode, v_session.package_id, v_session.package_version,
        v_score, v_twk_score, v_tiu_score, v_tkp_score,
        CASE WHEN (v_twk_count + v_tiu_count + v_tkp_count) > 0
             THEN ROUND((v_score::numeric / ((v_twk_count + v_tiu_count + v_tkp_count) * 4) * 100), 1)
             ELSE 0 END,
        v_session.time_spent_seconds, v_coins_earned, v_xp_earned,
        v_session.questions_json, v_session.answers_json, v_session.used_powerups,
        v_passed_twk, v_passed_tiu, v_passed_tkp, v_passed_overall, NOW()
    ) RETURNING id INTO v_result_id;

    UPDATE public.profiles
    SET coins = coins + v_coins_earned, score = score + v_xp_earned
    WHERE id = v_user_id;

    RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ############################################################
-- FILE: public_profile_view (fixed grants)
-- ############################################################
CREATE OR REPLACE VIEW public.public_profile_view AS
SELECT
  id,
  username,
  score,
  level,
  avatar_url,
  nickname,
  selected_avatar
FROM public.profiles;

GRANT SELECT ON public.public_profile_view TO anon, authenticated;


-- ------------------------------------------------------------
-- Grants: authenticated only (bukan anon)
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.daily_claim() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.spin_wheel() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_energy(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purchase_item(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sell_item(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_quest(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_powerup(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_profile_public(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_quiz_session(UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.daily_claim() TO authenticated;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_energy(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sell_item(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quest(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_powerup(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_public(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_quiz_session(UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- complete_quiz_session: pastikan search_path + security definer
ALTER FUNCTION public.complete_quiz_session(UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN)
  SECURITY DEFINER
  SET search_path = public;

COMMIT;

-- Verifikasi cepat
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'daily_claim','spin_wheel','consume_energy','purchase_item','sell_item',
    'claim_quest','consume_powerup','update_profile_public','complete_quiz_session'
  )
ORDER BY routine_name;
