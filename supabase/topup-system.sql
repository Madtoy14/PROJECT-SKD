-- ========================================================
-- SISTEM TOP-UP AMAN (SERVER-VALIDATED & ADMIN APPROVAL)
-- ========================================================
-- Jalankan di Supabase SQL Editor setelah backup.
-- Skrip ini idempotent dan tidak menghapus histori transaksi.

CREATE TABLE IF NOT EXISTS public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL,
  coins INTEGER NOT NULL CHECK (coins > 0),
  price_idr INTEGER NOT NULL CHECK (price_idr > 0),
  payment_method TEXT NOT NULL DEFAULT 'instagram',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own topup requests" ON public.topup_requests;
CREATE POLICY "Users can view own topup requests"
  ON public.topup_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_topup_requests_user_status
  ON public.topup_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_pending_created
  ON public.topup_requests(created_at)
  WHERE status = 'pending';

-- User login dapat membuat request, tetapi paket/harga ditentukan server.
CREATE OR REPLACE FUNCTION public.request_topup(
  amount_val INTEGER DEFAULT NULL,
  method_val TEXT DEFAULT 'instagram',
  package_id_val TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_pkg_id TEXT;
  v_coins INTEGER;
  v_price INTEGER;
  v_request_id UUID;
  v_pending_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User belum terautentikasi';
  END IF;

  IF COALESCE(method_val, 'instagram') <> 'instagram' THEN
    RAISE EXCEPTION 'Metode pembayaran tidak valid';
  END IF;

  v_pkg_id := COALESCE(
    package_id_val,
    CASE amount_val
      WHEN 500 THEN 'pkg_500'
      WHEN 1300 THEN 'pkg_1300'
      WHEN 4000 THEN 'pkg_4000'
      WHEN 10000 THEN 'pkg_10000'
      ELSE NULL
    END
  );

  CASE v_pkg_id
    WHEN 'pkg_500' THEN v_coins := 500; v_price := 5000;
    WHEN 'pkg_1300' THEN v_coins := 1300; v_price := 10000;
    WHEN 'pkg_4000' THEN v_coins := 4000; v_price := 25000;
    WHEN 'pkg_10000' THEN v_coins := 10000; v_price := 50000;
    ELSE RAISE EXCEPTION 'Paket koin tidak valid: %', COALESCE(v_pkg_id, 'NULL');
  END CASE;

  -- Lock profile agar request paralel tidak melewati batas pending.
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  SELECT COUNT(*) INTO v_pending_count
  FROM public.topup_requests
  WHERE user_id = v_user_id AND status = 'pending';

  IF v_pending_count >= 3 THEN
    RAISE EXCEPTION 'Maksimal 3 request top-up pending. Tunggu proses sebelumnya selesai.';
  END IF;

  INSERT INTO public.topup_requests
    (user_id, package_id, coins, price_idr, payment_method, status)
  VALUES
    (v_user_id, v_pkg_id, v_coins, v_price, 'instagram', 'pending')
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Approval/rejection hanya dapat dipanggil backend yang memegang service-role key.
CREATE OR REPLACE FUNCTION public.approve_topup(target_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_new_coins INTEGER;
BEGIN
  IF session_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Akses ditolak: hanya service role yang dapat menyetujui top-up';
  END IF;

  SELECT * INTO v_req
  FROM public.topup_requests
  WHERE id = target_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request topup dengan ID % tidak ditemukan', target_request_id;
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request topup sudah diproses sebelumnya (Status: %)', v_req.status;
  END IF;

  UPDATE public.profiles
  SET coins = COALESCE(coins, 0) + v_req.coins
  WHERE id = v_req.user_id
  RETURNING coins INTO v_new_coins;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil pengguna tidak ditemukan';
  END IF;

  UPDATE public.topup_requests
  SET status = 'approved', approved_at = now()
  WHERE id = target_request_id;

  INSERT INTO public.transactions
    (user_id, type, category, item_id, amount, balance_after, source, metadata)
  VALUES
    (
      v_req.user_id,
      'reward',
      'coin',
      v_req.package_id,
      v_req.coins,
      v_new_coins,
      'manual_topup',
      jsonb_build_object(
        'topup_request_id', target_request_id,
        'price_idr', v_req.price_idr,
        'payment_method', v_req.payment_method
      )
    );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', target_request_id,
    'user_id', v_req.user_id,
    'coins_added', v_req.coins,
    'new_total_coins', v_new_coins,
    'status', 'approved'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_topup(target_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
BEGIN
  IF session_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Akses ditolak: hanya service role yang dapat menolak top-up';
  END IF;

  SELECT * INTO v_req
  FROM public.topup_requests
  WHERE id = target_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request topup dengan ID % tidak ditemukan', target_request_id;
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request topup sudah diproses sebelumnya (Status: %)', v_req.status;
  END IF;

  UPDATE public.topup_requests
  SET status = 'rejected'
  WHERE id = target_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', target_request_id,
    'status', 'rejected'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_topup(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_topup(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.reject_topup(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_topup(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.request_topup(INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_topup(INTEGER, TEXT, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
