# GAME OVER MODAL UPGRADE PLAN — SKDQuest
**Tanggal:** 17 Juli 2026  
**Scope:** Replace browser alert dengan custom modal engaging  
**Priority:** MEDIUM (UX improvement)  
**Effort:** 30 menit

---

## Masalah Saat Ini

**Lokasi:** `src/pages/Quiz.tsx:676`

```typescript
// Line 676 — Browser alert (unprofessional)
setTimeout(() => {
  alert('Satu kesalahan fatal! Game Over.');
}, 100);
```

**Issues:**
1. Browser alert (`localhost:5174 says`) terlihat tidak profesional
2. Tidak ada feedback visual (skor, soal terjawab, koin earned)
3. Tidak ada aksi setelah game over — user harus manual reload/navigate
4. Hilang kesempatan untuk soft-sell power-up atau retry

---

## Target Design

### Visual Hierarchy
```
┌─────────────────────────────────────────┐
│  🔴 [Icon Skull Animated - Bounce]      │
│                                         │
│     Game Over!                          │
│   Satu kesalahan fatal.                 │
│   Tapi kamu sudah hebat!                │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  [Stats Card]                     │  │
│  │  250 Skor | 16 Soal | +50 Koin   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Upsell Power-Up Box — Opsional]      │
│                                         │
│  [Dashboard] [Main Lagi 🔥]            │
│                                         │
│  Beli Power-Up di Toko →                │
└─────────────────────────────────────────┘
```

### Behavior
- Fade in + zoom in animation (300-500ms)
- Background blur overlay
- 2 action buttons: Dashboard (secondary) / Retry (primary)
- Link ke shop di bawah (soft CTA)
- **Opsional:** Upsell box muncul jika user punya koin >= 500

---

## Implementasi Step-by-Step

### Step 1: Tambah State (Line ~148)

**File:** `src/pages/Quiz.tsx`

**Cari section state declarations** (sekitar line 148, setelah `const [isFinishing, setIsFinishing]`):

```typescript
const [isFinishing, setIsFinishing] = useState(false);

// ✅ TAMBAH STATE INI
const [showGameOverModal, setShowGameOverModal] = useState(false);
const [gameOverData, setGameOverData] = useState<{
  finalScore: number;
  questionsAnswered: number;
  coinsEarned: number;
} | null>(null);
```

---

### Step 2: Ubah Trigger Logic (Line ~676)

**Cari function `triggerSuddenDeath()` di dalam `handleSelect`** (line 667-680):

**HAPUS:**
```typescript
setTimeout(() => {
  alert('Satu kesalahan fatal! Game Over.');
}, 100);
```

**GANTI DENGAN:**
```typescript
// Set data untuk modal
setGameOverData({
  finalScore,
  questionsAnswered: currentQuestionIndex + 1,
  coinsEarned: earnedCoins
});

// Tampilkan modal setelah heart broken animation
setTimeout(() => {
  setShowGameOverModal(true);
}, 1000);
```

---

### Step 3: Tambah Modal Component (Sebelum Closing `</div>` Utama)

**Lokasi:** Sebelum line terakhir `</div>` di Quiz.tsx (sekitar line 1527)

**Paste JSX ini:**

```tsx
{/* Game Over Modal — Survival Mode */}
{showGameOverModal && gameOverData && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-8 mx-4 max-w-md w-full shadow-2xl border-2 border-red-200 text-center animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
      
      {/* Icon Animated */}
      <div className="w-20 h-20 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
        <Skull size={48} className="text-white" />
      </div>

      {/* Headline */}
      <h2 className="text-2xl font-black text-red-600 mb-2">Game Over!</h2>
      <p className="text-sm text-red-500 mb-6">
        Satu kesalahan fatal. Tapi kamu sudah hebat! 💪
      </p>

      {/* Stats Card */}
      <div className="bg-white rounded-2xl p-4 mb-6 border border-red-100 shadow-sm">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-red-500">{gameOverData.finalScore}</p>
            <p className="text-xs text-gray-500">Skor</p>
          </div>
          <div>
            <p className="text-2xl font-black text-orange-500">{gameOverData.questionsAnswered}</p>
            <p className="text-xs text-gray-500">Soal</p>
          </div>
          <div>
            <p className="text-2xl font-black text-green-500">+{gameOverData.coinsEarned}</p>
            <p className="text-xs text-gray-500">Koin</p>
          </div>
        </div>
      </div>

      {/* Upsell Box — Hanya tampil jika koin >= 500 */}
      {profile && profile.coins >= 500 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-left">
          <p className="text-xs text-yellow-700 font-bold mb-1 flex items-center gap-1">
            <Lightbulb size={12} /> Tips:
          </p>
          <p className="text-xs text-yellow-600">
            Beli <span className="font-bold">Kesempatan Kedua</span> (500 koin) 
            untuk nyawa ekstra di survival berikutnya!
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mb-3">
        <Button
          onClick={() => {
            setShowGameOverModal(false);
            navigate('/dashboard');
          }}
          variant="custom"
          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold border border-gray-200 transition-all"
        >
          Dashboard
        </Button>
        <Button
          onClick={() => window.location.reload()}
          variant="custom"
          className="flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl font-bold shadow-lg transition-all"
        >
          Main Lagi 🔥
        </Button>
      </div>

      {/* Soft CTA ke Shop */}
      <button
        onClick={() => {
          setShowGameOverModal(false);
          navigate('/toko');
        }}
        className="text-xs text-red-500 hover:text-red-600 font-bold underline transition-colors"
      >
        Beli Power-Up di Toko →
      </button>
    </div>
  </div>
)}
```

---

### Step 4: Import Icon (Jika Belum Ada)

**Cek line ~57** (bagian import Lucide icons):

```typescript
import { X, Check, Trophy, Skull, Users, /* ... */, Lightbulb, Shield } from 'lucide-react';
```

Pastikan `Skull` dan `Lightbulb` sudah di-import. Jika belum, tambahkan.

---

### Step 5: Cleanup Navigation Logic (Opsional)

**Di dalam function `triggerSuddenDeath()` line ~680-690:**

**HAPUS navigation langsung** karena sekarang user pilih sendiri via modal:

```typescript
// ❌ HAPUS INI (karena modal sudah handle navigation)
navigate(`/result/${resultId}`, { 
  state: { 
    score: finalScore, 
    mode: gameMode,
    sessionId,
    userAnswers: { ...answers, [currentQuestionIndex]: optionId },
    quizQuestions: questions
  } 
});
```

**GANTI DENGAN:**

```typescript
// Set game over flag + data — modal akan muncul
setIsGameOver(true);
setGameOverData({
  finalScore,
  questionsAnswered: currentQuestionIndex + 1,
  coinsEarned: earnedCoins
});
setShowGameOverModal(true);
```

**Simpan result ID** di state jika user mau lihat detail:
```typescript
const [gameOverResultId, setGameOverResultId] = useState<string | null>(null);
```

Lalu di modal, tambah tombol "Lihat Detail" yang navigate ke result page.

---

## Testing Checklist

- [ ] Browser alert tidak muncul lagi
- [ ] Modal muncul dengan animasi smooth (fade + zoom)
- [ ] Stats (skor, soal, koin) tampil correct
- [ ] Tombol "Dashboard" redirect ke `/dashboard`
- [ ] Tombol "Main Lagi" reload page (start fresh survival)
- [ ] Link "Beli Power-Up" redirect ke `/toko`
- [ ] Upsell box hanya muncul jika `profile.coins >= 500`
- [ ] Modal z-index lebih tinggi dari konten lain (tidak tertutup navbar)

---

## Files Terdampak

| File | Perubahan |
|------|-----------|
| `src/pages/Quiz.tsx` | + 2 state, ubah triggerSuddenDeath(), + modal JSX (~70 lines) |

**Total LOC:** +~80 lines  
**Total Effort:** 30 menit

---

## Before/After Comparison

| Aspek | Before | After |
|-------|--------|-------|
| **Visual** | Browser alert polos | Custom modal gradient + icon animated |
| **Info** | Hanya teks "Game Over" | Skor + soal + koin earned |
| **Action** | User stuck, harus manual reload | 2 tombol jelas: Dashboard / Retry |
| **Monetization** | Tidak ada | Soft upsell power-up (context-aware) |
| **Brand feel** | Unprofessional (localhost says) | Polished, game-like, engaging |

---

## Optional Enhancements (Fase 2)

1. **Tombol "Lihat Detail"** → navigate ke `/result/{resultId}` dengan full breakdown jawaban
2. **Leaderboard teaser** → "Kamu ranked #12 hari ini. Main lagi untuk naik!"
3. **Achievement unlock** → "🏆 Badge: Survive 15 soal tanpa salah!"
4. **Share button** → Share skor ke social media

---

## Execution Summary for Hermes

```bash
# 1. Buka Quiz.tsx
# 2. Tambah 2 state (line ~148)
# 3. Ubah triggerSuddenDeath logic (line ~676) — hapus alert, set state
# 4. Paste modal JSX sebelum closing </div> (line ~1527)
# 5. Verify import Skull + Lightbulb dari lucide-react
# 6. npm run dev → test survival mode → jawab salah → verify modal muncul
```

**Selesai. Modal game over siap digunakan.**
