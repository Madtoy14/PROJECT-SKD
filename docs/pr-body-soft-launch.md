# PR — Soft Launch SKDQuest

## Ringkasan
Soft launch / closed beta SKDQuest. Fix auth reliability + keamanan sebelum go-live, plus perombakan aset login.

## Perubahan utama

### 🔐 Auth & session (critical)
- **`src/context/QuizSessionContext.tsx`** — beforeunload handler pakai **user access_token (JWT)** bukan anon key. Sebelumnya mark-interrupted gagal karena RLS `quiz_sessions` (`auth.uid() = user_id`). Tanpa token → skip, tidak PATCH dengan anon.
- **`vercel.json`** — drop legacy `routes`, rewrite exclude inject; platform 404 murni.

### 🖼️ Aset
- **`src/assets/auth_bg.webp`** — ganti ilustrasi login screen baru (tema ruang kelas SKD, 1400×1400 WebP q62, 188KB). Tanpa perubahan kode (import path sama).

### 🧹 Polishing (dari review)
- `src/pages/Quiz.tsx` — derived `myRankPosition` dari liveRanks (buang effect + state redundant)
- `src/pages/Result.tsx` — tanpa `attemptId` langsung error state, tidak loading hang
- `src/pages/Settings.tsx` / `src/pages/WrongBook.tsx` — cleanup state unused
- `src/components/modals/TopUpModal.tsx` + `supabase/topup-system.sql` — top-up server-validated & admin approval (manual: apply SQL ke Supabase setelah backup)

## Verifikasi
- ✅ `npm run test` — 13/13 pass
- ✅ `npm run build` — exit 0 (tsc + vite + PWA)
- ✅ Smoke manual prod: login Google, claim, spin, shop, survival 3 energi, finish quiz, logout, hard refresh mid-quiz
- ✅ Prod headers: nosniff / DENY / HSTS / Permissions-Policy
- ⚠️ Lint: 47 err + 13 warn (CI continue-on-error, non-blocker)

## Backlog Sprint 1 (bukan blocker PR ini)
- P1-1 Energi habis mid-session (gate muncul lagi setelah bayar)
- P1-2 Timer reset pada hard refresh
- P1-3 PvP skor akhir masih client snapshot

## Catatan
- Soft launch OK, public marketing launch menyusul setelah Sprint 1 + smoke ulang.
- Jangan commit `src/assets/login screen.png` (source 4.8MB) — hanya webp yang di-track.
