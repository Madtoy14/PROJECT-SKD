# Task Progress — SKD_WEB Remediation

**Repo:** `Madtoy14/PROJECT-SKD` (master)  
**Mulai:** 21 Jul 2026 | **Update terakhir:** 21 Jul 2026

---

## ✅ Fase 0 — Insiden token *(SELESAI)*

| # | Task | Status | Commit |
|---|------|--------|--------|
| 0.1 | Revoke sesi/refresh token di Supabase Dashboard | ✅ user | — |
| 0.2 | Hapus `public/inject.html` | ✅ | `04eba73` |
| 0.3 | Hapus `audit_check_token.py` & `audit_check_token2.py` | ✅ | `04eba73` |
| 0.4 | Hapus `dist/inject.html` (lokal) | ✅ auto | — |
| 0.5 | Update `.gitignore` — ignore inject.html | ✅ | `04eba73` |
| 0.6 | Commit terpisah `security: remove leaked session` | ✅ | `04eba73` |
| 0.7 | Push & purge CDN/SW cache | ⏳ nanti | — |

---

## ✅ Fase -1 — Kebersihan repo *(SELESAI)*

| # | Task | Status | Commit |
|---|------|--------|--------|
| -1.1 | Hapus script patch sekali pakai (`read_lines.cjs`, `update_quiz*.cjs`, `update_supabase.cjs`) | ✅ | `77e8cda` |
| -1.2 | Hapus `audit_unused_imports.py` | ✅ | `77e8cda` |
| -1.3 | Hapus aset nol referensi (hero.png, react.svg, vite.svg, auth_bg.png, avatar_pdh.png) | ✅ | `77e8cda` |
| -1.4 | Hapus data soal legacy (`*_new.json`) | ✅ | `77e8cda` |
| -1.5 | Pindah docs root ke `docs/` + archive | ✅ | `77e8cda` |
| -1.6 | Rename `rencana perbaikan.md` → `docs/remediation-plan.md` | ✅ | `77e8cda` |
| -1.7 | Hapus `public/vercel.json` duplikat | ✅ | `77e8cda` |
| -1.8 | Hapus `public/manifest.json` (pakai inject vite-plugin-pwa) | ✅ | `77e8cda` |
| -1.9 | Hapus `public/og-image.svg` (tak dipakai) | ✅ | `77e8cda` |
| -1.10 | Update `index.html` — hapus link manifest manual | ✅ | `77e8cda` |
| -1.11 | Perluas `.gitignore` (coverage, .vite, *.tsbuildinfo, temp, Soal/, dll) | ✅ | `77e8cda` |
| -1.12 | Rapikan SQL → migration berurutan | ⏳ nanti | — |
| -1.13 | Audit `scripts/` — pertahankan yg reproducible | ⏳ nanti | — |

---

## ✅ Fase 1 — Otorisasi backend *(SELESAI)*

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1.1 | `daily_claim.sql` — ganti `user_id` param → `auth.uid()` | ✅ | `6b71ec5` |
| 1.2 | `spin_wheel.sql` — ganti `user_id` param → `auth.uid()` | ✅ | `6b71ec5` |
| 1.3 | Cabut UPDATE langsung kolom sensitif profil + RPC `update_profile_public` | ✅ | `6b71ec5` |
| 1.4 | Buat view `public_profile_view` (field leaderboard minimum) | ✅ | `6b71ec5` |
| 1.5 | Edge `expire-duels` — fail closed, wajib bearer secret, POST only | ✅ | `b62afe9` |
| 1.6 | Audit `SECURITY DEFINER` RPC — set search_path, validasi caller | ⏳ | — |

---

## ✅ Fase 2 — Server-authoritative scoring & ekonomi *(SELESAI)*

| # | Task | Status | Commit |
|---|------|--------|--------|
| 2.1 | RPC `purchase_item` — hanya terima `item_id` + `quantity`; harga dari katalog server | ✅ | `f126cfd` |
| 2.2 | RPC `sell_item` — hanya terima `item_id`; reward dari katalog server | ✅ | `f126cfd` |
| 2.3 | RPC `complete_quiz_session` — hitung skor/koin/XP/accuracy server-side, idempotent | ✅ | `0eb511a` |
| 2.4 | Hapus logger transaksi client (double logging) | ⏳ | — |

---

## ✅ Fase 3 — Transaksi atomik *(SELESAI)*

| # | Task | Status | Commit |
|---|------|--------|--------|
| 3.1 | RPC `consume_powerup` — atomic decrement, validasi ownership session + stok | ✅ | `b101458` |
| 3.2 | RPC `claim_quest` — atomic claim, validasi progress server-side, unique claim guard | ✅ | `b101458` |
| 3.3 | RPC `consume_energy` — atomic deduct, `auth.uid()` (bukan `user_id` param) | ✅ | `b101458` |
| 3.4 | Debit tryout → gabung ke `start_quiz` (harus dimulai dari Fase 2.1) | ⏳ | — |

---

## ✅ Fase 4 — XSS + PWA cache + security headers *(SELESAI)*

| # | Task | Status | Commit |
|---|------|--------|--------|
| 4.1 | Ganti `dangerouslySetInnerHTML` → text node di Quiz.tsx (2 lokasi) & ReviewDetail.tsx (2 lokasi) | ✅ | `3ad7761` |
| 4.2 | Hapus runtime caching Supabase API (NetworkOnly) | ✅ | `3ad7761` |
| 4.3 | Bersihkan Cache Storage saat logout | ✅ | `3ad7761` |
| 4.4 | Tambah security headers Vercel (nosniff, DENY, Referrer-Policy, Permissions-Policy) | ✅ | `3ad7761` |

---

## ⬜ Fase 5 — Correctness kuis

| # | Task | Status | Commit |
|---|------|--------|--------|
| 5.1 | Autosave — ganti blocking ref → dirty queue + flush retry | ⬜ | — |
| 5.2 | Completion — satu handler, error = retry, jangan navigasi palsu | ⬜ | — |
| 5.3 | Conditional hook di `App.tsx` — pindahkan `useState` | ⬜ | — |

---

## ⬜ Fase 6 — Migration + Test + CI

| # | Task | Status | Commit |
|---|------|--------|--------|
| 6.1 | Konsolidasi SQL lepas → migration timestamped | ⬜ | — |
| 6.2 | Unit test scoring / reward / RPC ekonomi | ⬜ | — |
| 6.3 | Integration test RLS lintas-user | ⬜ | — |
| 6.4 | CI workflow: `npm ci → lint → test → build → audit` | ⬜ | — |

---

## ⬜ Fase 7 — Upgrade deps + lint cleanup

| # | Task | Status | Commit |
|---|------|--------|--------|
| 7.1 | Upgrade Vite ke patch aman | ⬜ | — |
| 7.2 | Ganti `any` → `unknown` + narrowing | ⬜ | — |
| 7.3 | Hapus unused vars/imports | ⬜ | — |
| 7.4 | Fix effect deps & immutability | ⬜ | — |
| 7.5 | Aktifkan `noUnusedLocals` & `noUnusedParameters` | ⬜ | — |

---

## ⬜ Fase 8 — Performa & PWA UX

| # | Task | Status | Commit |
|---|------|--------|--------|
| 8.1 | Scoped `QuizSessionProvider` ke route quiz/result | ⬜ | — |
| 8.2 | Dynamic import JSON materi per modul | ⬜ | — |
| 8.3 | Satukan manifest PWA (plugin only) | ✅ | Fase -1 |
| 8.4 | CTA install hanya setelah `beforeinstallprompt` | ⬜ | — |

---

## ⬜ Fase 9 — Accessibility

| # | Task | Status | Commit |
|---|------|--------|--------|
| 9.1 | Modal: `role="dialog"`, focus trap, Escape | ⬜ | — |
| 9.2 | `<div>` clickable → `<button>` | ⬜ | — |
| 9.3 | Label input dengan `htmlFor`/`id` | ⬜ | — |
| 9.4 | Skip link, heading hierarchy | ⬜ | — |

---

## ⬜ Fase 10 — Dokumentasi & SEO

| # | Task | Status | Commit |
|---|------|--------|--------|
| 10.1 | `.env.example` | ⬜ | — |
| 10.2 | Node version pin (`.nvmrc` / `engines`) | ⬜ | — |
| 10.3 | Koreksi README (React 18 → 19, `npm ci`) | ⬜ | — |
| 10.4 | Deploy / rollback / backup / monitoring docs | ⬜ | — |
| 10.5 | robots.txt, sitemap, canonical (bila perlu) | ⬜ | — |

---

## Ringkasan

| Status | Jumlah |
|--------|--------|
| ✅ Selesai | 17 task (Fase 0, -1, 1, 2, 3) |
| ⏳ Sedang | 1 task (Fase 4) |
| ⬜ Belum | ~32 task (Fase 5–10) |

---

*Update terakhir: commit `b101458` — Fase 3 transaksi atomik selesai*