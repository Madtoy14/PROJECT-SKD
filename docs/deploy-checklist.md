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

## B. Supabase (staging dulu)

Backup dulu. Lalu apply SQL dari repo:

### Urutan migrasi dasar
Lihat `supabase/migrations/README.md`.

### RPC security baru (wajib untuk client sync)
Jalankan di SQL Editor (staging):

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

### Smoke SQL
- User A tidak bisa claim/spin sebagai user B
- `purchase_item` menolak item asing / harga palsu (harga diabaikan)
- `complete_quiz_session` tidak menambah koin dari payload client palsu

## C. Smoke test aplikasi

1. Login Google
2. Dashboard: daily claim / spin (tanpa error auth)
3. Shop: beli item, cek saldo & inventory
4. Shop: jual item, reward sesuai 50% katalog
5. Quest: claim (hanya jika progress cukup)
6. Mulai latihan: energy terpotong
7. Selesaikan kuis: result tersimpan, reward server
8. Logout: tidak ada data user di Cache Storage

## D. Rollback cepat

- Vercel: Promote deployment sebelumnya
- Supabase: restore backup / re-apply function lama hanya jika emergency
