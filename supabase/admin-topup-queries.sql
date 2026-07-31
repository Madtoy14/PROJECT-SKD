-- ========================================================
-- HELPER QUERY OPERASIONAL ADMIN TOP-UP (SQL EDITOR)
-- ========================================================
-- Gunakan query ini di Supabase SQL Editor untuk memproses DM Instagram.

-- --------------------------------------------------------
-- 1. CEK DAFTAR REQUEST TOP-UP PENDING
-- --------------------------------------------------------
-- Menampilkan semua permintaan top-up yang sedang menunggu approval admin
SELECT 
  tr.id AS id_transaksi,
  p.username,
  p.coins AS koin_sekarang,
  tr.package_id,
  tr.coins AS koin_dibeli,
  tr.price_idr AS harga_idr,
  tr.payment_method,
  tr.status,
  tr.created_at AS waktu_request
FROM public.topup_requests tr
JOIN public.profiles p ON p.id = tr.user_id
WHERE tr.status = 'pending'
ORDER BY tr.created_at ASC;


-- --------------------------------------------------------
-- 2. APPROVE TOP-UP (AMBIL ID TRANSAKSI DARI DM INSTAGRAM)
-- --------------------------------------------------------
-- Menambahkan koin ke profil user, mengubah status 'approved', dan mencatat transaksi audit
-- Catatan: Jalankan perintah ini dari SQL Editor (role postgres) atau via API service key.
-- Fungsi approve/reject menerima session_user postgres (SQL Editor) & service_role (API key).
SELECT public.approve_topup('PASTE-ID-TRANSAKSI-DISINI'::uuid);


-- --------------------------------------------------------
-- 3. REJECT TOP-UP (JIKA BUKTI TRANSFER FALSU / BATAL)
-- --------------------------------------------------------
-- Mengubah status request menjadi 'rejected'
SELECT public.reject_topup('PASTE-ID-TRANSAKSI-DISINI'::uuid);
