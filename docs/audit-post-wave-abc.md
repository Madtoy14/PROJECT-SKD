# Audit singkat — post Wave A/B/C

**Tanggal:** 24 Jul 2026  
**Repo:** SKD_WEB · `master` @ `ad3a52b`  
**Prod:** https://skdquest.vercel.app  
**Status ship:** CI success, prod HTTP 200. Smoke plan A/B/C + auth loop di kode; **manual smoke user belum**.

---

## Urgent / wajib (proses)

| # | Item | Kenapa |
|---|---|---|
| 1 | Manual smoke A/B di prod | Fix ada, belum dibuktikan: survival energi 3, refresh timer, follow/rival, login loop |
| 2 | Supabase Email Confirm / redirect URL | Auth email sudah ada; salah config = login gagal di prod (ops, bukan code) |

---

## Hampir wajib (bug nyata, belum P0 gameplay)

| # | Item | Severity | Catatan |
|---|---|---|---|
| 1 | `beforeunload` pakai **anon key** sbg `Authorization` | P1 | `QuizSessionContext.tsx` ~122 — harus JWT user. Tanpa itu mark `interrupted` sering gagal RLS → recover timer #10 tidak andal |
| 2 | Energi masih potong **first answer**, bukan entry | P1 desain | Gate mid-session sudah aman; Q1 belum full. Race `consumeEnergy` edge |
| 3 | PvP skor akhir masih **snapshot client** | P1 | Dummy liga hilang; A selesai dulu tetap stale. Butuh `duels`/DB |

---

## Boleh nunggu

- Lint debt React Compiler / hooks (CI `continue-on-error`)
- Sentry di ErrorBoundary
- Residual `profiles.friends` type (UI sudah ke tabel `friends`)
- Wave C polish viewport aneh

---

## Open topic (diskusi berikutnya)

- **Google-only user:** tidak punya password → forgot password / email login gagal set password.
- **Settings menu di web:** tempat set/ubah password, link email, preferensi.

---

## Kesimpulan

- **Wajib sekarang:** smoke manual prod  
- **Wajib next code (kecil):** JWT di `beforeunload`  
- **Bukan blocker ship:** PvP DB score, potong energi di entry, lint debt  
