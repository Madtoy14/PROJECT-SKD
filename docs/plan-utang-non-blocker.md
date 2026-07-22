# Plan Perbaikan Utang Non-Blocker

Update: 22 Jul 2026  
Status launching: **boleh soft launch / production**  
Dokumen ini = backlog **pasca-launch**, bukan blocker go-live.

## Konteks

Audit kritis sudah ditutup:
- inject token dibersihkan
- RPC ekonomi/scoring server-authoritative
- overload legacy dibersihkan
- client diselaraskan ke signature baru
- build lolos, smoke fitur utama aman

Sisa item di bawah **tidak menahan live**, tapi harus dikerjakan agar celah residual mengecil.

---

## Tujuan

1. Tutup sisa celah ekonomi (power-up)
2. Stabilkan finish quiz saat error jaringan
3. Amankan operasional DB (backup)
4. Cegah regresi lewat CI
5. Poles accessibility & SEO

---

## Fase A — Power-up server-only

**Prioritas:** P1  
**Estimasi:** 0.5–1 hari  
**Risiko jika ditunda:** double-use item, stok meleset, efek aktif walau write gagal

### Scope

Semua konsumsi power-up di quiz lewat RPC `consume_powerup`.

### Task

- [ ] Audit handler di `src/pages/Quiz.tsx`:
  - [ ] `item_5050`
  - [ ] `item_hint`
  - [ ] `item_waktu_beku`
  - [ ] `item_skor_ganda`
  - [ ] `item_terawangan`
  - [ ] `item_kesempatan_kedua` / `item_shield`
  - [ ] `item_tinta_hitam`
  - [ ] `item_lompatan_kilat`
- [ ] Buat helper client `consumePowerup(sessionId, itemId)`
- [ ] Tiap handler:
  - [ ] disable tombol saat request
  - [ ] `await` RPC
  - [ ] sukses → baru terapkan efek + sync inventory lokal
  - [ ] gagal → toast, **jangan** aktifkan efek
- [ ] Hapus path `updateProfile({ inventory })` untuk konsumsi item
- [ ] Limit per mode boleh tetap di client (UX), stok tetap authoritative di server

### Kriteria selesai

- Klik cepat berulang tidak membuat stok negatif
- Dua tab tidak double-consume
- RPC gagal = efek tidak jalan

### Test

- Manual tiap power-up di mode latihan
- Kasus stok 1 → consume 2x (kedua harus gagal)

### File utama

- `src/pages/Quiz.tsx`
- `src/lib/supabase.ts` (helper)
- `supabase/functions/rpc/consume_powerup.sql`

---

## Fase B — Completion retry unify

**Prioritas:** P1  
**Estimasi:** 0.5 hari  
**Risiko jika ditunda:** user stuck / result membingungkan saat jaringan putus

### Scope

Satu alur finish quiz di `Quiz.tsx` + `QuizSessionContext`.

### Task

- [ ] Satukan alur survival / tryout / normal ke `finishQuiz()`
- [ ] State: `isFinishing`, `finishError`, `canRetry`
- [ ] Sukses hanya jika server mengembalikan `result_id`
- [ ] Gagal:
  - [ ] reset `isFinishing`
  - [ ] tampilkan aksi **Coba kirim lagi**
  - [ ] session tetap aktif
- [ ] Jangan navigasi ke `/result/:id` sebelum `result_id` valid
- [ ] Guard double-submit (UI + idempotent server)

### Kriteria selesai

- Submit saat offline → UI retry, tidak macet total
- Retry sukses → result valid
- Tidak ada navigasi result palsu

### Test

- Mock RPC reject 1x lalu sukses
- Manual offline/online saat finish

### File utama

- `src/pages/Quiz.tsx`
- `src/context/QuizSessionContext.tsx`

---

## Fase C — Backup & operasional DB

**Prioritas:** P1/P2  
**Estimasi:** 1–2 jam  
**Risiko jika ditunda:** sulit rollback saat salah migration/data rusak

### Task

- [ ] Cek plan Supabase: aktifkan Backups / PITR bila tersedia
- [ ] Jika free / tanpa PITR:
  - [ ] jadwal export mingguan tabel kritis
    - `profiles`
    - `quiz_results`
    - `transactions` (jika ada)
    - `quiz_sessions` (opsional)
- [ ] Update `docs/deploy-checklist.md`:
  - [ ] backup wajib sebelum apply SQL
  - [ ] owner + frekuensi
- [ ] Tulis runbook restore singkat (1/2 halaman)

### Kriteria selesai

- Ada jalur backup yang terbukti
- Deploy checklist memuat langkah backup

### File utama

- `docs/deploy-checklist.md`
- (opsional) `docs/backup-restore.md`

---

## Fase D — CI formal

**Prioritas:** P2  
**Estimasi:** 1–2 jam  
**Risiko jika ditunda:** regresi masuk `master` tanpa ketahuan

### Task

- [ ] Tambah `.github/workflows/ci.yml`
- [ ] Trigger: pull request + push ke `master`
- [ ] Steps:
  - `npm ci`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm audit --audit-level=high`
- [ ] (Opsional) branch protection: CI required sebelum merge

### Kriteria selesai

- PR rusak gagal CI
- Build/test otomatis tiap push relevan

### File utama

- `.github/workflows/ci.yml`

---

## Fase E — Hardening sisa ekonomi/session

**Prioritas:** P2  
**Estimasi:** 0.5 hari

### Task

- [ ] Pastikan progress quest tidak mudah dipalsu client (ideal: update progress server-side)
- [ ] Catat pemakaian power-up ke session (`used_powerups`) lewat RPC bila diperlukan
- [ ] Tolak consume jika session bukan milik user / status bukan active|paused
- [ ] Standarkan reason code error RPC untuk support

### Kriteria selesai

- Tidak ada path client yang memutasi inventory/ekonomi sensitif secara langsung

### File utama

- `src/pages/Quest.tsx`
- `src/pages/Quiz.tsx`
- RPC terkait di `supabase/functions/rpc/`

---

## Fase F — Accessibility polish

**Prioritas:** P3  
**Estimasi:** 0.5–1 hari

### Task

- [ ] Skip link ke `#main-content`
- [ ] Ganti sisa `<div onClick>` menjadi `<button type="button">`
- [ ] Semua icon-button punya `aria-label`
- [ ] Pastikan modal lain (topup, spin, leaderboard) memakai `useFocusTrap`
- [ ] Smoke keyboard-only: auth, dashboard, quiz, shop

### Kriteria selesai

- Alur utama bisa diselesaikan tanpa mouse

### File utama

- `src/App.tsx`
- `src/pages/*`
- `src/components/modals/*`

---

## Fase G — SEO / domain polish

**Prioritas:** P3  
**Estimasi:** 1–2 jam

### Task

- [ ] Ganti domain placeholder di:
  - `public/robots.txt`
  - `public/sitemap.xml`
  - `index.html` (`canonical`, `og:url`, `og:image`)
- [ ] Samakan ke domain final production
- [ ] Tambah route app 404 (`path="*"`) bila belum ada

### Kriteria selesai

- Metadata domain benar
- Tidak ada URL placeholder

### File utama

- `public/robots.txt`
- `public/sitemap.xml`
- `index.html`
- `src/App.tsx`

---

## Urutan eksekusi

### Sprint 1 (minggu live)

1. Fase A — Power-up server-only  
2. Fase B — Completion retry  
3. Fase C — Backup  

### Sprint 2

4. Fase D — CI  
5. Fase E — Hardening sisa  

### Sprint 3 (polish)

6. Fase F — A11y  
7. Fase G — SEO  

---

## Definition of Done (setiap fase)

- [ ] Perubahan terpisah per fase (commit jelas)
- [ ] `npm run build` lolos
- [ ] Smoke manual lolos
- [ ] Progress dicatat di `docs/task-progress.md`
- [ ] Deploy staging/production
- [ ] Tidak membuka regresi koin/item/skor

---

## Monitoring 24 jam setelah deploy

Pantau:
- error RPC: `consume_powerup`, `complete_quiz_session`, `purchase_item`, `claim_quest`
- laporan user: item hilang, koin aneh, stuck finish
- spike 5xx Vercel/Supabase

---

## Out of scope

- Redesign UI besar
- Rewrite arsitektur total
- Ganti stack
- Optimasi bundle besar sebelum Fase A–B selesai

---

## Ringkasan prioritas

| Fase | Prioritas | Estimasi | Blokir launch? |
|------|-----------|----------|----------------|
| A Power-up RPC | P1 | 0.5–1 hari | Tidak |
| B Completion retry | P1 | 0.5 hari | Tidak |
| C Backup | P1/P2 | 1–2 jam | Tidak |
| D CI | P2 | 1–2 jam | Tidak |
| E Hardening sisa | P2 | 0.5 hari | Tidak |
| F A11y | P3 | 0.5–1 hari | Tidak |
| G SEO | P3 | 1–2 jam | Tidak |

**Total realistis:** sekitar 3–5 hari kerja, bisa dipotong per fase.

---

## Next action

1. Launch/monitor production  
2. Kerjakan Fase A (`consume_powerup` di semua handler)  
3. Lanjut Fase B (completion retry)  
