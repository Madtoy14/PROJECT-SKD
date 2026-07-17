# RANCANGAN SHOP & SISTEM KOIN — SKDQuest
**Tanggal:** 17 Juli 2026  
**Scope:** Ekonomi koin, konversi IDR, payment gateway, audit celah

---

## 1. PETA EKONOMI KOIN SAAT INI

### Sumber Koin (Earn)
| Sumber | Jumlah | Lokasi Kode |
|--------|--------|-------------|
| Daily claim streak 1-6 hari | +2 koin | `Dashboard.tsx:540` (base bonus=2) |
| Daily claim streak 7+ hari | +10 koin | `Dashboard.tsx:546` |
| Daily claim streak 30+ hari | +50 koin | `Dashboard.tsx:543` |
| Spin wheel — koin kecil | +25 koin | `Dashboard.tsx:221` |
| Spin wheel — koin medium | +100 koin | `Dashboard.tsx:221` |
| Spin wheel — jackpot | +500 koin | `Dashboard.tsx:225` |
| Spin tambahan (beli) | -100 koin/spin | `Dashboard.tsx:235` |
| Quiz selesai | `coins_earned` dari server | `Result.tsx:354` |
| Sell back item | 50% harga item | `Shop.tsx → sell_item RPC` |
| Top up | Beli paket | `TopUpModal.tsx` |

### Pengeluaran Koin (Spend)
| Pengeluaran | Jumlah | Lokasi |
|-------------|--------|--------|
| Mode Tryout | 1500 koin | `Dashboard.tsx:15` |
| Beli power-up | 150–500 koin | `Shop.tsx POWER_UPS` |
| Beli avatar/paket premium | varies | `Shop.tsx` |
| Spin tambahan | 100 koin | `Dashboard.tsx:235` |

### Masalah Ditemukan di Ekonomi

**CELAH-01: Daily claim terlalu kecil**
- Streak 30 hari → 50 koin/hari. Untuk beli 1 item termurah (150 koin) butuh 3 hari claim.
- User yang tidak top up merasa progress terlalu lambat → churn.
- **Rekomendasi:** Naikkan base bonus atau tambah coin reward dari kuis.

**CELAH-02: Quiz coin reward tidak transparan**
- `coins_earned` dari server via `QuizSessionContext:311` — kalkulasi di RPC `complete_session`.
- Client tidak tahu formula → user tidak tahu cara maksimalkan earn.
- **Rekomendasi:** Tampilkan formula di result page: "Benar × 5 koin, bonus streak ×1.2"

**CELAH-03: item_coin_booster ada di spin wheel tapi tidak ada handler**
- `Dashboard.tsx:223` — bisa dapat dari spin, tapi efek tidak diimplementasi.
- User dapat item ini → tidak tahu fungsinya → confusion.
- **Fix:** Hapus dari spin wheel rewards ATAU implementasi efeknya.

**CELAH-04: Tryout 1500 koin terlalu mahal relatif terhadap earn rate**
- Butuh 30 hari daily claim (30 hari × 50 koin) hanya untuk 1x tryout.
- Target user: mahasiswa — bisa jadi barrier serius.
- **Rekomendasi:** Pertimbangkan model: 1x tryout gratis/minggu, lebih dari itu bayar koin.

---

## 2. LOGIKA KONVERSI KOIN ↔ IDR

### Prinsip Dasar
```
1 Koin = Rp100 (nilai referensi)
```

### Tabel Paket Top Up (Saat Ini + Rekomendasi)

| Paket | Koin | Harga IDR | Per Koin | Bonus | Status |
|-------|------|-----------|----------|-------|--------|
| Pemula | 50 | Rp5.000 | Rp100 | 0% | ✅ Keep |
| Favorit | 200 | Rp18.000 | Rp90 | +10% | ✅ Keep |
| Sultan | 500 | Rp40.000 | Rp80 | +20% | ✅ Keep |
| **Baru: Mega** | **1500** | **Rp110.000** | **Rp73** | **+27%** | 🆕 Tambah |

**Rationale Paket Mega:**
- Tryout cost 1500 koin = Rp150.000 di harga normal → terlalu mahal
- Paket Mega Rp110.000 dapat tepat 1500 koin → tryout 1x + sisa koin untuk power-up
- Psikologis: user tidak hitung "Rp per tryout", mereka beli paket

### Formula Konversi Balik (IDR → Koin untuk display)
```typescript
// Canonical — satu tempat, tidak tersebar
export const COIN_RATE = {
  base: 100,        // 1 koin = Rp100
  packages: {
    pkg_50:   { coins: 50,   price: 5000,   bonus_pct: 0  },
    pkg_200:  { coins: 200,  price: 18000,  bonus_pct: 10 },
    pkg_500:  { coins: 500,  price: 40000,  bonus_pct: 20 },
    pkg_1500: { coins: 1500, price: 110000, bonus_pct: 27 },
  }
} as const;

// Helper: berapa koin yang user dapat kalau beli Rp X
export const idrToCoins = (idr: number): number =>
  Math.floor(idr / COIN_RATE.base);

// Helper: berapa IDR nilai koin user (untuk display, bukan untuk jual)
export const coinsToIdr = (coins: number): number =>
  coins * COIN_RATE.base;
```

**Masalah Sekarang:** `PACKAGES` array di `TopUpModal.tsx` hardcode duplikat — tidak sync dengan harga di `Shop.tsx`. Perlu satu source of truth.

---

## 3. OPSI PAYMENT GATEWAY

### Evaluasi Berdasarkan Konteks SKDQuest

| Gateway | QRIS Fee | Setup | Approval | Cocok |
|---------|----------|-------|----------|-------|
| **Midtrans** | 0.7% | Mudah | 3-5 hari | ✅ Recommended |
| **Xendit** | 0.7% | Mudah | 3-5 hari | ✅ Alternatif |
| **Duitku** | 0.8% | Sangat mudah | 1-2 hari | ✅ Indie-friendly |
| **Tripay** | 0.5% | Mudah | 1-3 hari | ✅ Fee paling murah |
| **Stripe** | 2.9%+ | Mudah | Instant | ❌ Mahal, IDR kurang support |
| **Manual WA** | 0% | Sudah ada | — | ⚠️ Hanya untuk MVP |

### Rekomendasi: Tripay
- Fee QRIS 0.5% — paling murah di antara semua opsi
- Support: QRIS, VA BCA/BRI/Mandiri/BNI, GoPay, OVO, Dana
- Approval cepat, cocok untuk developer indie/startup kecil
- Tidak ada minimum volume

**Fee contoh:**
```
Rp5.000   → fee Rp25   (0.5%)
Rp18.000  → fee Rp90
Rp40.000  → fee Rp200
Rp110.000 → fee Rp550
```

### Arsitektur Payment Flow (Tripay / Midtrans)

```
[TopUpModal] user pilih paket
    ↓
[Supabase Edge Function: create-payment]
    → call Tripay/Midtrans API (server-side — API key aman)
    → return payment_url + transaction_id
    ↓
[Frontend] buka payment_url di modal/tab baru
    ↓
[User bayar via QRIS/VA/ewallet]
    ↓
[Tripay/Midtrans kirim webhook]
    ↓
[Supabase Edge Function: payment-webhook]
    → verifikasi signature (WAJIB — cegah fake webhook)
    → verifikasi amount sesuai paket
    → call RPC add_coins(user_id, coins_amount)
    ↓
[RPC add_coins — atomic]
    → UPDATE profiles SET coins = coins + p_amount WHERE id = p_user_id
    → INSERT transactions (audit trail)
    → RETURN new balance
    ↓
[Realtime update balance di UI via Supabase Realtime]
```

### Hal Kritis di Webhook Handler

```typescript
// supabase/functions/payment-webhook/index.ts

// 1. Verifikasi signature DULU sebelum proses apapun
const signature = req.headers.get('X-Callback-Signature'); // Tripay
const expectedSig = crypto.createHmac('sha256', TRIPAY_PRIVATE_KEY)
  .update(JSON.stringify(body)).digest('hex');
if (signature !== expectedSig) return 401;

// 2. Cek status pembayaran = PAID (bukan PENDING)
if (body.status !== 'PAID') return 200; // ignore non-paid

// 3. Idempotency — cegah double credit
const existing = await supabase.from('topup_orders')
  .select('id').eq('external_id', body.reference).single();
if (existing.data) return 200; // sudah diproses, skip

// 4. Verify amount sesuai paket (bukan dari body)
const pkg = PACKAGES[body.merchant_ref]; // lookup dari canonical
if (!pkg || body.total_amount < pkg.price) return 400;

// 5. Baru credit koin
await supabase.rpc('add_coins', { p_user_id, p_amount: pkg.coins });
```

---

## 4. MASALAH LAIN DI SISTEM KOIN

### CELAH-05: Spin Wheel — Koin Client-Side Update
**Lokasi:** `Dashboard.tsx:286`
```typescript
coins: newCoins,  // dihitung client
```
Spin result dihitung client, update langsung ke `updateProfile`. Tidak ada validasi server-side apakah spin benar-benar dilakukan.

**Eksploitasi:** User bisa call `updateProfile({ coins: 99999 })` langsung dari console.

**Fix:** Pindah logika spin ke RPC `spin_wheel`:
```sql
CREATE FUNCTION spin_wheel(p_user_id UUID) RETURNS JSONB AS $$
DECLARE
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_result TEXT;
  v_coins INT;
BEGIN
  -- Cek sudah spin hari ini
  IF (SELECT last_spin_date FROM profiles WHERE id = p_user_id) = v_today THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Sudah spin hari ini');
  END IF;
  -- Random server-side (tidak bisa dimanipulasi)
  v_result := CASE FLOOR(RANDOM() * 100)::INT
    WHEN < 3  THEN 'coins_500'   -- 3% jackpot
    WHEN < 23 THEN 'coins_100'   -- 20% medium
    ELSE           'coins_25'    -- 77% small
  END;
  -- Update atomic
  UPDATE profiles SET last_spin_date = v_today, coins = coins + v_coins WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'result', v_result, 'coins_gained', v_coins);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### CELAH-06: Daily Claim — Tidak Ada Server Validation
**Lokasi:** `Dashboard.tsx:556`
```typescript
updateProfile({ coins: newCoins, streak: newStreak, last_claim_date: todayStr })
```
Sama dengan spin — semua dihitung client, langsung update. Bisa dimanipulasi.

**Fix:** RPC `daily_claim` server-side (sama pola dengan spin_wheel).

### CELAH-07: Tidak Ada Tabel `topup_orders`
Tidak ada idempotency key untuk top up. Kalau webhook dikirim 2x (Tripay/Midtrans retry) → user dapat koin 2x.

**Fix:** Buat tabel sebelum integrate payment gateway:
```sql
CREATE TABLE topup_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  external_id TEXT UNIQUE,  -- reference dari payment gateway
  package_id TEXT,
  amount_idr INTEGER,
  coins INTEGER,
  status TEXT DEFAULT 'pending', -- pending | paid | failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
ALTER TABLE topup_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON topup_orders FOR SELECT USING (auth.uid() = user_id);
```

---

## 5. ACTIONABLE TASKS

### 🔴 CRITICAL (Security)

| ID | Task | File | Effort |
|----|------|------|--------|
| **SH-01** | Pindah spin wheel logic ke RPC server-side | `Dashboard.tsx:270-295` + Supabase SQL | 2 jam |
| **SH-02** | Pindah daily claim logic ke RPC server-side | `Dashboard.tsx:530-560` + Supabase SQL | 2 jam |
| **SH-03** | Buat tabel `topup_orders` (pre-requisite payment gateway) | Supabase SQL | 30 menit |

### 🟠 HIGH (Feature/Economy)

| ID | Task | File | Effort |
|----|------|------|--------|
| **SH-04** | Buat `COIN_RATE` canonical constant — satu source of truth | `src/lib/coinConfig.ts` (file baru) | 20 menit |
| **SH-05** | Tambah paket `pkg_1500` di TopUpModal | `src/components/modals/TopUpModal.tsx` | 10 menit |
| **SH-06** | Hapus `item_coin_booster` dari spin wheel rewards | `Dashboard.tsx:223` | 2 menit |
| **SH-07** | Integrasikan payment gateway (Tripay/Midtrans) | `supabase/functions/` + `TopUpModal.tsx` | 1 hari |

### 🟡 MEDIUM (UX/Balance)

| ID | Task | File | Effort |
|----|------|------|--------|
| **SH-08** | Tampilkan formula earn koin di Result page | `src/pages/Result.tsx` | 30 menit |
| **SH-09** | Evaluasi ulang tryout cost (1500 terlalu tinggi?) | `Dashboard.tsx:15` | Diskusi dulu |
| **SH-10** | Naikkan daily claim base bonus (2 → 5 koin) | `Dashboard.tsx:540` | 1 menit |

---

## 6. URUTAN EKSEKUSI YANG DISARANKAN

```
Phase 1 — Security fixes (sebelum launch payment):
  SH-01 → spin wheel ke RPC
  SH-02 → daily claim ke RPC
  SH-03 → buat tabel topup_orders

Phase 2 — Economy cleanup (1 hari):
  SH-04 → canonical COIN_RATE
  SH-05 → tambah paket Mega 1500
  SH-06 → hapus coin_booster dari spin
  SH-10 → naikkan daily bonus

Phase 3 — Payment integration (1-2 hari):
  SH-07 → integrate Tripay
  Buat edge function create-payment
  Buat edge function payment-webhook (dengan idempotency)
  Test sandbox end-to-end
  Go live
```

---

## 7. SUMMARY MASALAH PER PRIORITAS

| # | Masalah | Severity | Fix Effort |
|---|---------|----------|------------|
| 1 | Spin wheel client-side → exploitable | 🔴 CRITICAL | 2 jam |
| 2 | Daily claim client-side → exploitable | 🔴 CRITICAL | 2 jam |
| 3 | Tidak ada idempotency untuk webhook | 🔴 CRITICAL (pre-payment) | 30 menit |
| 4 | sell_item terima harga dari client | 🟠 HIGH | ✅ SUDAH FIXED |
| 5 | item_coin_booster dead code di spin | 🟠 HIGH | 2 menit |
| 6 | Tidak ada canonical COIN_RATE | 🟡 MEDIUM | 20 menit |
| 7 | Tryout 1500 koin terlalu tinggi | 🟡 MEDIUM | Diskusi |
| 8 | Daily earn terlalu kecil (2 koin/hari) | 🟡 MEDIUM | 1 menit |

---

**Total effort Phase 1+2: ~6 jam**  
**Total effort Phase 3 (payment): ~1-2 hari kerja**
