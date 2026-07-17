# POWERUP FIX PLAN — SKDQuest
**Tanggal:** 17 Juli 2026  
**Scope:** Quiz.tsx power-up logic fixes  
**Priority:** HIGH

---

## Masalah yang Ditemukan

### 1. `item_kesempatan_kedua` — Behavior Salah (BUG)
**Kondisi sekarang:**
- `item_kesempatan_kedua` dan `item_shield` **diperlakukan identik** — keduanya butuh `perisaiActive = true` sebelum menjawab
- Tidak ada perbedaan UX antara dua item ini
- User yang punya `item_kesempatan_kedua` tapi lupa aktifkan `perisaiActive` = item tidak terpakai, langsung game over

**Behavior yang benar:**
- `item_shield` = **aktifkan sebelum jawab** (pasif, proaktif) — behavior sekarang sudah benar
- `item_kesempatan_kedua` = **popup konfirmasi SETELAH jawab salah** (reaktif) — perlu diubah

**Flow target:**
```
User jawab salah (survival mode)
  ├── perisaiActive === true (shield aktif)?
  │     └── konsumsi item_shield, lanjut kuis ✅ (behavior existing, keep)
  └── perisaiActive === false?
        ├── punya item_kesempatan_kedua?
        │     └── tampilkan popup: "Pakai Kesempatan Kedua? (stok: X)"
        │           ├── YA → konsumsi item, lanjut kuis
        │           └── TIDAK / timeout 5 detik → triggerSuddenDeath()
        └── tidak punya → triggerSuddenDeath() langsung
```

---

### 2. `item_terawangan` — Fake Data (MISLEADING UX)
**Kondisi sekarang:**
- Persentase dihitung dari `opt.text.length * 7 % 20 + 60` — pseudorandom berbasis panjang teks
- Bukan data real crowd

**Options:**
- **A (Recommended):** Tambahkan label kecil "estimasi" / "prediksi AI" bukan "tebakan pengguna lain" — ubah copy saja, 5 menit
- **B:** Implementasi real crowd data via Supabase — agregat jawaban per soal, berat, skip dulu

**Decision:** Opsi A dulu. Ubah label di Shop.tsx dan tooltip di Quiz.tsx.

---

### 3. `item_streak_protector` — Dead Feature (COIN LOSS)
**Kondisi sekarang:**
- Bisa dibeli di Shop.tsx
- Tidak ada handler di manapun — coin hilang, tidak ada efek

**Fix:** Nonaktifkan dari `POWER_UPS` array di Shop.tsx sampai diimplementasi, atau implementasi sekarang (mudah).

**Implementasi streak protector** (30 menit):
- Cek `last_claim_date` di Dashboard.tsx saat login
- Jika user punya `item_streak_protector > 0` dan streak seharusnya reset → konsumsi item, pertahankan streak
- Lokasi: `src/pages/Dashboard.tsx` atau `src/lib/supabase.ts`

---

### 4. `item_coin_booster` — Dead Interface (TECHNICAL DEBT)
**Kondisi sekarang:**
- Ada di `UserProfile` interface (`src/lib/supabase.ts:39`)
- Tidak ada di `POWER_UPS` array Shop.tsx
- Tidak ada handler di Quiz.tsx

**Fix:** Hapus dari interface, atau implementasi. Pilih satu.

---

## Actionable Tasks

### SPRINT INI (High Priority)

| ID | Task | File | Effort | Impact |
|----|------|------|--------|--------|
| **PU-01** | Pisahkan logika `item_kesempatan_kedua` dari `item_shield` — tambah state `showSecondChanceModal` + popup konfirmasi inline | `src/pages/Quiz.tsx:640-664` | 1 jam | Fix bug behavior |
| **PU-02** | Ubah copy `item_terawangan` dari "tebakan mayoritas pengguna" → "prediksi berdasarkan pola jawaban" | `src/pages/Shop.tsx:14`, `src/pages/Quiz.tsx` | 5 menit | Fix misleading |
| **PU-03** | Nonaktifkan `item_streak_protector` di Shop.tsx (comment out dari array `POWER_UPS`) | `src/pages/Shop.tsx:18` | 1 menit | Stop coin loss |

### SPRINT BERIKUTNYA (Medium Priority)

| ID | Task | File | Effort | Impact |
|----|------|------|--------|--------|
| **PU-04** | Implementasi `item_streak_protector` — cek saat login, konsumsi jika streak mau reset | `src/pages/Dashboard.tsx` | 30 menit | Fitur live |
| **PU-05** | Putuskan `item_coin_booster`: implement atau hapus dari interface | `src/lib/supabase.ts:39` | 15 menit | Clean up |

---

## Detail Implementasi PU-01

### State baru di Quiz.tsx

```typescript
// Tambah state (sekitar line 145)
const [showSecondChanceModal, setShowSecondChanceModal] = useState(false);
const [pendingGameOverData, setPendingGameOverData] = useState<{
  earned: number;
  optionId: string;
} | null>(null);
```

### Modifikasi logika survival (line 640-664)

```typescript
if (gameMode === 'survival' && ((!isTKP && !isCorrect) || (isTKP && earned < 5))) {
  
  // Shield: aktif manual sebelum jawab (behavior existing — keep)
  if (activePowerUps.perisaiActive) {
    if (profile?.inventory?.item_shield > 0 && checkPowerupLimit('item_shield')) {
      setPowerUpUsageCount(p => ({ ...p, item_shield: (p.item_shield || 0) + 1 }));
      updateProfile({ inventory: { ...profile.inventory, item_shield: profile.inventory.item_shield - 1 } })
        .then(p => setProfile(p));
      setActivePowerUps(p => ({ ...p, perisaiActive: false }));
      // lanjut kuis
    } else {
      setActivePowerUps(p => ({ ...p, perisaiActive: false }));
      triggerSuddenDeath();
      return;
    }
  }
  
  // Kesempatan Kedua: popup SETELAH jawab salah (behavior baru)
  else if (profile?.inventory?.item_kesempatan_kedua > 0 && checkPowerupLimit('item_kesempatan_kedua')) {
    // Pause game, tampilkan modal konfirmasi
    setPendingGameOverData({ earned, optionId });
    setShowSecondChanceModal(true);
    return; // Tahan game over sampai user konfirmasi
  }
  
  // Tidak ada proteksi → game over
  else {
    triggerSuddenDeath();
    return;
  }
}
```

### Handler konfirmasi modal

```typescript
const handleSecondChanceConfirm = (useIt: boolean) => {
  setShowSecondChanceModal(false);
  if (!useIt || !pendingGameOverData || !profile?.inventory) {
    // User tolak atau tidak ada data — game over
    if (pendingGameOverData) triggerSuddenDeathWith(pendingGameOverData.earned, pendingGameOverData.optionId);
    setPendingGameOverData(null);
    return;
  }
  // Konsumsi item, lanjut kuis
  setPowerUpUsageCount(p => ({ ...p, item_kesempatan_kedua: (p.item_kesempatan_kedua || 0) + 1 }));
  updateProfile({ inventory: { ...profile.inventory, item_kesempatan_kedua: profile.inventory.item_kesempatan_kedua - 1 } })
    .then(p => setProfile(p));
  setPendingGameOverData(null);
  // Lanjut ke soal berikutnya secara normal
};
```

### UI Modal (inline di Quiz.tsx, tidak perlu file baru)

```tsx
{/* Second Chance Confirmation Modal */}
{showSecondChanceModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl text-center">
      <div className="text-4xl mb-3">💔</div>
      <h2 className="font-black text-lg text-fg mb-1">Jawaban Salah!</h2>
      <p className="text-fg-muted text-sm mb-4">
        Pakai <span className="font-bold text-red-500">Kesempatan Kedua</span>?<br/>
        <span className="text-xs">Stok: {profile?.inventory?.item_kesempatan_kedua}x</span>
      </p>
      {/* Auto-timeout countdown visual optional */}
      <div className="flex gap-3">
        <Button
          onClick={() => handleSecondChanceConfirm(false)}
          variant="custom"
          className="flex-1 py-3 border border-border rounded-xl text-fg-muted font-bold hover:bg-slate-50"
        >
          Tidak
        </Button>
        <Button
          onClick={() => handleSecondChanceConfirm(true)}
          variant="custom"
          className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold"
        >
          Pakai! ❤️
        </Button>
      </div>
    </div>
  </div>
)}
```

### Tombol di powerup bar (pisahkan dari Shield)

```tsx
{/* Shield — aktifkan sebelum jawab */}
{profile.inventory?.item_shield > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_shield') && (
  <Button onClick={togglePerisai} ...>
    <Shield size={14}/> Perisai ({profile.inventory.item_shield})
  </Button>
)}

{/* Kesempatan Kedua — tidak perlu tombol aktifkan, bekerja otomatis saat jawab salah */}
{profile.inventory?.item_kesempatan_kedua > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_kesempatan_kedua') && (
  <span className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-red-50 border-red-200 text-red-500 flex items-center gap-1.5">
    <Heart size={14}/> Kesempatan ({profile.inventory.item_kesempatan_kedua})
    <span className="text-[10px] opacity-60">oa-claude-sonnet-4.6</span>
  </span>
)}
```

> Label "auto" kecil di bawah ikon → user tahu item ini reaktif, tidak perlu diaktifkan manual.

---

## Urutan Eksekusi

```
1. PU-03 → nonaktifkan streak_protector di Shop (1 menit)
2. PU-02 → ubah copy terawangan (5 menit)
3. PU-01 → implementasi second chance modal (1 jam)
   a. Tambah state showSecondChanceModal + pendingGameOverData
   b. Pisahkan logika kesempatan_kedua dari shield di line 640
   c. Tambah handleSecondChanceConfirm()
   d. Tambah UI modal inline
   e. Pisahkan tombol di powerup bar (shield sendiri, kesempatan_kedua label "auto")
   f. Build verify
4. PU-05 → putuskan coin_booster (15 menit)
```

---

## Files Terdampak

| File | Perubahan |
|------|-----------|
| `src/pages/Quiz.tsx` | State baru, logika survival refactor, modal UI, powerup bar UI |
| `src/pages/Shop.tsx` | Comment out streak_protector, ubah copy terawangan |
| `src/lib/supabase.ts` | (Opsional) Hapus item_coin_booster dari interface |

**Total effort: ~1.5 jam**
