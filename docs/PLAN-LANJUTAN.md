# Plan Lanjutan Perbaikan SKDQuest

**Tanggal:** 22 Juli 2026  
**Konteks:** Launch boleh; ini backlog pasca-live  
**Detail penuh utang:** `docs/plan-utang-non-blocker.md`

---

## Prinsip

1. Jangan buka lagi celah ekonomi/skor.
2. Kerjakan berurutan P1 → P2 → P3.
3. Tiap fase: commit terpisah + build lolos + smoke.
4. Backend authoritative; client hanya UI + panggil RPC.

---

## Fase A — Power-up server-only (P1)

**Estimasi:** 0.5–1 hari

### Masalah
Handler power-up di `Quiz.tsx` masih banyak `updateProfile(inventory)` client-side.

### Target
Semua konsumsi item lewat `consume_powerup(session_id, item_id)`.

### Task
- [x] Helper `consumePowerup(sessionId, itemId)` di `src/lib/supabase.ts`
- [x] Update semua handler power-up di `src/pages/Quiz.tsx`
- [x] Efek aktif hanya setelah RPC sukses
- [x] Hapus path mutasi inventory sensitif via `updateProfile` untuk consume
- [x] Toast error + disable tombol saat request

### Done when
- Double-click / 2 tab tidak double-consume
- Stok 0 tidak bisa dipakai

**Status:** ✅ commit `68dcc9b`

---

## Fase B — Completion retry unify (P1)

**Estimasi:** 0.5 hari

### Masalah
Finish quiz antar mode belum seragam; error jaringan bisa bikin UX macet/palsu.

### Target
Satu `finishQuiz()` untuk semua mode.

### Task
- [x] Satukan survival/tryout/normal
- [x] State `isFinishing`, `finishError`, retry
- [x] Navigate result hanya jika ada `result_id`
- [x] Session tetap aktif saat gagal

### Done when
- Offline saat submit → tombol coba lagi
- Tidak ada result palsu

**Status:** ✅ commit `0d921c5`

---

## Fase C — Backup & operasional (P1/P2)

**Estimasi:** 1–2 jam

### Task
- [x] Runbook restore: `docs/backup-restore.md`
- [x] Update `docs/deploy-checklist.md` (backup wajib + jadwal)
- [ ] Aktifkan backup/PITR Supabase di dashboard (manual owner)
- [ ] Set reminder export mingguan jika free tier

### Done when
- Ada jalur restore yang jelas

---

## Fase D — CI formal (P2)

**Estimasi:** 1–2 jam

### Task
- [ ] `.github/workflows/ci.yml`
- [ ] `npm ci` → lint → test → build → audit high
- [ ] (Opsional) branch protection

### Done when
- PR rusak gagal otomatis

---

## Fase E — Hardening sisa (P2)

**Estimasi:** 0.5 hari

### Task
- [x] Progress quest di `complete_quiz_session` (server)
- [x] `consume_powerup` catat `used_powerups` session
- [x] `claim_quest` sentinel 999 + coins_after
- [x] `reset_daily_quests` RPC + Dashboard wire
- [x] Hapus fallback spin/energy mutasi client
- [ ] Apply `supabase/fase-e-hardening.sql` di production (**backup dulu**)
- [ ] RPC potong koin tryout (masih UI-optimistic)

**Status:** code ready; apply DB manual

---

## Fase F — Accessibility (P3)

**Estimasi:** 0.5–1 hari

### Task
- [ ] Skip link
- [ ] `div onClick` → `button`
- [ ] Icon button `aria-label`
- [ ] Semua modal pakai focus trap

---

## Fase G — SEO / domain (P3)

**Estimasi:** 1–2 jam

### Task
- [ ] Domain final di robots/sitemap/canonical/OG
- [ ] Route `*` 404 app

---

## Fase H — Kerapian repo (P3, opsional)

**Estimasi:** 2–4 jam

### Task
- [ ] Putuskan `Soal/*.pdf` (untrack atau tetap legal)
- [ ] Pindahkan/hapus SQL root legacy setelah yakin
- [ ] Rapikan `scripts/` (hapus sekali-pakai / README)
- [ ] Pastikan satu sumber schema kanonis: `supabase/migrations` + `functions/rpc`

---

## Urutan sprint

### Sprint 1 (setelah live)
1. Fase A  
2. Fase B  
3. Fase C  

### Sprint 2
4. Fase D  
5. Fase E  

### Sprint 3
6. Fase F  
7. Fase G  
8. Fase H  

---

## Definition of Done tiap fase

- [ ] Commit jelas
- [ ] `npm run build` lolos
- [ ] Smoke manual lolos
- [ ] Update `docs/task-progress.md` bila perlu
- [ ] Tidak buka regresi koin/item/skor

---

## Next immediate action

Mulai **Fase A**: pasang `consume_powerup` di semua handler power-up `Quiz.tsx`.
