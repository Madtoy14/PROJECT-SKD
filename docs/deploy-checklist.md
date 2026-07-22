# Checklist Deploy & Verifikasi

## A. Frontend (Vercel)

1. Pastikan GitHub `master` terbaru (commit sinkron client RPC).
2. Di Vercel:
   - Project terhubung ke `Madtoy14/PROJECT-SKD`
   - Production branch: `master` (atau samakan dengan default branch)
   - Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Redeploy Production (auto setelah push, atau manual Redeploy).
4. Setelah deploy:
   - Buka production URL
   - `/inject.html` harus **404**
   - Hard refresh / clear site data (hapus SW lama)
   - Cek header: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`

## B. Supabase — Backup dulu (wajib sebelum SQL)

Detail: `docs/backup-restore.md`

1. Dashboard → Database → Backups:
   - Jika plan Pro+: pastikan daily backup / PITR ON
   - Jika free / No backups: export manual tabel kritis
     - `profiles`
     - `quiz_results`
     - `quiz_sessions` (opsional)
     - `transactions` (jika ada)
2. Catat waktu backup / nama file export.
3. Baru apply SQL.

## C. Supabase (staging dulu bila ada)

Lalu apply SQL dari repo:

### Urutan migrasi dasar
Lihat `supabase/migrations/README.md`.

### RPC security baru (wajib untuk client sync)

**Cara cepat (disarankan):**

1. Buka file `supabase/apply-all-security-rpcs.sql`
2. Supabase SQL Editor → paste **seluruh file** → Run
3. Pastikan query verifikasi di akhir menampilkan semua function

**Cara manual (file terpisah):**

1. `supabase/functions/rpc/daily_claim.sql`
2. `supabase/functions/rpc/spin_wheel.sql`
3. `supabase/functions/rpc/purchase_item.sql`
4. `supabase/functions/rpc/sell_item.sql`
5. `supabase/functions/rpc/consume_energy.sql`
6. `supabase/functions/rpc/claim_quest.sql`
7. `supabase/functions/rpc/consume_powerup.sql`
8. `supabase/functions/rpc/update_profile_public.sql`
9. `supabase/functions/rpc/public_profile_view.sql`
10. Update `complete_quiz_session` dari `supabase_schema_server_scoring.sql`
11. Edge Function `expire-duels` (deploy function + set `CRON_SECRET`)

### Katalog harga (jika ubah ekonomi)
- `supabase/update-economy-catalog.sql` — FE + server harus sinkron

### Smoke SQL
- User A tidak bisa claim/spin sebagai user B
- `purchase_item` menolak item asing / harga palsu (harga diabaikan)
- `complete_quiz_session` tidak menambah koin dari payload client palsu
- `consume_powerup` menolak stok 0 / session bukan milik user

## D. Smoke test aplikasi

1. Login Google
2. Dashboard: daily claim / spin (tanpa error auth)
3. Shop: beli item, cek saldo & inventory
4. Shop: jual item, reward sesuai katalog server
5. Quest: claim (hanya jika progress cukup)
6. Mulai latihan: energy terpotong
7. Power-up di quiz: stok turun hanya setelah RPC sukses; double-click tidak double-consume
8. Selesaikan kuis: result tersimpan, reward server; jika offline → tombol **Coba kirim lagi**
9. Logout: tidak ada data user di Cache Storage

## E. Rollback cepat

- Vercel: Promote deployment sebelumnya
- Supabase data: restore backup / PITR (lihat `docs/backup-restore.md`)
- Supabase function: re-apply SQL kanonis dari repo (emergency)
- Jangan re-apply full dump kecuali data benar-benar rusak

## F. Operasional rutin

| Frekuensi | Aksi | Owner |
|---|---|---|
| Tiap apply SQL prod | Backup / export dulu | Dev on-call |
| Mingguan (free tier) | Export `profiles` + `quiz_results` | Owner project |
| Tiap deploy FE | Smoke login → claim → shop → quiz finish | Dev |
| Setelah incident | Catat di issue + update runbook | Owner |
