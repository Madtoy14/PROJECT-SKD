# Rencana Perbaikan Sistem SKD_WEB

Tanggal audit: 20 Juli 2026  
Status awal: build lulus; lint gagal; risiko produksi tinggi.

## Sasaran

1. Menutup kebocoran sesi dan akses lintas pengguna.
2. Memindahkan scoring, entitlement, dan ekonomi dari client ke server.
3. Menjamin transaksi atomik dan hasil kuis konsisten.
4. Menetapkan migration, test, dan CI yang dapat direproduksi.
5. Memperbaiki performa, accessibility, PWA, dokumentasi, lalu SEO.

## Aturan pelaksanaan

- Kerjakan per fase; jangan gabungkan seluruh perubahan dalam satu deploy.
- Backup Supabase sebelum perubahan schema, policy, function, atau data.
- Uji migration pada environment staging.
- Deploy backend lebih dahulu jika kompatibel dengan client lama; deploy client setelahnya.
- Pertahankan rollback script untuk setiap migration.
- Jangan menonaktifkan lint rule untuk meloloskan gate.

---

## Fase -1 — Kebersihan repository dan struktur folder

**Prioritas:** P0 untuk file sensitif; P2 untuk kerapian  
**Estimasi:** 1–2 hari, tidak termasuk konsolidasi migration

### Sasaran struktur

```text
SKD_WEB/
├── docs/
│   ├── design-system.md
│   ├── implementation.md
│   ├── remediation-plan.md
│   └── archive/
├── public/
│   ├── favicon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── og-image.png
├── scripts/                  # hanya script reproducible
├── src/
│   ├── assets/
│   ├── calculations/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   └── types/
├── supabase/
│   ├── functions/
│   └── migrations/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── vercel.json
└── vite.config.ts
```

### -1.1 Hapus dan untrack file sensitif

- [ ] Hapus `public/inject.html`; revoke token dan bersihkan riwayat Git sesuai Fase 0.
- [ ] Hapus `audit_check_token.py`.
- [ ] Hapus `audit_check_token2.py`.
- [ ] Pastikan tidak ada token, session, cookie, private key, atau PII pada tracked files dan riwayat Git.
- [ ] Tambahkan pola pencegahan `public/inject.html` ke `.gitignore`.

### -1.2 Hapus script patch sekali pakai

Verifikasi hasil patch sudah berada pada source, lalu hapus:

- [ ] `read_lines.cjs`
- [ ] `update_quiz1.cjs`
- [ ] `update_quiz2.cjs`
- [ ] `update_supabase.cjs`

Script berbasis pencarian/penggantian sekali pakai tidak dipindahkan ke `scripts/`.

### -1.3 Audit folder `scripts/`

- [ ] Periksa seluruh `append_*.cjs` dan `fix_question_scores.cjs`.
- [ ] Hapus script migrasi data yang sudah selesai dan tidak reproducible.
- [ ] Pertahankan hanya generator/importer yang masih digunakan.
- [ ] Ganti nama bernomor seperti `append_tkp2.cjs` berdasarkan fungsi sebenarnya.
- [ ] Tambahkan `scripts/README.md` hanya bila lebih dari satu script dipertahankan.
- [ ] Setiap script yang dipertahankan harus mendokumentasikan input, output, idempotency, dan perintah eksekusi.

### -1.4 Hapus aset tanpa referensi

Aset berikut terverifikasi tidak diimpor runtime:

- [ ] `src/assets/auth_bg.png`
- [ ] `src/assets/avatar_pdh.png`
- [ ] `src/assets/hero.png`
- [ ] `src/assets/react.svg`
- [ ] `src/assets/vite.svg`

Pertahankan `auth_bg.webp` dan `avatar_pdh.webp` yang digunakan runtime. Jalankan build setelah penghapusan.

### -1.5 Tetapkan sumber data soal kanonis

Sumber runtime saat ini:

- `src/data/questions/twk.json`
- `src/data/questions/tiu.json`
- `src/data/questions/tkp.json`

Pekerjaan:

- [ ] Verifikasi `twk_new.json`, `tiu_new.json`, dan `tkp_new.json` hanya staging/legacy; hapus bila benar.
- [ ] Verifikasi `src/data/soal.ts` tidak digunakan; hapus bila benar.
- [ ] Pindahkan tipe `Soal` dari `src/data/soal_tryout.ts` ke `src/types/question.ts`.
- [ ] Ubah import `src/data/tryout_packages.ts` ke tipe baru.
- [ ] Hapus dataset `src/data/soal_tryout.ts` setelah tidak memiliki consumer.
- [ ] Dokumentasikan apakah JSON lokal adalah fallback resmi atau hanya seed/import source.
- [ ] Hindari dua sumber data kanonis antara JSON lokal dan Supabase.

### -1.6 Putuskan status dokumen PDF

File:

- `Soal/CAT SKD 07 - 2526.pdf`
- `Soal/Kunci CAT SKD 07 - 2526.pdf`

- [ ] Verifikasi hak distribusi dokumen.
- [ ] Jika hanya input lokal, pindahkan ke storage di luar repository dan ignore `/Soal/`.
- [ ] Jika memang artefak proyek yang legal dan perlu versioning, pertahankan tracked.
- [ ] Git LFS belum diperlukan untuk ukuran saat ini; gunakan hanya bila koleksi membesar.

### -1.7 Rapikan dokumentasi root

Pertahankan di root:

- `README.md`
- file package/build/lint/TypeScript/Vercel
- `.gitignore`
- `.env.example`

Pindahkan dokumen aktif ke `docs/`:

- [ ] `DESIGN_SYSTEM.md`
- [ ] `IMPLEMENTATION_GUIDE.md`
- [ ] `COMPETITOR_RESEARCH.md`
- [ ] `RANCANGAN_SHOP.md`
- [ ] `QUIZ_AUTOSAVE_INTEGRATION.md`
- [ ] `RESULT_PAGE_DATABASE_INTEGRATION.md`
- [ ] `UI_UX_AUDIT_SCREENSHOTS.md`
- [ ] Pindahkan dokumen ini menjadi `docs/remediation-plan.md` setelah tautan diperbarui.

Konsolidasikan atau arsipkan:

- [ ] `SYSTEM_AUDIT_REPORT.md`
- [ ] `PONYTAIL_AUDIT_REPORT.md`
- [ ] `POWERUP_AUDIT_REPORT.md`
- [ ] `POWERUP_FIX_PLAN.md`
- [ ] `ROADMAP_PERBAIKAN.md`
- [ ] `REKOMENDASI_PERBAIKAN_SKDQUEST.md`
- [ ] `GAME_OVER_MODAL_PLAN.md`
- [ ] `TEMP_FIX_TRANSACTIONS.md`

Gunakan `docs/archive/` hanya untuk audit lama yang masih bernilai. Pertahankan satu rencana aktif. Hapus dokumen sementara setelah pekerjaan selesai.

### -1.8 Rapikan SQL menjadi migration

SQL root saat ini tidak menunjukkan urutan deploy:

- `supabase_schema.sql`
- `supabase_schema_extended.sql`
- `supabase_schema_extended_fixed.sql`
- `supabase_schema_server_scoring.sql`
- `supabase_schema_attempt_integrity.sql`
- `supabase_security_fixes.sql`
- `supabase_rpc_security_fixes.sql`
- `supabase_characters_schema.sql`

- [ ] Cocokkan definisi repository dengan schema produksi.
- [ ] Tentukan baseline sebelum memindahkan atau menghapus SQL lama.
- [ ] Konsolidasikan menjadi `supabase/migrations/<timestamp>_<name>.sql`.
- [ ] Pastikan urutan function, policy, grant, trigger, dan table deterministik.
- [ ] Simpan rollback/data recovery notes.
- [ ] Hapus SQL root lama hanya setelah staging berhasil direproduksi.

Jangan sekadar mengganti lokasi file SQL tanpa memverifikasi state produksi.

### -1.9 Hapus konfigurasi publik duplikat

- [ ] Pertahankan root `vercel.json`; hapus `public/vercel.json`.
- [ ] Pertahankan manifest dari `vite-plugin-pwa` di `vite.config.ts`.
- [ ] Hapus `public/manifest.json` dan link manifest manual di `index.html` setelah memastikan plugin menginjeksi manifest.
- [ ] Hapus `public/og-image.svg` bila bukan source desain yang sengaja dipertahankan; runtime memakai PNG.
- [ ] Pertahankan `public/_redirects` hanya bila Netlify juga menjadi target resmi; jika hanya Vercel, hapus.
- [ ] Dokumentasikan target hosting resmi pada README.

### -1.10 Putuskan konfigurasi agent/editor

- [ ] Pertahankan `.continue/prompts/new-prompt.md` hanya bila merupakan prompt tim.
- [ ] Jika konfigurasi pribadi, untrack dan ignore `.continue/`.
- [ ] Pertahankan `.zcode/` dalam `.gitignore`; jangan commit session/handoff lokal.

### -1.11 Perluas `.gitignore`

Target minimal:

```gitignore
# Dependencies/build
node_modules/
dist/
dist-ssr/
coverage/
.vite/
*.tsbuildinfo

# Environment
.env
.env.*
!.env.example
*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editors/OS
.vscode/*
!.vscode/extensions.json
.idea/
.DS_Store
Thumbs.db
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Local agent/session data
.zcode/
# .continue/  # aktifkan bila bukan konfigurasi tim

# Temporary files
tmp/
temp/
*.tmp
*.bak
*.orig
*.rej

# Sensitive debug artifact
public/inject.html

# Local source documents; aktifkan bila tidak untuk distribusi
# Soal/
```

`package-lock.json`, source, migration, ikon PWA, dan konfigurasi build harus tetap tracked.

### -1.12 Verifikasi cleanup

- [ ] Jalankan `git ls-files` dan periksa ulang artefak sensitif/generated.
- [ ] Jalankan pencarian token/secret pada tracked files.
- [ ] Jalankan `npm ci`.
- [ ] Jalankan `npm run lint`.
- [ ] Jalankan `npm test` setelah tersedia.
- [ ] Jalankan `npm run build`.
- [ ] Pastikan aplikasi memuat seluruh aset dan data yang diperlukan.
- [ ] Pastikan `git status` hanya berisi perubahan cleanup yang disengaja.
- [ ] Pisahkan commit cleanup dari perubahan security/backend.

### Kriteria selesai

- Root hanya berisi konfigurasi dan entry documentation aktif.
- Tidak ada token, debug script sensitif, generated build, atau patch sekali pakai yang tracked.
- Satu sumber data soal kanonis terdokumentasi.
- Satu konfigurasi manifest dan Vercel aktif.
- SQL tersusun sebagai migration reproducible.
- `.gitignore` melindungi environment, cache, coverage, agent data, dan file sementara.
- Build tetap lulus setelah cleanup.

---

## Fase 0 — Respons insiden sesi

**Prioritas:** P0, segera  
**Estimasi:** 1–2 jam plus waktu propagasi cache

### Pekerjaan

- [ ] Revoke seluruh sesi/token akun yang terdapat dalam `public/inject.html`.
- [ ] Hapus `public/inject.html` dari repository dan artefak deployment.
- [ ] Tambahkan `public/inject.html` ke `.gitignore` sebagai pencegahan tambahan.
- [ ] Purge deployment/CDN cache.
- [ ] Naikkan versi/cache identifier service worker agar precache lama dibuang.
- [ ] Hapus file dari riwayat Git bila repository pernah dibagikan atau dipublikasikan.
- [ ] Koordinasikan force-push dan clone ulang bila riwayat Git dibersihkan.
- [ ] Verifikasi `/inject.html` mengembalikan 404 pada produksi.
- [ ] Verifikasi refresh token lama tidak dapat digunakan.

### Lokasi

- `public/inject.html`
- `vite.config.ts`

### Kriteria selesai

- Token lama invalid.
- File tidak ada pada branch, build, deployment, CDN, atau precache service worker.
- Working copy anggota tim tidak mengembalikan file dari riwayat lama.

### Rollback

Tidak ada rollback untuk token terkompromi. Jangan mengaktifkan token atau file kembali.

---

## Fase 1 — Tutup boundary keamanan backend

**Prioritas:** P0  
**Estimasi:** 1–2 hari

### 1.1 RPC berbasis identitas caller

- [ ] Hapus parameter user ID dari `daily_claim` dan `spin_wheel`.
- [ ] Gunakan `auth.uid()` sebagai satu-satunya identitas pengguna.
- [ ] Fail closed bila `auth.uid()` null.
- [ ] Cabut execute dari `PUBLIC` dan `anon`; grant hanya role yang diperlukan.
- [ ] Audit seluruh `SECURITY DEFINER` function: set `search_path`, validasi caller, least privilege.

Lokasi:

- `supabase/functions/rpc/daily_claim.sql`
- `supabase/functions/rpc/spin_wheel.sql`

### 1.2 Profil dan hasil kuis

- [ ] Pisahkan kolom profil publik/editable dari kolom sensitif.
- [ ] Cabut update langsung terhadap coins, XP, level, inventory, energy, streak, dan statistik.
- [ ] Sediakan RPC khusus untuk setiap mutasi sensitif.
- [ ] Buat view profil publik berisi field leaderboard minimum.
- [ ] Ganti `select('*')` dengan daftar kolom minimum.
- [ ] Cabut INSERT/UPDATE client pada hasil kuis.
- [ ] Jadikan hasil kuis immutable setelah completion.

Lokasi:

- `supabase_schema.sql`
- `supabase_schema_extended.sql`
- `supabase_schema_server_scoring.sql`
- `src/lib/supabase.ts`
- `src/components/PlayerProfileModal.tsx`

### 1.3 Edge Function administratif

- [ ] Ubah `expire-duels` agar gagal saat `CRON_SECRET` kosong.
- [ ] Wajibkan bearer secret dengan perbandingan aman.
- [ ] Terima method `POST` saja.
- [ ] Hapus CORS publik yang tidak diperlukan.
- [ ] Tambahkan smoke test unauthorized/authorized.

Lokasi:

- `supabase/functions/expire-duels/index.ts`

### Kriteria selesai

- Pengguna A tidak dapat memodifikasi atau membaca field privat pengguna B.
- Anonymous tidak dapat menjalankan RPC ekonomi/administratif.
- Hasil kuis tidak dapat di-insert atau diubah langsung melalui REST API.
- Test otorisasi negatif lulus.

---

## Fase 2 — Server-authoritative scoring dan ekonomi

**Prioritas:** P0  
**Estimasi:** 3–5 hari

### 2.1 Mulai kuis

Buat RPC minimal `start_quiz(package_id, mode)`:

- [ ] Verifikasi `auth.uid()`.
- [ ] Verifikasi kepemilikan paket dan eligibility mode.
- [ ] Pilih soal dari sumber kanonis server.
- [ ] Simpan session dan urutan soal server-side.
- [ ] Debit biaya secara atomik bila diperlukan.
- [ ] Gunakan row lock atau conditional update untuk mencegah double spend.
- [ ] Kembalikan session ID dan payload soal yang aman.

Client tidak boleh mengirim `questions_json`, harga, reward, atau entitlement result.

### 2.2 Selesaikan kuis

Ubah `complete_quiz_session`:

- [ ] Terima session ID dan jawaban final saja.
- [ ] Pastikan session dimiliki caller dan belum selesai.
- [ ] Validasi jumlah soal, paket, mode, durasi, dan status session.
- [ ] Hitung skor kategori, kelulusan, koin, XP, level, dan statistik di server.
- [ ] Simpan hasil dan mutasi profil dalam satu transaksi.
- [ ] Jadikan operasi idempotent; retry mengembalikan hasil yang sama.
- [ ] Tolak completion kedua dengan payload berbeda.

### 2.3 Shop

Ubah RPC pembelian/penjualan:

- [ ] Terima `item_id` dan quantity saja.
- [ ] Ambil tipe, harga beli, harga jual, status aktif, dan limit dari katalog server.
- [ ] Tolak item tidak dikenal/tidak aktif.
- [ ] Lock saldo dan inventory.
- [ ] Mutasi saldo, inventory, dan transaction log dalam satu transaksi.
- [ ] Hapus logger transaksi client agar tidak terjadi duplikasi.

Lokasi:

- `supabase_rpc_security_fixes.sql`
- `src/context/QuizSessionContext.tsx`
- `src/pages/Quiz.tsx`
- `src/pages/Shop.tsx`
- `src/pages/TryOutLobby.tsx`

### Test wajib

- [ ] User tidak dapat memainkan paket yang belum dimiliki.
- [ ] Harga client palsu diabaikan/ditolak.
- [ ] XP/koin/skor client palsu diabaikan/ditolak.
- [ ] Dua request pembelian paralel tidak membuat saldo negatif.
- [ ] Dua completion paralel menghasilkan satu reward.
- [ ] Retry completion mengembalikan hasil identik.

### Kriteria selesai

Semua nilai ekonomi, entitlement, scoring, dan hasil turunan berasal dari data server kanonis.

---

## Fase 3 — Transaksi atomik gameplay

**Prioritas:** P1  
**Estimasi:** 2–3 hari

### Power-up

- [ ] Buat `consume_powerup(session_id, item_id)`.
- [ ] Lock session dan inventory.
- [ ] Validasi kepemilikan, stok, status session, dan limit penggunaan.
- [ ] Decrement stok atomik.
- [ ] Terapkan efek client hanya setelah RPC sukses.

### Quest

- [ ] Buat `claim_quest(quest_id)`.
- [ ] Hitung/validasi progress server-side.
- [ ] Lock claim row dan profil.
- [ ] Tandai claimed dan tambah reward dalam satu transaksi.
- [ ] Tambahkan unique constraint untuk satu claim per user/quest/periode.
- [ ] Disable tombol selama request sebagai proteksi UX, bukan security boundary.

### Debit tryout

- [ ] Hapus read-modify-write saldo dari client.
- [ ] Gabungkan debit ke `start_quiz`.
- [ ] Jangan mengaktifkan quiz sebelum RPC berhasil.

Lokasi:

- `src/pages/Quiz.tsx`
- `src/pages/Quest.tsx`
- `src/lib/supabase.ts`

### Kriteria selesai

Uji dua tab/request paralel tidak menghasilkan double use, double claim, saldo negatif, atau lost update.

---

## Fase 4 — XSS, cache, dan browser hardening

**Prioritas:** P1  
**Estimasi:** 1–2 hari

### XSS

- [ ] Hapus `dangerouslySetInnerHTML` untuk konten yang dapat dirender sebagai teks.
- [ ] Gunakan text node untuk soal, opsi, dan pembahasan.
- [ ] Bila subset HTML benar-benar wajib, gunakan sanitizer allowlist ketat.
- [ ] Satukan atau hapus implementasi `cleanMathText` yang terduplikasi.
- [ ] Tambahkan test payload `<img src=x onerror=...>` dan SVG/event handler.

Lokasi:

- `src/components/MathCard.tsx`
- `src/pages/Quiz.tsx`
- `src/pages/ReviewDetail.tsx`

### PWA cache

- [ ] Hapus runtime caching untuk Supabase `/rest/`, `/auth/`, dan `/functions/`.
- [ ] Cache hanya aset statis atau endpoint publik yang di-whitelist.
- [ ] Bersihkan cache data lama saat upgrade service worker.
- [ ] Tambahkan pembersihan Cache Storage saat logout sebagai defense-in-depth.

Lokasi:

- `vite.config.ts`
- `src/App.tsx`
- `src/pages/Dashboard.tsx`

### Security headers

- [ ] Tambahkan CSP bertahap tanpa `unsafe-inline` bila memungkinkan.
- [ ] Tambahkan `frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, dan `Permissions-Policy`.
- [ ] Satukan konfigurasi Vercel; hindari dua sumber berbeda.

Lokasi:

- `vercel.json`
- `public/vercel.json`

### Kriteria selesai

- Payload HTML berbahaya tampil sebagai teks atau dibuang.
- Data user tidak tersimpan dalam Cache Storage setelah logout/update.
- Header keamanan terlihat pada response produksi.

---

## Fase 5 — Correctness dan recovery kuis

**Prioritas:** P1  
**Estimasi:** 2 hari

### Autosave

- [ ] Ganti pola `if (isAutoSavingRef.current) return` dengan queue satu-slot terbaru.
- [ ] Simpan dirty flag/pending update.
- [ ] Flush ulang setelah request aktif selesai.
- [ ] Gunakan functional state setter untuk menghindari stale closure.
- [ ] Tampilkan status save gagal dan retry.

### Completion

- [ ] Satukan seluruh mode ke satu handler completion.
- [ ] Tangani rejection pada semua mode.
- [ ] Reset `isFinishing` saat gagal.
- [ ] Pertahankan session dan tampilkan retry.
- [ ] Navigasi hanya setelah server mengembalikan result ID.

### React Hooks

- [ ] Pindahkan hook `Navigation` sebelum early return.
- [ ] Perbaiki dependency effect yang memicu stale state.
- [ ] Hapus synchronous state update dalam effect bila state dapat diturunkan saat render.
- [ ] Hentikan mutasi nilai/state yang ditandai lint.
- [ ] Cancel `requestAnimationFrame` pada cleanup.

Lokasi:

- `src/context/QuizSessionContext.tsx`
- `src/pages/Quiz.tsx`
- `src/App.tsx`
- `src/pages/Result.tsx`
- `src/pages/Dashboard.tsx`

### Kriteria selesai

- Jawaban terbaru tetap tersimpan ketika request lambat.
- Completion gagal tidak menghilangkan session atau membuka hasil palsu.
- Rules of Hooks lulus.

---

## Fase 6 — Migration, test, dan CI

**Prioritas:** P1  
**Estimasi:** 2–4 hari

### Migration

- [ ] Inventaris seluruh schema, policy, function, grant, trigger, dan versi aktif produksi.
- [ ] Konsolidasikan SQL lepas menjadi migration timestamped.
- [ ] Tentukan baseline produksi.
- [ ] Tambahkan migration forward dan rollback/data recovery notes.
- [ ] Dokumentasikan urutan apply.
- [ ] Jangan hapus SQL lama sebelum baseline diverifikasi.

### Test minimum

- [ ] Unit test kalkulasi adaptive/reward.
- [ ] Integration test auth/RLS lintas-user.
- [ ] Integration test scoring server-authoritative.
- [ ] Integration test shop, quest, power-up, dan debit paralel.
- [ ] Test autosave dan completion retry.
- [ ] Test XSS rendering.

### CI minimum

```text
npm ci
npm run lint
npm test
npm run build
npm audit --audit-level=high
```

- [ ] Tambahkan workflow CI tunggal.
- [ ] Jadikan seluruh langkah wajib sebelum merge.
- [ ] Pin versi Node yang kompatibel dengan Vite.

### Kriteria selesai

Clone bersih dapat mereproduksi schema dan build. CI mencegah merge bila lint, test, build, atau audit high gagal.

---

## Fase 7 — Dependency dan lint debt

**Prioritas:** P2  
**Estimasi:** 2–4 hari

- [ ] Upgrade Vite dari versi rentan ke patch aman kompatibel.
- [ ] Update dependency induk agar menarik `@babel/core` aman.
- [ ] Regenerasi `package-lock.json`.
- [ ] Jalankan `npm ci`, audit, lint, dan build.
- [ ] Ganti `any` pada trust boundary dengan tipe domain atau `unknown` plus narrowing.
- [ ] Hapus import/variabel mati.
- [ ] Perbaiki effect dependency dan immutability; jangan disable rule.
- [ ] Setelah bersih, aktifkan `noUnusedLocals` dan `noUnusedParameters`.

### Kriteria selesai

- `npm run lint` lulus tanpa warning.
- `npm audit --audit-level=high` lulus.
- Build tetap lulus.

---

## Fase 8 — Performa dan PWA UX

**Prioritas:** P2  
**Estimasi:** 1–2 hari

- [ ] Ukur bundle dengan analyzer sebelum perubahan.
- [ ] Pasang `QuizSessionProvider` hanya pada route quiz/result.
- [ ] Pisahkan Supabase client dasar dari question repository/data berat.
- [ ] Dynamic import JSON materi berdasarkan `modulId`.
- [ ] Ukur ulang bundle; jangan hanya menaikkan warning limit.
- [ ] Gunakan satu manifest PWA dari plugin.
- [ ] Hapus manifest statis/link manual yang duplikat.
- [ ] Tampilkan CTA instalasi hanya setelah `beforeinstallprompt`.
- [ ] Tambahkan fallback offline minimal dan smoke test install/offline.

### Target

- Main chunk turun di bawah warning `500 kB`, atau memiliki alasan terukur.
- Tidak ada tombol Pasang yang tidak berfungsi.
- Hanya satu manifest aktif.

---

## Fase 9 — Accessibility

**Prioritas:** P2  
**Estimasi:** 2–3 hari

- [ ] Tambahkan semantik dialog, `aria-modal`, accessible heading, focus trap, fokus awal, dan Escape.
- [ ] Ganti `<div>` clickable dengan `<button type="button">`.
- [ ] Tambahkan accessible name pada tombol ikon.
- [ ] Hubungkan semua label dengan input memakai `htmlFor`/`id`.
- [ ] Tambahkan label pada room code dan pencarian pengguna/rival.
- [ ] Tambahkan skip link menuju `<main id="main-content">`.
- [ ] Rapikan hierarki heading; satu `h1` per halaman.
- [ ] Uji keyboard-only dan screen reader smoke test.

Lokasi utama:

- `src/components/modals/ExitConfirmModal.tsx`
- `src/components/modals/SubmitConfirmModal.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Shop.tsx`

### Kriteria selesai

Semua alur utama dapat diselesaikan dengan keyboard. Fokus tidak keluar dari modal. Kontrol memiliki accessible name.

---

## Fase 10 — Dokumentasi dan SEO

**Prioritas:** P3; SEO hanya bila halaman publik perlu diindeks  
**Estimasi:** 1–2 hari

### Operasional

- [ ] Koreksi README dari React 18 ke React 19.
- [ ] Gunakan `npm ci` untuk setup reproducible.
- [ ] Tambahkan `.env.example` tanpa nilai rahasia.
- [ ] Pin dan dokumentasikan versi Node.
- [ ] Dokumentasikan deploy, rollback, smoke check, monitoring, dan owner respons.
- [ ] Dokumentasikan backup/restore Supabase.
- [ ] Dokumentasikan deploy/rollback Edge Functions.
- [ ] Dokumentasikan lint/test/build sebagai acceptance gate.

### SEO

- [ ] Tentukan dahulu apakah aplikasi auth-only perlu SEO.
- [ ] Jika ya: sediakan landing publik statis/prerender.
- [ ] Tambahkan canonical absolut, `og:url`, dan `og:image` absolut.
- [ ] Tambahkan `robots.txt` dan sitemap untuk halaman publik saja.
- [ ] Tambahkan metadata per halaman publik.
- [ ] Tambahkan route 404.
- [ ] Jangan menambahkan JSON-LD tanpa entitas publik yang sesuai.

---

## Urutan deployment yang disarankan

1. Respons insiden token dan purge cache.
2. Migration pembatasan privilege yang kompatibel.
3. RPC server-authoritative baru beserta integration test.
4. Client memakai RPC baru.
5. Cabut RPC/policy lama setelah telemetry menunjukkan tidak dipakai.
6. XSS dan PWA cache hardening.
7. Correctness/recovery kuis.
8. CI menjadi required gate.
9. Performa, accessibility, dokumentasi, SEO.

## Checklist verifikasi akhir

- [ ] Token lama invalid; `/inject.html` 404.
- [ ] User A tidak dapat membaca field privat atau memutasi user B.
- [ ] Anonymous tidak dapat memanggil RPC sensitif.
- [ ] Harga, reward, skor, dan entitlement palsu dari client ditolak.
- [ ] Request paralel tidak menghasilkan double spend/double reward.
- [ ] Hasil kuis immutable dan completion idempotent.
- [ ] Payload XSS tidak dieksekusi.
- [ ] Cache Storage tidak menyimpan respons user.
- [ ] Autosave mempertahankan jawaban terbaru.
- [ ] Completion gagal dapat di-retry tanpa kehilangan session.
- [ ] `npm run lint` lulus.
- [ ] `npm test` lulus.
- [ ] `npm run build` lulus.
- [ ] `npm audit --audit-level=high` lulus.
- [ ] Migration dapat diterapkan dari baseline staging.
- [ ] Rollback dan backup restore telah diuji.

## Definition of Done

Perbaikan dianggap selesai hanya bila perubahan backend, client, migration, test, dokumentasi deploy, dan bukti verifikasi tersedia. Build lulus saja tidak cukup.
