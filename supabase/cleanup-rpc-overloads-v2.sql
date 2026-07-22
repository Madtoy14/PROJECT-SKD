-- ============================================================
-- CLEANUP v2: drop remaining legacy overloads
-- Jalankan di SQL Editor (aman diulang)
-- ============================================================

-- 1) Lihat dulu
SELECT
  p.proname AS routine_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('purchase_item','spin_wheel','sell_item','daily_claim','consume_energy')
ORDER BY 1, 2;

-- 2) Drop overload yang TIDAK dipakai client baru
DO $$
BEGIN
  -- purchase_item lama: (item_id, cost, item_type)  << sisa di hasilmu
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.purchase_item(text, integer, text)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'drop purchase_item(text,integer,text): %', SQLERRM;
  END;

  -- spin_wheel lama: (p_buy_extra boolean)  << sisa di hasilmu
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.spin_wheel(boolean)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'drop spin_wheel(boolean): %', SQLERRM;
  END;

  -- jaga-jaga overload lain
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.purchase_item(text, integer, text, integer)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.sell_item(text, integer)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.spin_wheel(uuid)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.daily_claim(uuid)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.consume_energy(uuid, integer)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 3) Pastikan grant signature yang benar
GRANT EXECUTE ON FUNCTION public.purchase_item(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sell_item(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_claim() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_energy(integer) TO authenticated;

-- 4) Verifikasi akhir (target: 1 baris per function)
SELECT
  p.proname AS routine_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'purchase_item','sell_item','spin_wheel','daily_claim',
    'consume_energy','complete_quiz_session','claim_quest',
    'consume_powerup','update_profile_public'
  )
ORDER BY 1, 2;
