# AUDIT POWER-UP SISTEM — SKDQuest
**Tanggal:** 18 Juli 2026  
**Auditor:** System Architect  
**Scope:** Kesesuaian, balance, bug, UX per power-up

---

## 1. POWER-UP INVENTORY LENGKAP

| ID | Nama | Harga | Fungsi | Status |
|----|------|-------|--------|--------|
| `item_5050` | Eliminasi 50:50 | 300 koin | Hapus 2 opsi salah | ✅ OK |
| `item_hint` | Bocoran Rumus | 250 koin | Tampilkan hint soal | ✅ OK |
| `item_waktu_beku` | Waktu Beku | 300 koin | Freeze timer 5 detik | ✅ OK |
| `item_skor_ganda` | Skor Ganda | 350 koin | 2x poin soal berikutnya | ✅ OK |
| `item_terawangan` | Terawangan | 400 koin | Tebakan mayoritas user | ⚠️ FAKE DATA |
| `item_kesempatan_kedua` | Kesempatan Kedua | 500 koin | Nyawa ekstra survival | 🔴 BUG |
| `item_shield` | Perisai Survival | 500 koin | Nyawa ekstra survival | ✅ OK |
| `item_tinta_hitam` | Tinta Hitam (PvP) | 350 koin | Blur layar lawan 5 detik | ✅ OK |
| `item_lompatan_kilat` | Lompatan Kilat (PvP) | 450 koin | Skip soal, dapat poin | ✅ OK |
| `item_energy_refill` | Isi Ulang Energi | 150 koin | +5 energi instant | ✅ OK |
| `item_streak_protector` | Streak Protector | 500 koin | Proteksi streak putus | ⚠️ PARTIAL |
| `item_coin_booster` | Koin Booster 2x | 300 koin | 2x koin 3 kuis | ❌ DEAD |

---

## 2. PEMBATASAN PER MODE

### Latihan (Casual)
```typescript
ALLOWED: ['item_5050', 'item_hint', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan']
MAX_USAGE: { item_5050: 3, item_hint: 3, item_waktu_beku: 3, item_skor_ganda: 3, item_terawangan: 3 }
```
**Assessment:** ✅ Balanced — max 3x setiap item, tidak exploitable

---

### Catatan Salah (Review)
```typescript
ALLOWED: ['item_5050', 'item_hint', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan']
MAX_USAGE: { item_5050: 3, item_hint: 3, item_waktu_beku: 3, item_skor_ganda: 3, item_terawangan: 3 }
```
**Assessment:** ✅ Sama dengan latihan — masuk akal, ini mode belajar

---

### Survival (Hardcore)
```typescript
ALLOWED: ['item_waktu_beku', 'item_terawangan', 'item_kesempatan_kedua', 'item_shield']
MAX_USAGE: { item_waktu_beku: 1, item_terawangan: 1, item_kesempatan_kedua: 3, item_shield: 3 }
```

**Assessment:** ⚠️ **IMBALANCED**

**Masalah:**
1. `item_kesempatan_kedua` dan `item_shield` **efek identik** — redundant, confusing
2. Max 3x masing-masing → total 6 nyawa ekstra → survival jadi terlalu mudah
3. Tidak ada `item_hint` / `item_5050` → fair, tapi bisa terlalu punishing untuk pemula
4. `item_kesempatan_kedua` **BUG** — dikonsumsi otomatis, tidak ada konfirmasi popup (sudah di `POWERUP_FIX_PLAN.md`)

**Rekomendasi:**
- Hapus salah satu (shield atau kesempatan_kedua)
- ATAU: Buat perbedaan jelas:
  - `item_shield` = aktifkan manual sebelum jawab (proaktif)
  - `item_kesempatan_kedua` = popup konfirmasi setelah salah (reaktif) ← sudah di plan

---

### PvP / PvP 1v1 / PvP Bot
```typescript
ALLOWED: ['item_5050', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan', 'item_tinta_hitam', 'item_lompatan_kilat']
MAX_USAGE: { 
  item_5050: 1, item_waktu_beku: 1, item_skor_ganda: 1, 
  item_terawangan: 1, item_tinta_hitam: 1, item_lompatan_kilat: 1 
}
```

**Assessment:** ✅ **BALANCED**

**Reasoning:**
- Semua power-up max 1x → fair competition, tidak exploitable
- `item_tinta_hitam` (offensive) dan `item_lompatan_kilat` (skip soal) hanya di PvP → game-feel solid
- Mix offensive + defensive → strategic depth

**Catatan:** `item_lompatan_kilat` line 1321 ada flag `lompatanKilatUsed` global — artinya 1x per sesi total, bukan 1x per soal. ✅ Correct.

---

### Tryout (Simulasi Resmi)
```typescript
ALLOWED: []  // TIDAK ADA POWER-UP
```

**Assessment:** ✅ **CORRECT** — Tryout harus murni kemampuan, sesuai BKN real.

---

## 3. ANALISIS MENDALAM PER POWER-UP

### 🟢 `item_5050` — Eliminasi 50:50

**Implementasi:** `Quiz.tsx:187-196`
```typescript
const correctId = currentQuestion.correct;
const incorrects = currentQuestion.options.filter((o: any) => o.id !== correctId).map((o: any) => o.id);
const shuffled = incorrects.sort(() => 0.5 - Math.random());
setEliminatedOptions(shuffled.slice(0, 2));
```

**Status:** ✅ Fully working

**Kesesuaian:**
- Latihan/Catatan: Max 3x — fair, bantu user stuck
- PvP: Max 1x — balanced, strategic timing penting
- Survival: **TIDAK ADA** — bisa dipertimbangkan tambah, tapi max 1x

**UX:** Opsi tereliminasi di-grey/hidden — jelas. ✅

---

### 🟢 `item_hint` — Bocoran Rumus

**Implementasi:** `Quiz.tsx:200-204`
```typescript
setShowHint(true);
```

**Render:** `Quiz.tsx:1077-1082`
```tsx
{showHint && currentQuestion.explanation && (
  <div className="bg-coin-subtle border border-yellow-500/30 p-4 rounded-2xl">
    <span dangerouslySetInnerHTML={{ __html: cleanedExplanation.slice(0, 180) + '...' }} />
  </div>
)}
```

**Status:** ✅ Working

**Masalah UX:**
- Hint = `explanation` field yang **sama** dengan pembahasan setelah jawab
- Tidak ada hint terpisah → kadang hint terlalu detail (langsung kasih jawaban)
- Slice 180 char → bisa potong di tengah rumus LaTeX, jadi berantakan

**Rekomendasi:**
- Buat field `hint` terpisah di database (lebih subtle dari `explanation`)
- ATAU: Gunakan AI generate hint on-the-fly dari pertanyaan (cost API tapi lebih dinamis)
- ATAU: Slice by sentence, bukan character (cegah rumus kepotong)

**Kesesuaian:**
- Latihan/Catatan: Max 3x — cocok untuk belajar
- PvP/Survival: **TIDAK ADA** — correct, terlalu overpowered

---

### 🟢 `item_waktu_beku` — Waktu Beku

**Implementasi:** `Quiz.tsx:208-219`
```typescript
setActivePowerUps(p => ({...p, waktuBeku: true}));
setTimeout(() => setActivePowerUps(p => ({...p, waktuBeku: false})), 5000);

// Timer countdown skip saat waktuBeku === true (line 508)
if (activePowerUps.waktuBeku) return;
```

**Server-side protection:** Line 214-218
```typescript
// Offset startedAt +5 detik untuk sync server
const newStart = new Date(new Date(activeSession.startedAt).getTime() + 5000).toISOString();
updateSession(sessionId, { startedAt: newStart });
```

**Status:** ✅ Anti-cheat ready

**Kesesuaian:**
- Semua mode kecuali tryout: Max 1-3x — balanced
- UI feedback: Cyan glow di border (line 929-931) — jelas

**Minor issue:** Countdown di header tidak di-pause visual (masih jalan tapi tidak potong waktu). Bisa bikin user bingung.

**Rekomendasi:** Ubah warna timer jadi cyan + tambah text "⏸️ FROZEN" saat aktif.

---

### 🟡 `item_skor_ganda` — Skor Ganda

**Implementasi:** `Quiz.tsx:223-227` (aktivasi) + `495-498` (konsumsi)
```typescript
// Aktivasi
setActivePowerUps(p => ({...p, skorGanda: true}));

// Konsumsi saat jawab
if (activePowerUps.skorGanda) {
  pts *= 2;
  setActivePowerUps(p => ({ ...p, skorGanda: false }));
}
```

**Status:** ✅ Working

**Kesesuaian:**
- Latihan/Catatan: Max 3x — OK
- PvP: Max 1x — strategic, bisa game-changer di akhir

**Edge case:** Kalau user aktifkan lalu **tidak jawab** (timer habis) → skorGanda flag hilang, item terbuang percuma. Intended atau bug?

**Rekomendasi:** Reset flag jika timer habis sebelum jawab (refund item? atau intentional punishment?).

---

### 🔴 `item_terawangan` — Terawangan (FAKE DATA)

**Implementasi:** `Quiz.tsx:231-234` (aktivasi) + `1149-1158` (render)
```typescript
const terawanganPercent = activePowerUps.terawangan 
  ? (isCorrect ? ((opt.text.length * 7) % 20) + 60 : ((opt.text.length * 13) % 30)) 
  : 0;
```

**Status:** ⚠️ **MISLEADING UX**

**Masalah:**
- Persentase dihitung dari **panjang teks opsi** — pseudorandom, bukan data real user
- User dikasih impression ini "tebakan mayoritas pengguna lain" — **BOHONG**
- Jawaban benar selalu 60-80%, salah selalu 0-30% → pattern terlalu obvious setelah user pakai 2-3x

**Rekomendasi (dari `RANCANGAN_SHOP.md`):**
1. **Quick fix:** Ubah copy jadi "Prediksi AI" atau "Estimasi pola jawaban" — jujur, tidak misleading (5 menit)
2. **Proper fix:** Implementasi real crowd data via Supabase aggregation (2-3 jam):
   ```sql
   SELECT option_id, COUNT(*) as vote_count
   FROM quiz_answers
   WHERE question_id = ?
   GROUP BY option_id;
   ```

**Kesesuaian mode:** Semua mode — tapi di PvP agak nerfed (max 1x, persaingan ketat jadi kurang ngaruh).

---

### 🔴 `item_kesempatan_kedua` — Kesempatan Kedua (BUG BEHAVIOR)

**Implementasi:** `Quiz.tsx:644-649`
```typescript
if (activePowerUps.perisaiActive) {
  if (profile?.inventory?.item_kesempatan_kedua > 0 && checkPowerupLimit('item_kesempatan_kedua')) {
    setPowerUpUsageCount(p => ({ ...p, item_kesempatan_kedua: (p.item_kesempatan_kedua || 0) + 1 }));
    const updatedInv = { ...profile.inventory, item_kesempatan_kedua: profile.inventory.item_kesempatan_kedua - 1 };
    updateProfile({ inventory: updatedInv }).then(p => setProfile(p));
    setActivePowerUps(p => ({ ...p, perisaiActive: false }));
  }
}
```

**Status:** 🔴 **BUG — Behavior identik dengan shield**

**Masalah:**
1. `item_kesempatan_kedua` **BUTUH** `perisaiActive = true` dulu — artinya user harus aktifkan manual SEBELUM jawab
2. Tidak ada perbedaan dengan `item_shield` — keduanya proaktif, bukan reaktif
3. User yang punya `item_kesempatan_kedua` tapi lupa aktifkan perisai → item tidak terpakai, langsung game over

**Behavior yang seharusnya (dari `POWERUP_FIX_PLAN.md`):**
- `item_shield` = aktifkan manual sebelum jawab (proaktif) ✅ keep as-is
- `item_kesempatan_kedua` = **popup konfirmasi SETELAH jawab salah** (reaktif) ← PERLU FIX

**Fix:** Sudah ada plan lengkap di `POWERUP_FIX_PLAN.md` — implementasi popup konfirmasi.

**Kesesuaian mode:** Survival only, max 3x — balanced setelah di-fix.

---

### 🟢 `item_shield` — Perisai Survival

**Implementasi:** `Quiz.tsx:650-655` (sama path dengan kesempatan_kedua)

**Status:** ✅ Working as intended

**Behavior:** User toggle `perisaiActive` sebelum jawab (line 240-245) → auto-absorb kesalahan.

**Kesesuaian:** Survival max 3x — balanced.

**Rekomendasi:** Setelah `item_kesempatan_kedua` di-fix jadi reaktif, pertimbangkan **rename** shield jadi lebih jelas: "Perisai Proaktif" atau "Shield Armor".

---

### 🟢 `item_tinta_hitam` — Tinta Hitam (PvP Offensive)

**Implementasi:** `Quiz.tsx:160-163` (aktivasi) + `323-327` (broadcast) + `1085` (effect)
```typescript
useTintaHitam() → broadcastPowerUp('item_tinta_hitam')
// Lawan terima:
setTintaHitamActive(true);
setTimeout(() => setTintaHitamActive(false), 5000);

// Effect di lawan:
<main className={tintaHitamActive ? 'blur-md pointer-events-none' : ''}>
```

**Status:** ✅ Fully working, game-feel solid

**Kesesuaian:** PvP only, max 1x — perfect for mindgames.

**UX:** Toast notif "💀 {name} menyiram layarmu dengan Tinta Hitam!" — engaging. Modal warning muncul di layar lawan (line 905-916) — jelas.

---

### 🟢 `item_lompatan_kilat` — Lompatan Kilat (PvP Offensive)

**Implementasi:** `Quiz.tsx:168-183`
```typescript
const correctOpt = currentQuestion.category === 'TKP' 
   ? currentQuestion.options.find((o: any) => o.score === 5)?.id 
   : currentQuestion.correct;

if (correctOpt) {
   handleSelect(correctOpt);  // Otomatis pilih jawaban benar → dapat poin
} else {
   goNextOrFinish(totalScoreRef.current);  // Skip jika tidak ada correct
}
```

**Status:** ✅ Working

**Kesesuaian:** PvP only, max 1x — super strategic, bisa jadi finisher.

**Edge case:** Kalau data soal corrupt (tidak ada `correct`) → skip tanpa poin. Acceptable fallback.

---

### 🟢 `item_energy_refill` — Isi Ulang Energi

**Implementasi:** Shop.tsx only — bukan in-game power-up

**Status:** ✅ OK — ini bukan power-up kuis, tapi consumable di luar sesi.

**Kesesuaian:** N/A — dibeli, langsung +5 energi ke profile.

---

### 🟡 `item_streak_protector` — Streak Protector

**Implementasi:** **PARTIAL** — bisa dibeli di Shop, tapi efek hanya di daily claim server-side

**Status:** ⚠️ Tidak ada UI feedback

**Lokasi efek:** `daily_claim.sql` RPC (sudah di plan `RANCANGAN_SHOP.md`)
```sql
IF v_profile.inventory IS NOT NULL AND 
   COALESCE((v_profile.inventory->>'item_streak_protector')::INT, 0) > 0 THEN
  -- Pakai streak protector, pertahankan streak
  v_new_streak := COALESCE(v_profile.streak, 0);
```

**Masalah UX:**
- User beli item ini → tidak tahu kapan terpakai
- Tidak ada notifikasi "Streak Protector saved your 30-day streak!"
- Dashboard tidak tampilkan indikator "Protector aktif (stok: X)"

**Rekomendasi:**
- Tambah icon di Dashboard streak badge: "🛡️ Protected (2x)"
- Tampilkan toast saat protector aktif terconsume
- Lokasi: `Dashboard.tsx:150-159` (sudah ada logic, tinggal tambah UI)

**Kesesuaian:** Universal — cocok untuk user serius yang takut putus streak.

---

### ❌ `item_coin_booster` — Koin Booster 2x (DEAD CODE)

**Status:** ❌ **NOT IMPLEMENTED**

**Ditemukan di:**
- `UserProfile` interface (`supabase.ts:39`) ✅ ada
- `Dashboard.tsx:223` spin wheel rewards ✅ bisa didapat
- Handler efek: ❌ **TIDAK ADA**

**Masalah:**
- User bisa dapat item ini dari spin wheel
- Item masuk inventory
- **Tidak ada kode yang cek/konsumsi item ini** saat quiz selesai
- Item jadi "ghost item" — ada tapi tidak berguna

**Rekomendasi (dari `RANCANGAN_SHOP.md`):**
1. **Hapus dari spin wheel** (`Dashboard.tsx:223`) — cepat, 2 menit
2. **ATAU** implementasi efeknya (2 jam):
   ```typescript
   // Di Result.tsx atau QuizSessionContext saat hitung coins_earned
   let coinMultiplier = 1;
   if (profile.inventory.item_coin_booster > 0) {
     coinMultiplier = 2;
     // Decrement usage counter (max 3 kuis)
   }
   coinsEarned = baseCoins * coinMultiplier;
   ```

---

## 4. BALANCE ISSUES SUMMARY

| Issue | Severity | Impact | Fix Effort |
|-------|----------|--------|------------|
| `item_kesempatan_kedua` behavior bug | 🔴 HIGH | User confusion, item wasted | 1 jam (ada plan) |
| `item_kesempatan_kedua` + `item_shield` redundant | 🟡 MEDIUM | Confusing, 6 nyawa terlalu OP di survival | 30 menit (differentiate) |
| `item_terawangan` fake data misleading | 🟠 HIGH (ethics) | User trust issue | 5 menit (ubah copy) |
| `item_coin_booster` dead code | 🟡 MEDIUM | User dapat tapi tidak berguna | 2 menit (hapus dari spin) |
| `item_hint` source sama dengan explanation | 🟢 LOW | Hint terlalu detail kadang | 2 jam (buat hint terpisah) |
| `item_skor_ganda` refund jika tidak terpakai | 🟢 LOW | Item terbuang jika timer habis | 30 menit |
| `item_streak_protector` no UI feedback | 🟡 MEDIUM | User tidak tahu kapan terpakai | 1 jam |

---

## 5. REKOMENDASI PRIORITAS

### Sprint Ini (Critical)
1. **FIX:** `item_kesempatan_kedua` popup konfirmasi (`POWERUP_FIX_PLAN.md`) — 1 jam
2. **FIX:** `item_terawangan` ubah copy jadi "Prediksi AI" — 5 menit
3. **FIX:** Hapus `item_coin_booster` dari spin wheel — 2 menit

### Sprint Berikutnya (Polish)
4. **IMPROVE:** Feedback UI untuk `item_streak_protector` — 1 jam
5. **IMPROVE:** `item_waktu_beku` visual feedback (cyan timer + "FROZEN" text) — 30 menit
6. **DISCUSS:** Survival balance — 6 nyawa terlalu mudah? Pertimbangkan kurangi max usage

### Backlog (Nice-to-have)
7. **ENHANCE:** `item_hint` field terpisah di database — 3 jam
8. **ENHANCE:** `item_skor_ganda` refund jika tidak terpakai — 30 menit
9. **IMPLEMENT:** `item_coin_booster` efek real — 2 jam

---

## 6. OVERALL VERDICT

**Grade:** 🟡 **B (Good, needs polish)**

**Strengths:**
- ✅ PvP power-ups engaging dan balanced
- ✅ Anti-cheat di `item_waktu_beku` solid
- ✅ Max usage limits mencegah exploit
- ✅ Power-up restrictions per mode masuk akal

**Weaknesses:**
- 🔴 1 bug kritis (`item_kesempatan_kedua`)
- 🟡 2 ethical issues (`item_terawangan` fake data, `item_coin_booster` ghost)
- 🟡 Survival mode bisa terlalu mudah (6 nyawa ekstra)

**Action:** Fix 3 critical items (total 1 jam 7 menit) sebelum launch ke production.
