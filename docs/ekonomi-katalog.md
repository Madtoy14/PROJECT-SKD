# Katalog Ekonomi SKDQuest

Update: 22 Jul 2026  
Rate: **1 koin = Rp10**  
Payment next: **Mayar** (belum diintegrasi)

## Rate & top-up

| Paket | Koin | Harga IDR |
|---|---:|---:|
| Pemula | 500 | 5.000 |
| Hemat | 1.300 | 10.000 |
| Favorit | 4.000 | 25.000 |
| Sultan | 10.000 | 50.000 |

## Mode

| Mode | Biaya |
|---|---|
| Latihan | 2 energy |
| Survival | 3 energy |
| PvP | 3 energy |
| Tryout standar | **1.000 koin (Rp10.000)** |
| Tryout akbar | 1.500 koin (Rp15.000) |

## Power-up

| Item | Koin | ≈ IDR | Catatan |
|---|---:|---:|---|
| Hint | 40 | 400 | |
| 50:50 | 60 | 600 | |
| Waktu beku | 70 | 700 | |
| Energy +5 | 80 | 800 | |
| Skor ganda | 90 | 900 | |
| Terawangan | 100 | 1.000 | |
| Tinta hitam | 100 | 1.000 | PvP |
| **Shield** | **120** | 1.200 | Pasang manual; salah tetap aman |
| Streak protector | 120 | 1.200 | |
| **Kesempatan kedua** | **160** | 1.600 | Popup setelah salah |
| Lompatan kilat | 180 | 1.800 | PvP |

Sell-back: **45%** harga beli (server).

## Paket premium (unlock permanen)

| Jenis | Koin | ≈ IDR |
|---|---:|---:|
| Paket topik dasar | 700 | 7.000 |
| Paket topik lanjutan | 900 | 9.000 |
| Tryout akbar pembahasan | 1.000 | 10.000 |
| Spesialis BUMN | 1.500 | 15.000 |

## File yang harus sinkron

- FE: `src/lib/coins.ts`, `src/pages/Shop.tsx`, `src/pages/Dashboard.tsx`
- SQL: `supabase/functions/rpc/purchase_item.sql`, `sell_item.sql`
- Apply cepat: `supabase/update-economy-catalog.sql`

## Shield vs Kesempatan Kedua

- **Shield:** dipasang manual saat mengerjakan → salah langsung aman.
- **Kesempatan Kedua:** setelah salah muncul popup konfirmasi pakai/tidak.
- Jangan digabung; fungsi berbeda.
