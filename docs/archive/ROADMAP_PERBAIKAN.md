# Roadmap Perbaikan SKDQuest

Dikelompokkan berdasarkan fase eksekusi + dependensi.

---

## FASE 1 — UI Polish (Quick Win)
*Estimasi: 1–2 hari | No dependency | Frontend only*

| # | Item | Area | Catatan |
|---|---|---|---|
| 9 | Hover lift + cursor pointer semua mode card | Dashboard cards | CSS only |
| 10 | Font soal 20px, line-height 1.6 | Quiz soal card | CSS only |
| 13 | Touch target min 44px | Buttons/options | CSS + cek button size |
| 15 | Stok powerup lebih visible | Powerup labels | Tambah badge angka |
| 11 | Ganti emoji → Lucide/Heroicons | Header, powerup, badge | Konsisten cross-platform |

**Output:** Tampilan lebih premium, konsisten, mobile-friendly.

---

## FASE 2 — Aksesibilitas & UX Safety
*Estimasi: 2–3 hari | Frontend only*

| # | Item | Area | Catatan |
|---|---|---|---|
| 8 | Tooltip powerup + active/disabled state | Powerup bar | Title attr atau tooltip component |
| 12 | Mobile: sidebar → bottom tab | Layout/nav | Breakpoint lg:hidden |
| 14 | Badge locked tryout lebih jelas | Tryout cards | "Dalam Pengembangan" → lock icon |
| 16 | Empty state illustration | Catatan kosong | SVG/illustration |

**Output:** User baru ga bingung, mobile usable, a11y better.

---

## FASE 3 — Brand & Micro-interaction
*Estimasi: 1–2 hari | Frontend only | Low priority*

| # | Item | Area | Catatan |
|---|---|---|---|
| 17 | Logo SQ lebih stylized | Brand | SVG redesign |
| 18 | Font heading custom (Poppins/dll) | Brand | @font-face atau Google Fonts |
| 19 | Micro-interaction (ripple, hover lift) | Global | framer-motion sudah install |
| 20 | Dark mode | Global | Tailwind dark: prefix |

**Output:** Feel premium, brand recognizable.

---

## FASE 4 — Konten & Kualitas Soal
*Estimasi: 3–5 hari | Butuh akses Supabase | Backend + Content*

| # | Item | Area | Catatan |
|---|---|---|---|
| 2 | Hapus soal AI jelek + curate ulang | soal_skd table | Query + manual review |
| 21 | Target 500 soal curated | DB | Bulk insert bertahap |
| 3b | Pembahasan untuk soal Supabase | DB | Kolom explanation |

**Blocker:** Butuh akses Supabase dashboard + query editor.

**Output:** Moat strengthened, retention naik.

---

## FASE 5 — Fitur Produk
*Estimasi: 1–2 minggu | Fullstack | Post-MVP*

| # | Item | Area | Catatan |
|---|---|---|---|
| 22 | Adaptive difficulty | Algorithm + DB | Track performance per user |
| 23 | Mode Belajar (ringkas TWK/TIU/TKP) | New page + content | Materi per bagian |
| 24 | Streak "Hari ke-X" | DB column + UI | Daily habit loop |
| 25 | Track Sekolah Kedinasan | DB + filter | Expand market |
| 26 | PWA / mobile app | Vite plugin + manifest | Offline + push |

**Output:** Product differentiation, retention long-term.

---

## Urutan Rekomendasi

```
FASE 1 (1-2 hari)  ──┐
                      ├── Gas barengan, no dependency
FASE 2 (2-3 hari)  ──┘
        │
        ▼
FASE 3 (1-2 hari)  ── Low priority, skip kalau MVP
        │
        ▼
FASE 4 (3-5 hari)  ── Butuh Supabase access, blocker
        │
        ▼
FASE 5 (1-2 minggu) ── Post-MVP, setelah konten solid
```

**Saran:** Gas FASE 1 + FASE 2 barengan (frontend only, no blocker). FASE 4 tunngu Supabase access.
