# Perbaikan Wave A — Smoke Bugfix

**Status:** Ready untuk coding (Q1-Q4 sudah diskusi)

**P0 Blocker (Urutan fix):**

## 1. Energi Habis mid-session (#12)

**Bug:**
- Survival/PvP: energi 3 potong saat first answer.
- Gate `if (profile.energy <= 0)` masih aktif setelah itu.
- Hasil: user sudah bayar, tapi layar “Energi Habis” muncul di quiz.

**Fix:**
```diff
// src/pages/Quiz.tsx
// Ganti gate lama dengan:
if (profile && (gameMode === 'survival' || gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') && !isEnergyDeducted && profile.energy <= 0) {
  // return Energi Habis
}
```

**Verifikasi:**
- Masuk survival → energi 3 → jawab soal 1 benar → **tidak** muncul layar Energi Habis.

**File:**
- `src/pages/Quiz.tsx`

---

## 2. Survival TKP “Sesi tidak ditemukan” (#11)

**Bug:**
- Finish path sering trigger `setFinishError('Sesi tidak ditemukan')`.
- Bisa race condition (createSession + beforeunload interrupted).

**Fix:**
```diff
// QuizSessionContext.tsx (di finishTryout / abandonSession)
if (!sessionId) {
  setFinishError('Sesi tidak ditemukan');
  return;
}
```

**Verifikasi:**
- Survival TKP → jawab beberapa soal → finish → **tidak** error.

**File:**
- `src/context/QuizSessionContext.tsx`
- `src/pages/Quiz.tsx`

---

## 3. Timer reset (#10)

**Bug:**
- Refresh mid-quiz → timer full reset.
- Inconsistent antar mode.

**Fix (sesuai Q2):**
```diff
// Quiz.tsx
// Gunakan started_at dari session untuk restore timer
if (gameMode === 'survival' || gameMode === 'pvp') {
  // per-soal reset atau continuous sesuai keputusan Q2
}
```

**Verifikasi:**
- Refresh mid-survival → sisa waktu masuk akal.

**File:**
- `src/pages/Quiz.tsx`

---

## 4. Login loop (#14)

**Bug:**
- Race `getSession` + cache onboarding → loop `/auth` ↔ `/`.

**Fix:**
- Perketat timeout session check (lebih dari 5s).
- Jangan redirect ke /auth kalau session masih valid.

**Verifikasi:**
- Login Google → refresh app → **tidak** loop.

**File:**
- `src/App.tsx`
- `src/pages/Auth.tsx`

---

**Cara kerja:**
1. Fix satu per satu sesuai urutan.
2. `npm run build` harus lolos.
3. Smoke manual setelah fix (login → claim → shop → survival energi 3 → finish).

Mau aku tulis PR body atau langsung mulai fix #12?