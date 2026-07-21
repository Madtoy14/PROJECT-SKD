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

## ⏳ Fase 1 — Otorisasi backend *(MULAI)*

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1.1 | `daily_claim.sql` — ganti `user_id` param → `auth.uid()` | ⬜ | — |
| 1.2 | `spin_wheel.sql` — ganti `user_id` param → `auth.uid()` | ⬜ | — |
| 1.3 | Cabut UPDATE langsung kolom sensitif profil (coins, xp, level, inventory) | ⬜ | — |
| 1.4 | Buat view profil publik (field leaderboard minimum) | ⬜ | — |
| 1.5 | Ganti `select('*')` di client → daftar kolom minimum | ⬜ | — |
| 1.6 | Edge `expire-duels` — fail closed, wajib bearer secret, POST only | ⬜ | — |
| 1.7 | Audit `SECURITY DEFINER` RPC — set search_path, validasi caller | ⬜ | — |

---

## ⬜ Fase 2 — Server-authoritative scoring & ekonomi

| # | Task | Status | Commit |
|---|------|--------|--------|
| 2.1 | RPC `start_quiz` — verifikasi paket, pilih soal, debit atomik | ⬜ | — |
| 2.2 | RPC `complete_quiz_session` — terima jawaban, hitung server-side | ⬜ | — |
| 2.3 | RPC `purchase_item` — harga dari katalog server, tolak item asing | ⬜ | — |
| 2.4 | RPC `sell_item` — jual dari katalog, hapus parameter `original_cost` | ⬜ | — |
| 2.5 | Hapus logger transaksi client (double logging) | ⬜ | — |

---

## ⬜ Fase 3 — Transaksi atomik

| # | Task | Status | Commit |
|---|------|--------|--------|
| 3.1 | RPC `consume_powerup` — lock, stok, limit | ⬜ | — |
| 3.2 | RPC `claim_quest` — lock, unique claim, validasi progress | ⬜ | — |
| 3.3 | Debit tryout → gabung ke `start_quiz` | ⬜ | — |
| 3.4 | Test request paralel (double spend / double claim) | ⬜ | — |

---

## ⬜ Fase 4 — XSS + PWA cache + security headers

| # | Task | Status | Commit |
|---|------|--------|--------|
| 4.1 | Hapus `dangerouslySetInnerHTML` mentah | ⬜ | — |
| 4.2 | Jangan cache API Supabase di SW | ⬜ | — |
| 4.3 | Bersihkan Cache Storage saat logout | ⬜ | — |
| 4.4 | Tambah security headers Vercel (CSP, frame-ancestors, nosniff, dll) | ⬜ | — |

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
| ✅ Selesai | 18 task (Fase 0 + -1) |
| ⬜ Belum | ~40 task (Fase 1–10) |

---

*Update terakhir: commit `77e8cda` — cleanup repo selesai*
