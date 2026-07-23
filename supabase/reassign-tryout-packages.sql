-- ============================================================
-- REASSIGN paket tryout (statis, by created_at)
-- Format BKN: TWK 30 + TIU 35 + TKP 45 = 110 / paket
--
-- Masalah: hampir semua row di soal_tryout keburu di-set
--   paket_id = 'paket_tryout_akbar_1' (salah).
--
-- Solusi:
--   1) Per tipe, urutkan created_at ASC, id ASC
--   2) Slice: TWK floor((rn-1)/30)+1, TIU /35, TKP /45
--   3) Hanya nomor paket yang GENAP di SEMUA tipe (min)
--      yang jadi paket_tryout_N
--   4) Sisa (tidak cukupap 1 paket penuh) → paket_id NULL
--
-- Kolom:
--   paket_id text  = 'paket_tryout_1' ... (kanonis FE)
--   paket int4     = 1,2,3... (mirror angka; opsional, diisi sama)
--
-- SEBELUM RUN: backup / export soal_tryout jika perlu.
-- ============================================================

BEGIN;

-- 0) Snapshot hitung dulu (lihat di Results)
SELECT tipe, COUNT(*) AS total
FROM public.soal_tryout
GROUP BY tipe
ORDER BY tipe;

-- 1) Hitung nomor paket per baris (window per tipe)
WITH ranked AS (
  SELECT
    id,
    tipe,
    ROW_NUMBER() OVER (
      PARTITION BY tipe
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.soal_tryout
),
sized AS (
  SELECT
    id,
    tipe,
    rn,
    CASE tipe
      WHEN 'TWK' THEN 30
      WHEN 'TIU' THEN 35
      WHEN 'TKP' THEN 45
      ELSE NULL
    END AS chunk
  FROM ranked
),
numbered AS (
  SELECT
    id,
    tipe,
    rn,
    chunk,
    CASE
      WHEN chunk IS NULL THEN NULL
      ELSE ((rn - 1) / chunk) + 1   -- 1-based package number
    END AS pkg_num
  FROM sized
),
-- 2) Max paket penuh = min(floor(count/chunk)) across TWK/TIU/TKP
limits AS (
  SELECT
    MIN(full_pkgs) AS max_full
  FROM (
    SELECT
      tipe,
      FLOOR(COUNT(*)::numeric / CASE tipe
        WHEN 'TWK' THEN 30
        WHEN 'TIU' THEN 35
        WHEN 'TKP' THEN 45
        ELSE 999999
      END)::int AS full_pkgs
    FROM public.soal_tryout
    WHERE tipe IN ('TWK', 'TIU', 'TKP')
    GROUP BY tipe
  ) s
),
assignable AS (
  SELECT
    n.id,
    n.pkg_num,
    l.max_full
  FROM numbered n
  CROSS JOIN limits l
  WHERE n.pkg_num IS NOT NULL
    AND n.pkg_num <= l.max_full
)
UPDATE public.soal_tryout t
SET
  paket_id = 'paket_tryout_' || a.pkg_num::text,
  paket    = a.pkg_num
FROM assignable a
WHERE t.id = a.id;

-- 3) Sisanya (tidak masuk paket penuh) → kosongkan label
UPDATE public.soal_tryout t
SET paket_id = NULL, paket = NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM (
    SELECT
      id,
      CASE tipe
        WHEN 'TWK' THEN ((ROW_NUMBER() OVER (PARTITION BY tipe ORDER BY created_at ASC NULLS LAST, id ASC) - 1) / 30) + 1
        WHEN 'TIU' THEN ((ROW_NUMBER() OVER (PARTITION BY tipe ORDER BY created_at ASC NULLS LAST, id ASC) - 1) / 35) + 1
        WHEN 'TKP' THEN ((ROW_NUMBER() OVER (PARTITION BY tipe ORDER BY created_at ASC NULLS LAST, id ASC) - 1) / 45) + 1
        ELSE NULL
      END AS pkg_num
    FROM public.soal_tryout
  ) x
  CROSS JOIN (
    SELECT MIN(full_pkgs) AS max_full
    FROM (
      SELECT
        tipe,
        FLOOR(COUNT(*)::numeric / CASE tipe
          WHEN 'TWK' THEN 30
          WHEN 'TIU' THEN 35
          WHEN 'TKP' THEN 45
          ELSE 999999
        END)::int AS full_pkgs
      FROM public.soal_tryout
      WHERE tipe IN ('TWK', 'TIU', 'TKP')
      GROUP BY tipe
    ) s
  ) l
  WHERE x.id = t.id
    AND x.pkg_num IS NOT NULL
    AND x.pkg_num <= l.max_full
);

COMMIT;

-- ============================================================
-- VERIFIKASI
-- ============================================================

-- Harus ~6 paket (tergantung stok), masing-masing 30+35+45=110
SELECT
  paket_id,
  paket,
  COUNT(*) FILTER (WHERE tipe = 'TWK') AS twk,
  COUNT(*) FILTER (WHERE tipe = 'TIU') AS tiu,
  COUNT(*) FILTER (WHERE tipe = 'TKP') AS tkp,
  COUNT(*) AS total
FROM public.soal_tryout
WHERE paket_id IS NOT NULL
GROUP BY paket_id, paket
ORDER BY paket NULLS LAST, paket_id;

-- Sisa unassigned
SELECT tipe, COUNT(*) AS sisa_null
FROM public.soal_tryout
WHERE paket_id IS NULL
GROUP BY tipe
ORDER BY tipe;

-- Cek tidak ada lagi akbar mass-assign (kecuali sengaja diisi nanti)
SELECT paket_id, COUNT(*)
FROM public.soal_tryout
WHERE paket_id ILIKE '%akbar%'
GROUP BY 1;
