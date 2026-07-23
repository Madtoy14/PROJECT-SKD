# Plan Diskusi — Smoke Test Bugfix (belum implement)

**Tanggal:** 24 Jul 2026  
**Status:** DISKUSI DULU — jangan coding sampai Q1–Q4 dijawab  
**Repo:** `SKD_WEB` · branch `master`  
**Production:** https://skdquest.vercel.app  
**Sumber:** tes manual user (smoke test mobile + gameplay)

---

## Aturan kerja sesi ini

1. **Diskusi dulu** — putuskan desain, baru plan implementasi detail.
2. **Jangan campur** UI mobile dengan logic P0 di PR yang sama.
3. Server tetap authoritative (`consume_energy`, `complete_quiz_session`).
4. Commit kecil; `npm run build` harus lolos sebelum merge.
5. Item #13 (“masih banyak bug”) diabaikan sampai bug konkret.

---

## Daftar bug smoke test (asli user)

| # | Deskripsi |
|---|---|
| 1 | Text streak harian (hari ke-) mode HP belum proporsional |
| 2 | Jumlah pengikut/mengikut bug; kadang sudah nambah di player lain belum; request pertemanan tidak muncul |
| 3 | Nickname mode HP belum proporsional |
| 4 | Profil → statistik karir: angka & teks belum proporsional |
| 5 | Status kesiapan CAT CPNS BKN (teks TWK/TIU/TKP) belum proporsional |
| 6 | Daftar rival logikanya masih bug |
| 7 | Fitur cari teman tampilan belum proporsional |
| 8 | Mode liga: klik profil → tidak ada fitur tambahkan teman |
| 9 | Follow tidak langsung ke “mengikuti”; mutual accept tidak auto masuk daftar rival |
| 10 | Gameplay: refresh → waktu reset; pindah soal → waktu reset |
| 11 | Survival: kadang “muat lagi” / gagal kirim saat jawab TKP |
| 12 | Survival: energi 3, jawab no.1 benar → “Energi Habis” (energi hanya bayar di awal, bukan per soal) |
| 13 | Masih banyak bug (noise — skip) |
| 14 | Login sering loop |

**Screenshot terkait:**  
- Modal “Gagal mengirim hasil / Sesi tidak ditemukan” (Survival TKP) → #11  
- Layar “Energi Anda Habis!” mid-session setelah jawab benar → #12  

---

## Prioritas

| Wave | Item | Severity | Catatan |
|---|---|---|---|
| **A — Blocker** | #12, #11, #10, #14 | P0 | Gameplay + auth rusak |
| **B — Social** | #2, #6, #8, #9 | P1 | Butuh keputusan model friend/rival dulu |
| **C — Mobile UI** | #1, #3, #4, #5, #7 | P2 | CSS only, PR terpisah |
| Skip | #13 | — | Tidak actionable |

**Urutan disarankan:** A → B → C. Jangan mulai C sebelum A stabil.

---

## Root cause (temuan kode, pra-diskusi)

### #12 Energi habis mid-session (sangat jelas)

- Survival cost = **3** (`Dashboard.tsx` modes).
- User energi 3 → jawab soal 1 → `consumeEnergy(3)` → `profile.energy = 0`.
- Gate di `Quiz.tsx` (~baris 974):

```ts
if (profile && (gameMode === 'survival' || pvp...) && profile.energy <= 0) {
  // return layar Energi Habis
}
```

- Gate **masih aktif setelah** potong energi → false positive “habis” padahal sesi sudah bayar.
- **Aturan domain yang benar:** energi potong **1× per sesi** (awal / first answer). Bukan per soal. Gate hanya **pre-session** (sebelum bayar).

**Arah fix (belum final):**  
`if (!isEnergyDeducted && profile.energy <= 0)`  
atau potong saat `createSession` + jangan re-gate mid-session.

File: `src/pages/Quiz.tsx`, `src/pages/Dashboard.tsx`, RPC `consume_energy`.

---

### #10 Timer reset

- `timeLeft` = client state (`useState(TOTAL_TIME)`).
- Survival: sengaja reset per soal (`getSurvivalTime(nextIdx)`).
- Non-tryout: `setTimeLeft(TOTAL_TIME)` tiap pindah soal.
- Tryout: continuous 100 menit (skip reset) — OK.
- Refresh: **tidak** restore dari `started_at` DB → timer full lagi.

**Perlu putusan desain per mode** (lihat Q2).

File: `src/pages/Quiz.tsx` (timer effect ~573, `goNextOrFinish` ~916).

---

### #11 Survival TKP “Sesi tidak ditemukan”

- Finish path: `if (!sessionId) setFinishError('Sesi tidak ditemukan...')`.
- Bisa juga `completeSession` gagal (session interrupted / race / RLS).
- Hipotesis kuat: terkait #12 (gate unmount mid-flow) + `createSession` lambat/gagal + `beforeunload` set `interrupted`.

**Fix #12 dulu**, lalu audit `createSession` / `completeSession` / status session.

File: `src/pages/Quiz.tsx`, `src/context/QuizSessionContext.tsx`.

---

### #14 Login loop

- `App.tsx`: timeout 5s session check → `session: null` → `/auth`.
- Race: `getSession` + `onAuthStateChange` + `checkOnboarding` + cache `sessionStorage onboarding_${userId}`.
- Perlu repro: loop `/auth`↔`/` atau `/auth`↔`/onboarding`?

File: `src/App.tsx`, `src/pages/Auth.tsx`.

---

### #2, #6, #8, #9 Friend / Rival

- Model sekarang: follow one-way tabel `friends(user_id, friend_id)`.
- Mutual = keduanya follow (tab Liga “Teman”).
- `PlayerProfileModal` tombol rival **hanya** jika parent pass `onAddRival` — Liga sering tidak pass → #8.
- User expect: A follow B → request; B accept + follow balik → **auto rival**.
- Kode: rival terpisah dari mutual; count pengikut/mengikut bisa stale; tidak ada request formal pending/accept.

**Perlu putusan model** (lihat Q3). Jangan dual-write `profiles.friends[]` + tabel `friends`.

File: `src/components/PlayerProfileModal.tsx`, `src/pages/Leaderboard.tsx`, `src/pages/Profile.tsx`, tabel `friends`.

---

### #1, #3, #4, #5, #7 Mobile layout

- Pure CSS/responsive. Tidak sentuh business logic.
- PR terpisah setelah Wave A stabil.

File utama: `Dashboard.tsx`, `Profile.tsx`, komponen cari teman / streak.

---

## Keputusan terbuka (WAJIB dijawab sebelum coding)

### Q1 — Energi survival/PvP
- Potong saat **masuk mode** (sebelum soal 1) atau **first answer** (sekarang)?
- Gate “energi habis” **hanya** pre-session — setuju?

### Q2 — Timer per mode
| Mode | Opsi A | Opsi B |
|---|---|---|
| Tryout | Continuous 100 menit, survive refresh dari `started_at` | — |
| Survival | Per soal (hardcore) + restore sisa saat refresh | Continuous total? |
| Latihan/PvP | 45s **per soal** = fitur | Continuous / tidak reset = bug |

### Q3 — Friend / Rival
1. Rival = **mutual follow otomatis**?
2. Atau rival = **list manual** terpisah?
3. Perlu status **pending request** (accept/reject) atau follow Instagram-style langsung?

### Q4 — Scope plan implementasi
- Wave A saja dulu (4 blocker)?
- Atau A+B sekaligus?

---

## Wave A — arah perbaikan (setelah Q dijawab)

| Step | Bug | Arah (draft) | File |
|---|---|---|---|
| A1 | #12 | Gate energi hanya jika belum bayar sesi; jangan unmount quiz setelah `consumeEnergy` sukses | `Quiz.tsx` |
| A2 | #11 | Pastikan `sessionId` ada sebelum jawab; jangan finish tanpa sesi; audit interrupted status | `Quiz.tsx`, `QuizSessionContext.tsx` |
| A3 | #10 | Sesuai Q2: persist/restore timer dari `started_at` untuk mode yang continuous; per-soal reset hanya jika by design | `Quiz.tsx` |
| A4 | #14 | Perketat race auth; jangan timeout → false logout; klarifikasi cache onboarding | `App.tsx`, `Auth.tsx` |

**Cek manual Wave A:**
1. Survival energi 3 → main → jawab benar beberapa soal → **tidak** muncul Energi Habis.
2. Survival TKP jawab → **tidak** “Sesi tidak ditemukan”.
3. Tryout: refresh mid-session → sisa waktu masuk akal (jika Q2 setuju continuous).
4. Login Google / refresh app → **tidak** loop auth.

---

## Wave B — arah (setelah Q3)

| Step | Bug | Arah (draft) |
|---|---|---|
| B1 | #2 | Satu sumber count follow (tabel `friends`); refresh count di kedua sisi |
| B2 | #8 | Liga selalu pass handler friend/rival ke `PlayerProfileModal` |
| B3 | #9 | Jika mutual = rival: on mutual follow → upsert rival list |
| B4 | #6 | Samakan query daftar rival dengan definisi Q3 |

---

## Wave C — mobile polish (terpisah)

- Streak “hari ke-”, nickname, statistik karir, kesiapan TWK/TIU/TKP, UI cari teman.
- Target: layout proporsional di viewport HP (~360–430px).
- Jangan ubah logic.

---

## File kunci

| Path | Peran |
|---|---|
| `src/pages/Quiz.tsx` | energy gate, timer, finish, survival |
| `src/context/QuizSessionContext.tsx` | create/complete/recover session |
| `src/pages/Dashboard.tsx` | energyCost entry modes |
| `src/App.tsx` | auth state, timeout, onboarding cache |
| `src/pages/Auth.tsx` | login UI / OAuth |
| `src/components/PlayerProfileModal.tsx` | profil pemain, rival/friend CTA |
| `src/pages/Leaderboard.tsx` | liga + tab teman mutual |
| `src/pages/Profile.tsx` | statistik, follow counts, UI HP |
| `src/lib/supabase.ts` | RPC helpers, profile types |

---

## Anti-pola

- Jangan double `consume_energy` (entry + first answer).
- Jangan trust client score/timer untuk reward final.
- Jangan dual-write social graph.
- Jangan campur CSS mobile ke PR logic P0.
- Jangan implement Wave B sebelum Q3 final.

---

## Prompt siap-tempel untuk Hermes (diskusi dulu)

Salin blok di bawah ke chat Hermes:

```
Baca docs/plan-smoke-bugfix-diskusi.md di repo SKD_WEB.

Konteks: smoke test manual user (14 item). Kita DISKUSI dulu, JANGAN coding / jangan bikin PR implement dulu.

Tugasmu:
1. Baca plan + file kunci yang disebut (terutama Quiz.tsx energy gate ~974, timer, App.tsx auth).
2. Ringkas prioritas Wave A/B/C dengan bahasamu sendiri (1 layar).
3. Bantu jawab / challenge Q1–Q4:
   - Q1 energi: potong di entry vs first answer; gate hanya pre-session?
   - Q2 timer: desain per mode (tryout / survival / latihan-pvp) + refresh behavior
   - Q3 friend/rival: mutual auto-rival vs manual; perlu pending request?
   - Q4 scope: Wave A dulu atau A+B
4. Setelah Q dijawab user, usulkan plan implementasi urut step kecil (masih boleh revisi). Baru coding kalau user bilang "lanjut implement".

Aturan: Bahasa Indonesia, ringkas, YAGNI. Server authoritative. Jangan sentuh secret/.env.
```

---

## Checklist sebelum implement

- [ ] Q1 dijawab  
- [ ] Q2 dijawab  
- [ ] Q3 dijawab  
- [ ] Q4 dijawab  
- [ ] Wave A plan step disetujui  
- [ ] Baru coding A1 → A2 → A3 → A4  
- [ ] Manual check Wave A lolos  
- [ ] Baru Wave B / C  

---

**Handoff:** file ini cukup untuk Hermes mulai diskusi. Implementasi = sesi terpisah setelah keputusan Q1–Q4.
