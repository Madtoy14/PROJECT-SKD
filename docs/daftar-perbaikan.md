# Daftar Semua Perbaikan SKDQuest

**Update:** 31 Jul 2026  
**Repo:** `SKD_WEB` · branch `master` @ `a36bd99`  
**Prod:** https://skdquest.vercel.app  
**Tujuan file:** backlog single source untuk kamu kerjakan di Antigravity / Hermes.  
**Status launch:** soft launch / closed beta OK · public marketing belum (manual smoke user belum)

---

## Legenda status

| Status | Arti |
|---|---|
| DONE | Sudah di kode + commit (mungkin masih butuh smoke manual) |
| CODE DONE | Kode merapikan, apply DB / config owner masih pending |
| OPEN | Belum dikerjakan / residual |
| OPS | Bukan code — dashboard / config / manual |
| VERIFY | Fix ada, wajib dibuktikan manual di prod |

---

## 0) Sudah beres (jangan dikerjakan ulang)

| ID | Item | Commit / bukti | Status |
|---|---|---|---|
| D1 | Security RPC ekonomi + scoring server-side | remediation + `apply-all-security-rpcs.sql` | DONE |
| D2 | inject.html token leak | hapus file + rewrite exclude → 404 | DONE (`a36bd99`) |
| D3 | Headers security (nosniff, DENY, HSTS, Permissions-Policy) | `vercel.json` | DONE |
| D4 | Wave A1 energy gate pre-session only (#12) | `c74e711` · gate `!activeSession?.id && !isEnergyDeducted` | DONE / VERIFY |
| D5 | Wave A2 session recovery (#11 path) | `c74e711` | DONE / VERIFY |
| D6 | Wave A3 timer restore refresh (#10) | `c74e711` | DONE / VERIFY |
| D7 | Wave A4 / login loop (#14) | `c296225` | DONE / VERIFY |
| D8 | Wave B social follow/rival mutual | `ad3a52b` | DONE / VERIFY |
| D9 | Wave C mobile polish | `ad3a52b` | DONE / VERIFY |
| D10 | beforeunload JWT user (bukan anon) | `a36bd99` · `accessTokenRef` | DONE / VERIFY |
| D11 | Auth email/password + forgot | `241d89f` | DONE |
| D12 | Settings set/change password Google-only | `0501931` | DONE / VERIFY |
| D13 | Power-up lewat `consume_powerup` | `68dcc9b` (PLAN-LANJUTAN Fase A) | DONE |
| D14 | Completion retry unify | `0d921c5` (PLAN-LANJUTAN Fase B) | DONE |
| D15 | CI workflow | `.github/workflows/ci.yml` (lint continue-on-error) | CODE DONE |
| D16 | Unit test scoring | 13/13 Vitest | DONE |
| D17 | Tryout package model + purchase | series tryout commits | DONE |

---

## 1) WAJIB SEKARANG (proses / verifikasi)

| ID | Item | Severity | Owner | Status | Cara cek | File / tempat |
|---|---|---|---|---|---|---|
| V1 | **Manual smoke prod full flow** | P0 proses | User | OPEN | Login Google → daily claim → spin → shop beli/jual → quest claim → survival energi 3 (jawab ≥3 benar, **tidak** Energi Habis) → finish → logout → clear SW | `docs/deploy-checklist.md` §D |
| V2 | **Smoke recover mid-quiz** | P0 proses | User | OPEN | Mulai survival → jawab 1–2 → hard refresh → sesi recover, timer/skor masuk akal | `Quiz.tsx`, `QuizSessionContext.tsx` |
| V3 | **Smoke beforeunload interrupt** | P0 proses | User | OPEN | Mulai quiz → tutup tab → buka lagi → session `interrupted` / recover OK (RLS + JWT) | `QuizSessionContext.tsx` beforeunload |
| V4 | **Smoke settings password** | P1 proses | User | OPEN | Google-only user set password di Settings → logout → login email+pass | Settings + Auth |
| V5 | **Smoke social follow/rival** | P1 proses | User | OPEN | Follow A→B, B→A → mutual rival; count pengikut sinkron; Liga pass CTA | Profile, Leaderboard, PlayerProfileModal |

---

## 2) OPEN — residual product / design (code)

| ID | Item | Severity | Status | Root cause singkat | Arah fix | File |
|---|---|---|---|---|---|---|
| R1 | **Energi potong first-answer, bukan entry** | P1 desain | OPEN | Q1 partial: gate mid-session aman, tapi charge masih di first answer → race edge | Putuskan final: potong di `createSession`/entry **atau** first answer; jangan double; pastikan 1×/sesi | `Quiz.tsx`, `Dashboard.tsx`, RPC `consume_energy` |
| R2 | **PvP skor akhir masih snapshot client** | P1 | OPEN | Dummy liga hilang; skor final belum pure DB/duels | Server-authoritative duel score; write ke `duels` / complete path server | PvP flow, duels schema, complete session |
| R3 | **Power-up residual path** | P2 | OPEN (audit ulang) | Masih ada kemungkinan path optimistic di edge case | Re-audit semua handler di Quiz; efek **hanya** setelah RPC OK | `Quiz.tsx`, `supabase` helpers |
| R4 | **Sentry / error tracking** | P2 | OPEN | ErrorBoundary TODO saja | Wire Sentry (atau LogRocket) + DSN env | `ErrorBoundary.tsx` |
| R5 | **Lint debt React Compiler / set-state-in-effect** | P2 | OPEN | ~47 error CI continue-on-error | Fix bertahap App/Quiz/Result/Settings; jangan blok ship | lint CI |
| R6 | **Test coverage tipis** | P2 | OPEN | Hanya scoring unit | Tambah unit/integration: energy gate, session recover, RPC client mock | `src/__tests__/` |
| R7 | **Residual `profiles.friends` type** | P3 | OPEN | UI sudah tabel `friends`; type legacy | Bersihkan type dual-write | `supabase` types, Profile |
| R8 | **Wave C viewport aneh residual** | P3 | OPEN | Polish sisa HP | CSS only, PR terpisah | Dashboard/Profile mobile |
| R9 | **SEO domain final** | P3 | OPEN | Masih `skdquest.vercel.app` di robots/sitemap/OG | Ganti domain custom + canonical | `robots.txt`, `sitemap.xml`, meta |
| R10 | **A11y lanjutan** | P3 | OPEN | Skip-link, div→button, aria-label icon, focus trap semua modal | Fase F PLAN-LANJUTAN | components + pages |
| R11 | **Route `*` 404 app** | P3 | OPEN | SPA fallback | Dedicated NotFound page | router |
| R12 | **Repo kerapian** | P3 opsional | OPEN | SQL root legacy, scripts sekali-pakai | Fase H: satu sumber schema kanonis | `supabase/`, root SQL, `scripts/` |

---

## 3) OPEN — ops / Supabase / Vercel (bukan PR kode)

| ID | Item | Severity | Status | Action |
|---|---|---|---|---|
| O1 | Supabase **Email Confirm** + redirect URL | P0 ops auth | OPEN | Dashboard Auth: Site URL + redirect = prod URL; email confirm policy sesuai desain |
| O2 | Apply `supabase/fase-e-hardening.sql` di **production** | P1 | CODE DONE / OPEN apply | **Backup dulu** → SQL Editor run → verifikasi function |
| O3 | Backup / **PITR** Supabase | P1 ops | OPEN | Pro: nyalakan PITR; Free: export mingguan `profiles`, `quiz_results`, transactions |
| O4 | Edge Function **`expire-duels`** + `CRON_SECRET` | P1 ops | OPEN | Deploy function + secret di prod; pastikan cron jalan |
| O5 | RPC potong koin tryout (masih UI-optimistic?) | P1 | OPEN audit | Cek apakah masih client; kalau ya → RPC server |
| O6 | Branch protection + CI wajib hijau (kecuali lint policy) | P2 | OPEN | GitHub settings |
| O7 | Domain custom + DNS | P3 | OPEN | Vercel domain |
| O8 | Apply `supabase/topup-system.sql` & referensi `supabase/admin-topup-queries.sql` | P0 ops | CODE DONE / OPEN apply | Run `topup-system.sql` di SQL Editor, gunakan `admin-topup-queries.sql` untuk operasional approval |

---

## 4) Smoke bug list asli user (14 item) — mapping status

Sumber: `docs/plan-smoke-bugfix-diskusi.md`

| # | Deskripsi | Wave | Status kode | Status verifikasi |
|---|---|---|---|---|
| 1 | Text streak HP proporsi | C | DONE (`ad3a52b`) | VERIFY |
| 2 | Pengikut/mengikut / request | B | DONE (mutual model) | VERIFY |
| 3 | Nickname HP proporsi | C | DONE | VERIFY |
| 4 | Statistik karir proporsi | C | DONE | VERIFY |
| 5 | Status kesiapan TWK/TIU/TKP | C | DONE | VERIFY |
| 6 | Daftar rival bug | B | DONE mutual=rival | VERIFY |
| 7 | Cari teman UI | C | DONE | VERIFY |
| 8 | Liga → profil → tambah teman | B | DONE pass handler | VERIFY |
| 9 | Follow → mutual rival | B | DONE | VERIFY |
| 10 | Refresh/pindah soal timer reset | A | DONE (`c74e711`) | VERIFY |
| 11 | Survival TKP gagal kirim / sesi tidak ditemukan | A | DONE path + JWT `a36bd99` | VERIFY |
| 12 | Survival energi 3 → Energi Habis mid | A | DONE gate pre-session | VERIFY |
| 13 | “Masih banyak bug” | — | skip noise | — |
| 14 | Login loop | A/auth | DONE (`c296225`) | VERIFY |

**Intinya:** hampir semua item smoke sudah **ada fix di master**. Yang kurang = **kamu buktikan di prod** (kolom VERIFY).

---

## 5) Urutan kerja disarankan (Antigravity / Hermes)

### Sprint 0 — hari ini (tanpa code)
1. V1–V5 manual smoke di https://skdquest.vercel.app  
2. Catat fail konkret (screenshot + langkah) di issue / chat  
3. O1 cek Auth redirect URL Supabase

### Sprint 1 — residual product (setelah smoke)
1. **R1** finalisasi potong energi entry vs first answer  
2. **R2** PvP skor server-side  
3. **O2** apply fase-e SQL (backup dulu)  
4. **O4** expire-duels cron  
5. **O5** audit potong koin tryout

### Sprint 2 — quality
1. R4 Sentry  
2. R5 lint debt bertahap  
3. R6 test coverage energy/session  
4. O3 backup jadwal  
5. O6 branch protection

### Sprint 3 — polish
1. R8–R12 a11y / SEO / 404 / repo kerapian

---

## 6) Pembagian kerja: Hermes vs Antigravity

| Siapa | Kerjakan |
|---|---|
| **Kamu (manual)** | Semua **V\*** smoke, **O\*** dashboard Supabase/Vercel, putusan desain R1 |
| **Antigravity** | Coding residual **R1–R12**, apply SQL O2 bila punya akses, PR kecil per item |
| **Hermes (sesi ini)** | Sudah: JWT beforeunload + inject 404 + deploy. Next: bantu kalau ada fail smoke konkret / implement R\* atas permintaan |

**Jangan** kerjakan ulang D1–D17 kecuali smoke membuktikan regresi.

---

## 7) Definition of Done per item residual

- [ ] Root cause dipahami (bukan symptom patch)  
- [ ] Server authoritative untuk koin/energi/skor/item  
- [ ] `npm run test` + `npm run build` lolos  
- [ ] Smoke manual path terkait lolos  
- [ ] Commit kecil, conventional message  
- [ ] Update checklist ini (centang status)

---

## 8) File referensi

| File | Isi |
|---|---|
| `docs/plan-smoke-bugfix-diskusi.md` | 14 bug smoke + Q1–Q4 + Wave A/B/C |
| `docs/audit-post-wave-abc.md` | residual post-wave (sebagian sudah usang — JWT sudah fixed) |
| `docs/plan-utang-non-blocker.md` | backlog pasca-launch detail |
| `docs/PLAN-LANJUTAN.md` | fase A–H (sebagian checklist usang vs reality) |
| `docs/deploy-checklist.md` | deploy + smoke + backup |
| `docs/status-akhir-remediation.md` | security remediation done |
| `docs/perbaikan-wave-a.md` | draft Wave A (banyak item sudah DONE di master — utamakan daftar ini) |
| `docs/plan-settings-password-diskusi.md` | settings password |

---

## 9) Catatan jujur

- **Kode Wave A/B/C + JWT + settings sudah di master.**  
- **Launch readiness bottleneck = manual smoke + ops Supabase**, bukan “masih 14 bug terbuka di kode”.  
- Residual code terbesar yang masih benar-benar product debt: **R1 energi entry**, **R2 PvP skor DB**, **O2/O4 ops**.  
- File `docs/perbaikan-wave-a.md` agak usang (masih bilang P0 open padahal A1–A4 sudah commit). **Pakai file ini (`daftar-perbaikan.md`) sebagai SSOT.**

---

**Handoff Antigravity:** mulai dari Sprint 0 (smoke). Kalau fail, buka ID V/R terkait di sini, jangan re-implement D\*.
