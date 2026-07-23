-- ============================================================
-- REASSIGN paket tryout v2 (lebih sederhana, 2 step)
-- Pakai temp table agar update sisa tidak dobel window.
-- ============================================================

BEGIN;

CREATE TEMP TABLE tmp_tryout_pkg AS
WITH ranked AS (
  SELECT
    id,
    tipe,
    ROW_NUMBER() OVER (
      PARTITION BY tipe
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.soal_tryout
  WHERE tipe IN ('TWK', 'TIU', 'TKP')
),
numbered AS (
  SELECT
    id,
    tipe,
    CASE tipe
      WHEN 'TWK' THEN ((rn - 1) / 30) + 1
      WHEN 'TIU' THEN ((rn - 1) / 35) + 1
      WHEN 'TKP' THEN ((rn - 1) / 45) + 1
    END AS pkg_num
  FROM ranked
),
limits AS (
  SELECT MIN(full_pkgs) AS max_full
  FROM (
    SELECT
      tipe,
      FLOOR(COUNT(*)::numeric / CASE tipe
        WHEN 'TWK' THEN 30
        WHEN 'TIU' THEN 35
        WHEN 'TKP' THEN 45
      END)::int AS full_pkgs
    FROM public.soal_tryout
    WHERE tipe IN ('TWK', 'TIU', 'TKP')
    GROUP BY tipe
  ) s
)
SELECT
  n.id,
  n.tipe,
  n.pkg_num,
  l.max_full,
  CASE
    WHEN n.pkg_num <= l.max_full THEN n.pkg_num
    ELSE NULL
  END AS final_pkg
FROM numbered n
CROSS JOIN limits l;

-- Reset semua dulu (bersihkan akbar mass-assign)
UPDATE public.soal_tryout
SET paket_id = NULL, paket = NULL;

-- Assign hanya paket penuh
UPDATE public.soal_tryout t
SET
  paket    = x.final_pkg,
  paket_id = 'paket_tryout_' || x.final_pkg::text
FROM tmp_tryout_pkg x
WHERE t.id = x.id
  AND x.final_pkg IS NOT NULL;

COMMIT;

-- Preview temp (masih ada di session)
SELECT max_full AS paket_penuh_maks FROM tmp_tryout_pkg LIMIT 1;

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
ORDER BY paket;

SELECT tipe, COUNT(*) AS sisa_unassigned
FROM public.soal_tryout
WHERE paket_id IS NULL AND tipe IN ('TWK','TIU','TKP')
GROUP BY tipe
ORDER BY tipe;
