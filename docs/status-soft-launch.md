# Status Akhir — Soft Launch SKDQuest

**Tanggal:** 31 Jul 2026
**Repo:** `Madtoy14/PROJECT-SKD` · branch `master` @ `a36bd99` + working tree
**Prod:** https://skdquest.vercel.app

---

## 1. Keputusan

> **SOFT LAUNCH / CLOSED BETA: SIAP**
> **PUBLIC MARKETING LAUNCH: TUNDA** (sampai Sprint 1 selesai + smoke ulang)

---

## 2. Yang sudah beres (DONE, terverifikasi)

| # | Item | Bukti |
|---|------|-------|
| D1 | Build production | `npm run build` exit 0 (tsc + vite + PWA) |
| D2 | Test suite | 13/13 pass (`npm run test` exit 0) |
| D3 | Lint | 47 err + 13 warn (CI continue-on-error, non-blocker) |
| D4 | Beforeunload JWT | `QuizSessionContext` pakai user access_token (bukan anon) → RLS `auth.uid()` aman |
| D5 | inject.html | Dihapus; Vercel platform 404 murni (200→404) |
| D6 | Security headers | Prod: nosniff, X-Frame-Options DENY, HSTS, Permissions-Policy |
| D7 | Supabase RLS/RPC | Fix keamanan ekonomi terpasang (rate-limit, upload magic bytes, 15MB cap) |
| D8 | Login screen baru | `auth_bg.webp` diganti ilustrasi SKD (1400px WebP q62, 188KB) |
| D9 | Deploy | Prod live: Last-Modified 31 Jul, FE terbaru |
| D10 | Smoke manual (user) | Login Google, claim, spin, shop, survival 3 energi, finish quiz, logout, hard refresh mid-quiz → OK |
| D11 | Realtime PvP ranks | liveRanks + derived myRankPosition (Quiz.tsx) |
| D12 | Result page resilience | Tanpa attemptId → error state langsung, tidak loading hang |
| D13 | Top-up system (Antigravity) | `supabase/topup-system.sql` + TopUpModal server-validated & admin approval |
| D14 | Settings polish | Password set/change Google-only + security page |
| D15 | WrongBook cleanup | Hapus state unused |

## 3. Backlog Sprint 1 (P1 — tidak block soft launch)

| ID | Bug | Dampak | Target |
|----|-----|--------|--------|
| P1-1 | Energi habis mid-session (#12) | Gate energi muncul lagi setelah bayar (first-answer vs entry) | Sprint 1 |
| P1-2 | Timer reset pada hard refresh | Timer quiz tidak survive reload → user kehilangan progres waktu | Sprint 1 |
| P1-3 | PvP skor akhir = client snapshot | Skor tidak diverifikasi server → leaderboard bisa salah | Sprint 1 |

## 4. Backlog lanjutan (P2/P3 — non-blocker)

| ID | Item | Catatan |
|----|------|---------|
| P2-1 | Sentry/error tracking di ErrorBoundary | TODO line 33 |
| P2-2 | Test coverage RLS/integration | Sekarang hanya scoring unit |
| P2-3 | Lint debt React Compiler | ~47 error, non-blocker |
| P3-1 | Mobile UI polish residual | Wave C |
| P3-2 | SEO/meta residual | — |
| P3-3 | Repo hygiene | hapus `login screen.png` source (4.8MB) dari tracking |

## 5. Ops (dashboard Supabase/Vercel, bukan PR)

| ID | Item |
|----|------|
| O1 | Supabase: email confirm + redirect URL |
| O2 | Apply `fase-e-hardening.sql` di prod (backup dulu) |
| O3 | Enable backup/PITR |
| O4 | `expire-duels` cron + CRON_SECRET |
| O5 | Branch protection |
| O6 | Custom domain |

## 6. Resiko tersisa (diterima untuk soft launch)

- Lint debt (tidak mempengaruhi runtime)
- Test coverage tipis (smoke manual jadi pengganti sementara)
- 3 bug P1 di atas (tracked, bukan regresi baru)

---

*Dokumen ini SSOT. File terkait: `docs/daftar-perbaikan.md`, `docs/perbaikan-wave-a.md`, `docs/deploy-checklist.md`.*
