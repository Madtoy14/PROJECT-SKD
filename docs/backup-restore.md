# Backup & Restore Supabase (SKDQuest)

**Update:** 22 Jul 2026  
**Project:** PROJECT-SKD (`nfjzyqhcfvlhfwvoseds`)  
**Owner:** Akmaludien

---

## 1. Prinsip

1. **Backup dulu** sebelum apply SQL production (RPC, schema, katalog harga).
2. Prefer **PITR / daily backups** Supabase jika plan mendukung.
3. Free tier tanpa backup otomatis → **export manual mingguan** tabel kritis.
4. Restore = emergency; verifikasi data sebelum reopen traffic.

---

## 2. Cek / aktifkan backup Supabase

Dashboard → **Project Settings → Database → Backups** (atau **Add-ons → Point-in-Time Recovery**).

| Plan | Yang bisa |
|---|---|
| Free | Sering **No backups** — pakai export manual |
| Pro+ | Daily backups + (opsional) PITR |

### Target
- [ ] Daily backup ON (jika plan Pro+)
- [ ] PITR ON jika budget mengizinkan
- [ ] Catat retensi (hari) di sini: `____`

---

## 3. Export manual (fallback free / sebelum migrasi berisiko)

### Tabel kritis (urutan prioritas)

1. `profiles` — koin, inventory, energy, progress
2. `quiz_results` — riwayat skor
3. `quiz_sessions` — sesi aktif/completed (opsional tapi berguna)
4. `transactions` — jika ada top-up/log ekonomi
5. `soal_skd` / `soal_tryout` — hanya jika data soal diubah di DB (bukan hanya static FE)

### Cara cepat (Dashboard)

1. Supabase → **Table Editor** → pilih tabel → **Export** (CSV), **atau**
2. **SQL Editor** → query lalu download result.

Contoh snapshot profil ringkas:

```sql
SELECT id, username, coins, energy, inventory, score, level,
       total_quizzes_completed, updated_at
FROM public.profiles
ORDER BY updated_at DESC;
```

Contoh hasil kuis 30 hari:

```sql
SELECT id, user_id, session_id, score, mode, created_at
FROM public.quiz_results
WHERE created_at > now() - interval '30 days'
ORDER BY created_at DESC;
```

### Cara CLI (jika `supabase` CLI + DB password tersedia)

```bash
# Full logical dump (butuh connection string / password)
pg_dump "$DATABASE_URL" --format=custom --file="skdquest-$(date +%Y%m%d).dump"
```

Simpan file di storage privat (bukan repo git).

### Jadwal usulan
- **Mingguan** (Minggu malam WIB) bila free tier
- **Ad-hoc** sebelum apply `apply-all-security-rpcs.sql` / `update-economy-catalog.sql` / cleanup overload

---

## 4. Sebelum apply SQL production (wajib)

1. Catat commit FE yang sedang live.
2. Export / pastikan backup tersedia.
3. Apply di SQL Editor (atau migrasi).
4. Jalankan smoke query + smoke app (lihat `docs/deploy-checklist.md`).
5. Jika gagal: jangan clear session user; rollback function / restore.

---

## 5. Restore runbook singkat

### A) Restore dari Supabase Backup UI (Pro+)

1. Dashboard → Database → Backups
2. Pilih snapshot / PITR timestamp
3. Restore ke project (atau branch DB jika tersedia)
4. Verifikasi:
   - jumlah row `profiles`, `quiz_results`
   - sample user: coins/inventory masuk akal
   - RPC masih 9 function, 1 signature
5. Redeploy FE jika perlu (jarang, kecuali schema drift)

### B) Restore dari `pg_dump` custom

```bash
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" skdquest-YYYYMMDD.dump
```

Hanya jika kamu yakin dump lengkap dan connection string production benar.  
**Jangan** jalanin di production tanpa konfirmasi.

### C) Rollback function saja (paling sering)

Kalau hanya RPC rusak (bukan data):

1. Re-apply file SQL kanonis dari repo (`supabase/functions/rpc/*.sql` atau `apply-all-security-rpcs.sql`)
2. Jangan drop tabel
3. Smoke: claim, shop, finish quiz

---

## 6. Verifikasi pasca-restore

```sql
-- 9 RPC DEFINER, 1 signature masing-masing (contoh cek nama)
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'daily_claim','spin_wheel','consume_energy','purchase_item','sell_item',
    'claim_quest','consume_powerup','complete_quiz_session','update_profile_public'
  )
ORDER BY 1, 2;
```

Smoke app: login → claim → shop → mulai quiz → finish → result.

---

## 7. Out of scope

- Backup storage bucket media (belum kritis)
- Multi-region replica
- Automasi export ke S3 (boleh ditambah nanti di CI ops)

---

## 8. Status

| Item | Status |
|---|---|
| Runbook ini | ✅ |
| Deploy checklist backup step | lihat `docs/deploy-checklist.md` |
| PITR production aktif | ⚠️ cek manual di dashboard |
| Export mingguan terjadwal | ⚠️ owner wajib set reminder |
