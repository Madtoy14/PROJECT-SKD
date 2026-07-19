# Riset Kompetitor & Rekomendasi — SKDQuest

**Tanggal**: 2026-07-18  
**Tujuan**: Memetakan landscape aplikasi belajar SKD CPNS + rekomendasi arah SKDQuest

---

## 1. LANDSCAPE KOMPETITOR

### Tier 1 — Platform Besar (Millions Users)

| Platform | Model | Konten | UI/UX | Kelemahan buat SKDQuest exploit |
|---|---|---|---|---|
| **Ruangguru** | Freemium + Premium | Ribuan video + bank soal | Sangat matang, feature-heavy | Bloated — banyak fitur enggak relevan buat CPNS-focused user. Loading lambat. Overwhelming buat yg cuma mau tryout. |
| **Zenius** | Premium | Konseptual + soal | Clean, minimal | Kurang gamification. Pembahasan kaku. Enggak ada survival/PvP. |
| **Pahamify** | Freemium | Video animasi + tryout | Good, playful | Targetnya pelajar sekolah, bukan CPNS. Soal SKD terbatas. |
| **Skuliv** | Premium | Bank soal + tryout | Functional | UI outdated. Enggak ada realtime feedback/gamification. |

### Tier 2 — Aplikasi Tryout KHUSUS CPNS (Android Play Store)

| Aplikasi | Download | Fitur | Kelemahan |
|---|---|---|---|
| **Tryout CPNS 2025** (berbagai publisher) | 100K-1M | Soal CAT, timer, skor | UI jelek, iklan banyak, soal recycle, enggak ada pembahasan meaningful, zero gamification |
| **CatCPNS** | 100K+ | Simulasi CAT | UI basic, no multiplayer, no powerup |
| **Jagoketik CPNS** | 50K+ | Ketik cepat + soal | Niche banget, soal terbatas |
| **Bank Soal CPNS 2025** | 500K+ | Ribuan soal | Enggak ada sistem progres, soal random, UI kampungan |

### Tier 3 — Bimbel Offline yg Go Online

| Bimbel | Online Platform | Catatan |
|---|---|---|
| **Nurul Fikri** | MyNF | Web portal berat, UX jadul |
| **Ganesha Operation** | GO Digital | Soal bagus, UI mediocre |
| **Bahana** | Bahana Online | Terbatas |
| **ASN Institute** | Web | Konten bagus, UI ketinggalan 10 tahun |

### Tier 4 — Resmi Pemerintah

| Platform | Tujuan | Kondisi |
|---|---|---|
| **SSCASN BKN** | Pendaftaran & pengumuman | Bukan buat belajar. UI bikin frustasi. |
| **CAT BKN** | Ujian resmi | Hanya untuk ujian beneran, bukan latihan. |

---

## 2. GAP ANALYSIS — Celah Pasar SKDQuest

### 2.1 Gap Utama

| Gap | Kompetitor | SKDQuest Opportunity |
|---|---|---|
| **Gamification** | Nyaris nggak ada di apps CPNS. Yang ada cuma leaderboard basic | ✅ Survival Mode, PvP Battle, Powerup, Liga — ini **unik** di pasar CPNS |
| **Real-time feedback** | Apps lain kasih skor di akhir | ✅ Powerup 50:50, petunjuk, terawangan — bikin belajar jadi aktif |
| **Mobile-first** | Web competitor berat & nggak responsif | ✅ SKDQuest lighter, mobile-ready |
| **Soal berkualitas** | Banyak soal asal-asalan | ✅ Kalau curated dengan baik, ini moat |
| **Pembahasan interaktif** | Text panjang, membosankan | ✅ Video/diagram pembahasan bisa jadi killer feature |
| **Komunitas/kompetisi** | Nggak ada | ✅ PvP + Liga bisa bikin sticky |

### 2.2 SWOT SKDQuest

**Strengths:**
- UI bersih, modern (beda 10 tahun dari kompetitor CPNS)
- Powerup system — engaging, beda dari yg lain
- Mode variety (latihan/survival/pvp/tryout) — coverage lengkap
- Gamification loop: XP → Level → Rank → Liga
- Energy system → kontrol engagement

**Weaknesses:**
- Soal masih terbatas (~275 soal, sebagian AI-generated kurang bagus)
- Belum mobile-native (web app)
- Accessibility belum ada
- Belum ada pembahasan interaktif
- Content depth (belum ada materi belajar, cuma soal)

**Opportunities:**
- Pasar CPNS setiap tahun: ~4-5 juta pendaftar
- Belum ada kompetitor dengan UI modern + gamification di niche ini
- Bisa expand ke PPPK, Sekolah Kedinasan (STAN, IPDN, dll)
- Monetisasi: topup koin, tryout premium, paket soal eksklusif
- Potensi B2B: kerja sama dengan bimbel/bpsdm/kampus

**Threats:**
- Ruangguro/Zenius bisa copy fitur dengan cepat
- Platform BKN resmi punya autoritas
- Soal bocor bisa jadi isu
- Users seasonal (rame pas pendaftaran, sepi pas gak ada jadwal)

---

## 3. REKOMENDASI ARAH SKDQuest

### 3.1 Short-term (1-2 pekan) — Fix Foundation

1. **Prioritas 1: Kualitas Soal**
   - Hapus soal AI-generated yg jelek. Ganti manual curated.
   - Tambah pembahasan tiap soal (minimal text).
   - Target: 500 soal berkualitas dulu > 2000 soal asal-asalan.

2. **Prioritas 2: Core UX Safety**
   - ✅ Exit confirmation di quiz ("Yakin keluar? Progress akan hilang")
   - ✅ Loading state tiap transisi
   - ✅ Error handling kalo fetch soal gagal

3. **Prioritas 3: Mobile Polish**
   - ✅ Bottom tab untuk mobile (sidebar collapse)
   - ✅ Touch targets min 44px
   - ✅ Test di 375px (mobile)

### 3.2 Mid-term (3-6 pekan) — Build Moat

1. **Pembahasan Interaktif**
   - Bukan cuma text, tapi reveal step-by-step
   - Kenapa A salah, kenapa B benar (reasoning tree)
   - Bisa bookmark pembahasan yg susah

2. **Sistem Kesulitan Adaptif**
   - Soal berikutnya berdasarkan performa user
   - Kalo sering salah TKP → kasih lebih banyak TKP

3. **Mode Belajar (Bukan Cuma Tes)**
   - Ringkasan materi per bagian (TWK, TIU, TKP)
   - Progress mastery per sub-topik
   - "Hari ke-X belajar" streak

4. **Sekolah Kedinasan Expansion**
   - STAN, IPDN, STMKG, Poltekim, dll.
   - Passing grade berbeda → need separate track

### 3.3 Long-term (3-6 bulan) — Scale

1. **Mobile App (Flutter/React Native)**
   - Push notification reminder
   - Offline soal
   - Better performance

2. **B2B / Partnership**
   - White-label untuk bimbel
   - Dashboard untuk guru/pengajar
   - Kelas tryout kampus

3. **Soal Marketplace**
   - Creator bisa upload soal (curated)
   - Revenue share

4. **AI-Powered Features**
   - Generate soal mirip berdasarkan kesalahan user
   - Rangkuman kelemahan user otomatis
   - Chat tutor AI

---

## 4. VISUAL PERBANDINGAN: SKDQuest vs Kompetitor

| Fitur | Ruangguru | Zenius | Tryout CPNS apps | SKDQuest |
|---|---|---|---|---|
| UI Modern | ✅ | ✅ | ❌ | ✅✅ |
| Gamification | ❌ | ❌ | ❌ | ✅✅✅ |
| Powerup | ❌ | ❌ | ❌ | ✅✅✅ |
| Survival Mode | ❌ | ❌ | ❌ | ✅✅ |
| PvP Battle | ❌ | ❌ | ❌ | ✅✅ |
| Pembahasan | ✅ text/video | ✅ text | ❌ | ⚠️ belum |
| Adaptive Soal | ❌ | ❌ | ❌ | ❌ |
| Mobile App | ✅ | ✅ | ✅ | ⚠️ web only |
| Soal Quality | ✅✅ | ✅ | ❌ | ⚠️ mixed |
| Offline | ❌ | ❌ | ✅ | ❌ |
| Harga | Mahal (150k+/bln) | Mahal | Gratis (iklan) | Free + topup |

---

## 5. RECOMMENDED NEXT ACTIONS (dari audit UI/UX + riset)

```
PEKAN 1:
  ☐ Fix exit confirmation quiz
  ☐ Hapus soal AI jelek, tambah 50 soal curated
  ☐ Hover state + cursor pointer semua card
  ☐ Powerup tooltip

PEKAN 2:
  ☐ Pembahasan minimal text tiap soal
  ☐ Mobile responsive (bottom tab, touch target)
  ☐ Empty state illustration
  ☐ Loading state tiap transisi

PEKAN 3:
  ☐ Soal adaptive (berdasarkan performa)
  ☐ Mode belajar / ringkasan materi
  ☐ Streak system "Hari ke-X"
  ☐ Liga leaderboard lebih interaktif
```

---

## 6. KESIMPULAN

**Pasar SKD CPNS** — 4-5 juta peserta/tahun, **TIDAK ADA** kompetitor dengan:
- UI modern + mobile-first
- Gamification (survival, pvp, powerup)
- Sistem progres engaging (level, rank, liga)

**SKDQuest punya first-mover advantage** di niche "gamified SKD prep".
Kuncinya: **kualitas soal + pembahasan** adalah moat sebenarnya.
Gamification itu hook, konten itu retention.

Fokus sekarang: fix core UX safety → kualitas konten → mobile polish.
Jangan nambah fitur baru sampai foundation solid.
