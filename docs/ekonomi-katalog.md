# Katalog Ekonomi SKDQuest

**Update:** 22 Jul 2026  
**Commit acuan:** `cf36eec`  
**Rate kanonis:** **1 koin = Rp10**  
**Payment next:** Mayar (belum diintegrasi)  
**Status:** FE + SQL katalog sudah diselaraskan

---

## 1. Prinsip

1. Harga display FE **harus sama** dengan katalog server.
2. Authority pembelian/penjualan: RPC `purchase_item` / `sell_item`.
3. Client **tidak** boleh menentukan harga final.
4. F2P tetap hidup lewat energy regen + reward harian.
5. Bayar = comfort (power-up, tryout, unlock paket).

---

## 2. Konversi koin ↔ IDR

```ts
// src/lib/coins.ts
COIN_RATE.base = 10 // 1 koin = Rp10
```

| Koin | IDR |
|---:|---:|
| 1 | Rp10 |
| 100 | Rp1.000 |
| 1.000 | Rp10.000 |
| 10.000 | Rp100.000 |

Helper:
- `coinsToIdr(coins)`
- `idrToCoins(idr)`

---

## 3. Paket top-up (Mayar nanti)

Sumber: `src/lib/coins.ts` → `PACKAGES`

| ID | Label | Koin | Harga IDR | Bonus (display) | Efektif |
|---|---|---:|---:|---:|---|
| `pkg_500` | Koin Pemula | 500 | **5.000** | 0% | Rp10/koin |
| `pkg_1300` | Koin Hemat | 1.300 | **10.000** | ~8% | ~Rp7,7/koin |
| `pkg_4000` | Koin Favorit | 4.000 | **25.000** | ~20% | ~Rp6,3/koin |
| `pkg_10000` | Koin Sultan | 10.000 | **50.000** | ~25% | Rp5/koin |

### Aturan Mayar (nanti)
- Order pakai `package_id`, **bukan** nominal bebas client.
- Server map `package_id` → `coins` + `price_idr`.
- Webhook verifikasi nominal + order_id + signature.
- Credit koin atomik + idempotent.

### UI sekarang
`TopUpModal` masih flow WhatsApp/`request_topup` (legacy). Nanti diganti Mayar.

---

## 4. Biaya mode bermain

Sumber display: `src/pages/Dashboard.tsx` + `MODE_COSTS` di `coins.ts`

| Mode | Biaya | Catatan |
|---|---|---|
| Latihan harian | **2 energy** | Loop harian murah |
| Survival | **3 energy** | Lebih “event” |
| PvP | **3 energy** | Match cost |
| Catatan salah | **0 energy** | Tetap ramah F2P |
| **Tryout standar** | **1.000 koin (≈ Rp10.000)** | Harga utama — tidak murahan, tidak kejam |
| Tryout akbar / event | **1.500 koin (≈ Rp15.000)** | Premium / event |

### Rekomendasi produk (belum semua di-code)
- **1× free tryout / minggu** (retensi + trust)
- Entry tryout tetap 1.000; jangan turun ke 500 (terasa murahan)

---

## 5. Power-up (shop)

Sumber display: `src/pages/Shop.tsx`  
Authority: `purchase_item` / `sell_item`

| ID | Nama | Koin | ≈ IDR | Peran |
|---|---|---:|---:|---|
| `item_hint` | Bocoran Rumus | 40 | 400 | Util dasar |
| `item_5050` | Eliminasi 50:50 | 60 | 600 | Util dasar |
| `item_waktu_beku` | Waktu Beku | 70 | 700 | Comfort |
| `item_energy_refill` | Isi Ulang Energi (+5) | 80 | 800 | Convenience |
| `item_skor_ganda` | Skor Ganda | 90 | 900 | Semi-premium |
| `item_terawangan` | Prediksi AI | 100 | 1.000 | Soft premium |
| `item_tinta_hitam` | Tinta Hitam (PvP) | 100 | 1.000 | PvP |
| `item_shield` | **Perisai Survival** | **120** | 1.200 | Preventif |
| `item_streak_protector` | Streak Protector | 120 | 1.200 | Retention |
| `item_kesempatan_kedua` | **Kesempatan Kedua** | **160** | 1.600 | Reaktif |
| `item_lompatan_kilat` | Lompatan Kilat (PvP) | 180 | 1.800 | PvP strong |

### Sell-back
- Rate: **45%** harga beli
- Rumus server: `max(1, floor(cost * 0.45))`
- Hanya item inventory (bukan paket premium / avatar)

Contoh:
- 50:50 beli 60 → jual **27**
- Kesempatan kedua beli 160 → jual **72**

---

## 6. Shield vs Kesempatan Kedua (wajib beda)

| | Shield / Perisai | Kesempatan Kedua |
|---|---|---|
| **Cara pakai** | Dipasang **manual** sebelum/saat mengerjakan | Muncul **setelah salah** |
| **UX** | Toggle aktif | Popup “pakai / tidak?” |
| **Timing** | Proactive | Reactive |
| **Harga** | 120 koin | 160 koin |
| **Value** | Proteksi terencana | Penyelamat momen |

### Aturan anti-OP (implementasi gameplay)
- Max 1 shield efektif per nyawa/soal
- Kesempatan kedua max 1–2× per run survival
- Tidak stack di 1 kesalahan yang sama
- Konsumsi idealnya lewat `consume_powerup` (Fase A utang non-blocker)

---

## 7. Paket premium (unlock permanen)

Sumber: `Shop.tsx` + SQL katalog

| ID | Nama | Koin | ≈ IDR |
|---|---|---:|---:|
| `paket_premium_tkp_1` | Paket Soal Rahasia TKP 1 | 700 | 7.000 |
| `paket_premium_tkp_2` | Paket Soal Rahasia TKP 2 | 700 | 7.000 |
| `paket_premium_tiu_1` | Trik TIU Numerik 1 | 700 | 7.000 |
| `paket_premium_twk_1` | Hafalan UUD TWK 1 | 700 | 7.000 |
| `paket_premium_tiu_2` | Trik TIU Analitis 2 | 900 | 9.000 |
| `paket_premium_twk_2` | Pilar Negara TWK 2 | 900 | 9.000 |
| `paket_tryout_akbar_1` | Try Out Akbar CPNS 1 | 1.000 | 10.000 |
| `paket_tryout_akbar_2` | Try Out Akbar CPNS 2 | 1.000 | 10.000 |
| `paket_spesialis_bumn` | Simulasi Khusus BUMN | 1.500 | 15.000 |

Catatan:
- Ini **bukan** entry fee tryout.
- Entry tryout = 1.000 koin per attempt.
- Paket di atas = unlock konten/pembahasan permanen.

---

## 8. Avatar

| Item | Koin | ≈ IDR |
|---|---:|---:|
| Avatar berbayar (per karakter) | 200 | 2.000 |

(Free avatar tetap `is_free` di tabel `characters`.)

---

## 9. Target reward F2P (arah desain)

Agar harga item di atas terasa adil, target user aktif **tanpa top-up**:

| Sumber | Target |
|---|---|
| Daily claim | 20–50 koin (streak 7: ~100, 30: ~300) |
| Spin gratis 1×/hari | Hadiah kecil dominan |
| Selesai latihan | 15–40 koin |
| Quest harian total | ~100–200 koin |
| **Total harian aktif** | **~150–300 koin** |

Cukup 1–3 power-up/hari, tidak infinite.

> Reward numbers di atas = **target desain**.  
> Pastikan RPC reward (`complete_quiz_session`, daily claim, spin) tidak meledak di luar rentang ini.

---

## 10. Contoh value user

### User gratis aktif
- Dapat ~200 koin/hari
- Main latihan + 1 survival
- Beli 1×50:50 (60) + 1 hint (40) → masih sisa

### Top-up Rp10.000 (~1.300 koin)
- 1 tryout (1.000) + sisa ~300 untuk power-up
- Value jelas: **1 tryout + stok kecil**

### Top-up Rp25.000 (~4.000 koin)
- 2–3 tryout + stok power-up 1–2 minggu

---

## 11. File yang wajib sinkron

| Layer | File |
|---|---|
| FE rate + packages | `src/lib/coins.ts` |
| FE shop display | `src/pages/Shop.tsx` |
| FE mode costs | `src/pages/Dashboard.tsx` |
| SQL buy authority | `supabase/functions/rpc/purchase_item.sql` |
| SQL sell authority | `supabase/functions/rpc/sell_item.sql` |
| Apply cepat Supabase | `supabase/update-economy-catalog.sql` |
| Docs | `docs/ekonomi-katalog.md` (file ini) |

### Checklist saat ubah harga
1. Ubah `coins.ts` (kalau constant dipakai)
2. Ubah display `Shop.tsx` / `Dashboard.tsx`
3. Ubah SQL `purchase_item` + `sell_item`
4. Update `update-economy-catalog.sql`
5. Update docs ini
6. Apply SQL di Supabase
7. Redeploy FE
8. Smoke: beli 1 item, cek potongan koin = harga server

---

## 12. Yang sudah / belum

### Sudah
- [x] Rate Rp10/koin
- [x] Harga power-up 40–180
- [x] Shield 120 vs Kesempatan Kedua 160 (pisah)
- [x] Tryout 1.000 koin
- [x] Mode energy 2/3/3
- [x] Paket premium 700–1500
- [x] Sell 45%
- [x] SQL update one-shot

### Belum (next)
- [ ] Apply `supabase/update-economy-catalog.sql` di Supabase production
- [ ] Integrasi Mayar (order + webhook + credit atomik)
- [ ] Free tryout mingguan
- [ ] Semua power-up consume lewat `consume_powerup`
- [ ] Tuning reward harian agar pas 150–300 koin/hari
- [ ] Starting balance user baru (usulan 300–500 koin)

---

## 13. Perintah apply server (penting)

Di Supabase SQL Editor, jalankan:

`supabase/update-economy-catalog.sql`

Tanpa ini, FE sudah harga baru tapi server bisa masih harga lama (atau sebaliknya saat mismatch).

---

## 14. Ringkas keputusan final

| Keputusan | Nilai |
|---|---|
| Rate | 1 koin = **Rp10** |
| Tryout standar | **1.000 koin (Rp10.000)** |
| Shield | **120** — pasang manual |
| Kesempatan kedua | **160** — popup setelah salah |
| Sell-back | **45%** |
| Top-up | 5k / 10k / 25k / 50k |
| Payment | Mayar (nanti) |
