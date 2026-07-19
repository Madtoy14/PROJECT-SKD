# Audit UI/UX Detail — SKDQuest
**Tanggal**: 2026-07-18  
**Sumber**: Screenshot 1055–1069 (15 tangkapan layar aktual)  
**URL**: `http://localhost:5173`  
**Platform**: React + Vite

---

## 1. VISUAL DESIGN AUDIT

### 1.1 Color Palette
**Primary Colors:**
- Blue primary: `#2563EB` (tombol CTA "Mulai Sekarang", "Liga" badge)
- Dark navy: `#0F172A` (sidebar background)
- White: `#FFFFFF` (main content background)

**Mode Cards:**
- Hijau tosca: Latihan Harian (accent: `#10B981` area)
- Merah: Survival Mode (accent: `#EF4444` area)
- Biru: PvP Battle (accent: `#3B82F6` area)
- Ungu: Try Out Mode (accent: `#8B5CF6` area)

**Status Indicators:**
- Energi: icon petir merah `#EF4444`
- Koin: icon koin emas `#F59E0B`
- XP bar: gradient biru-ungu
- Timer: hijau countdown `#10B981`

**Masalah:**
- Contrast ratio pilihan jawaban (light blue selected vs white) →  perlu dicek WCAG AA compliance
- Orange "TKP — Pilih jawaban terbaik" banner bisa lebih prominent

### 1.2 Typography
**Detected:**
- Heading: Sans-serif bold (likely Inter/system font)
- Body: Sans-serif regular
- Ukuran heading h1: ~32px ("Mode Permainan")
- Ukuran card title: ~20px ("Latihan Harian", "Survival Mode")
- Ukuran soal: ~18-20px
- Ukuran pilihan jawaban: ~16px

**Masalah:**
- Soal text bisa lebih besar (min 18px untuk readability)
- Line-height soal agak rapat → rekomendasi `line-height: 1.6`

### 1.3 Spacing & Layout
**Dashboard (Screenshot 1055):**
- Sidebar: 80px fixed width
- Content padding: ~32px
- Card gaps: ~16px grid
- Card internal padding: ~24px

**Quiz (Screenshot 1057-1058):**
- Top progress bar: 8px height, full-width
- Content max-width: ~1100px centered
- Soal card padding: ~32px
- Pilihan jawaban gap: ~12px
- Bottom toolbar padding: ~16px

**Positif:**
- Spacing konsisten
- White space cukup breathable

**Improvement:**
- Bottom toolbar powerup bisa lebih prominent (ukuran icon 24px → 28px)

---

## 2. COMPONENT-LEVEL BREAKDOWN

### 2.1 Sidebar Navigation
**Terlihat:**
- Logo "SQ" (SKDQuest) di atas
- 6 menu items:
  1. Home
  2. Pembahasan
  3. Catatan
  4. Liga
  5. Quest
  6. Toko
  7. Profil

**Icons:** Minimalist, konsisten style

**State:**
- Active state: blue background highlight
- Hover state: tidak terlihat di screenshot

**Masalah:**
- Icon "Pembahasan" (buku terbuka) kurang jelas → pertimbangkan icon list/check
- Label terlalu kecil (~12px) → min 14px

### 2.2 Player Header (Dashboard)
**Elemen:**
- Avatar (rounded, gradien ungu)
- Username: "Akmal"
- Level badge: "Lvl 23"
- Rank badge: "👑 Mythic"
- XP bar: "480/1K XP"
- Liga badge: "🏆 Liga" (blue pill)
- Energy indicator: ⚡ "25/25"
- Coin balance: 🪙 "833,746"

**Positif:**
- Informasi lengkap, tidak overwhelming
- Badge hierarchy jelas (rank > liga)

**Improvement:**
- XP bar terlalu subtle → bisa lebih tebal (6px → 8px)
- Rank "Mythic" badge bisa lebih prominent (icon lebih besar)

### 2.3 Mode Cards (Dashboard)
**Layout:** 2x2 grid + 1 evaluasi card bawah

**Card 1: Latihan Harian (Hijau)**
- Icon: 💪 (fitness/training)
- Title: "Latihan Harian"
- Subtitle: "Asah kemampuanmu setiap hari"
- Cost: ⚡ "3 Energi"
- CTA: "Mulai Sekarang" (blue button)

**Card 2: Survival Mode (Merah)**
- Badge: "HARDCORE"
- Icon: 🎯 (target)
- Title: "Survival Mode"
- Subtitle: "1 Kesalahan = Game Over"
- Cost: ⚡ "2 Energi"

**Card 3: PvP Battle (Biru)**
- Badge: "MULTIPLAYER"
- Icon: ⚔️ (crossed swords)
- Title: "PvP Battle"
- Subtitle: "Main bareng maks 50 player"
- Cost: ⚡ "2 Energi"

**Card 4: Try Out Mode (Ungu)**
- Badge: "PREMIUM"
- Icon: 🏆 (trophy)
- Title: "Try Out Mode"
- Subtitle: "Simulasi SKD"
- Cost: 🪙 "1,500 Koin"

**Card 5: Buku Catatan Salah (Bawah)**
- Badge: "EVALUASI"
- Icon: 📖 (book)
- Title: "Buku Catatan Salah"
- Subtitle: "99 soal menunggu dipelajari ulang"
- Cost: ⚡ "0 Energi"

**Masalah:**
- Card border terlalu subtle → bisa pakai shadow atau border 1px
- Badge position inconsistent (kanan atas vs inline title)
- CTA "Mulai Sekarang" hanya di Latihan Harian → user bingung interaksi lain

**Recommendation:**
- Semua card clickable area harus jelas (hover state + cursor pointer)
- Tambah hover lift effect (`transform: translateY(-4px)`)

### 2.4 Quiz Interface (Screenshot 1057-1058)

**Header:**
- Close button (X) kiri atas
- Progress text: "Soal 1/10"
- Category badge: "BAGIAN: TKP" (orange pill)
- Progress bar: blue fill, gray background
- Timer: "44" (hijau, circular, kanan atas)

**Instruction Banner:**
- Background: light orange `#FEF3C7`
- Text: "TKP — Pilih jawaban terbaik. Setiap pilihan memiliki bobot poin berbeda (10-50)."
- Icon: ⚠️

**Soal Card:**
- Background: white
- Border-radius: 12px
- Shadow: subtle
- Text: "Transparansi dalam pelayanan publik berarti..."
- Font-size: 18px
- Padding: 32px

**Pilihan Jawaban:**
- Layout: vertical stack, 4 options (A-D)
- Border: 1px solid gray (unselected)
- Border: 2px solid blue (selected, screenshot 1057)
- Border-radius: 8px
- Padding: 16px
- Label: "A", "B", "C", "D" (left, bold)
- Text: 16px regular

**Screenshot 1058 difference:**
- Timer: "21" (dari 44 → user menghabiskan 23 detik)
- Selected option: D (dari C di 1057)

**Bottom Toolbar (Powerups):**
- Background: white
- Border-top: 1px solid gray
- 5 powerup buttons:
  1. 🎯 50:50 (24) — hapus 2 jawaban salah
  2. 🔶 Petunjuk (19) — hint
  3. ⏱️ Waktu Beku (87) — freeze timer
  4. 💎 Skor Ganda (52) — double score
  5. 👁️ Terawangan (165) — lihat jawaban mayoritas

**Masalah:**
- Powerup labels terlalu kecil (10px?) → min 12px
- Icon size inconsistent (emoji native → pakai icon library)
- Jumlah stok "(24)" kurang visible → bisa lebih besar + warna berbeda
- Tidak ada tooltip hover → user baru tidak tahu fungsi

**Improvement:**
- Tambah tooltip on hover
- Disabled state (powerup habis) harus lebih jelas (opacity 0.4 + cursor not-allowed)
- Active state (powerup dipakai) harus ada visual feedback

### 2.5 Try Out Page (Screenshot 1058 - pembahasan URL)
**URL**: `http://localhost:5173/pembahasan`

**Header:**
- Title: "Try Out" (bold, 32px)
- Subtitle: "Pilih paket Try Out untuk menguji kemampuan Anda dan lihat pembahasannya."

**Tabs:**
- "Daftar Paket" (active)
- "Riwayat Nilai" (inactive)

**Cards:**
**Card 1: Try Out Akbar CPNS #1**
- Badge: "Terbuka" (hijau, kiri atas)
- Icon: 📖
- Title: "Try Out Akbar CPNS #1"
- Description: "Paket Try Out Akbar Nasional + Pembahasan Lengkap menggunakan sistem CAT. Uji kesiapan Anda secara nyata!"
- Stats: "110 Soal" | "Skor Maks: 550"
- CTA: "Mulai Sekarang" (blue button)
- Link: "Lihat Pembahasan >" (text link)

**Card 2-3:**
- Badge: "Dalam Pengembangan" (abu, locked icon)
- State: disabled (grayscale + "Segera Hadir" button disabled)

**Masalah:**
- "Dalam Pengembangan" badge terlalu netral → pakai "🔒 Coming Soon" lebih friendly
- Card disabled tidak jelas locked reason → tambah tooltip "Akan tersedia tanggal X"

---

## 3. INTERACTION DESIGN

### 3.1 User Flows Verified
✅ **Dashboard → Quiz:**
1. User klik "Mulai Sekarang" (Latihan Harian)
2. Redirect ke `/quiz`
3. Soal 1 muncul
4. User pilih jawaban (border berubah biru)
5. Timer countdown
6. User bisa pakai powerup
7. Next soal (progress bar + "Soal X/10" update)

✅ **Dashboard → Try Out:**
1. User klik "Try Out Mode"
2. Redirect ke `/pembahasan`
3. User lihat daftar paket
4. User klik "Mulai Sekarang"
5. Start try-out quiz

### 3.2 Missing Interactions (perlu validasi kode)
❓ **Back navigation:**
- Apakah user bisa klik X (close) di quiz? → kemana redirect?
- Apakah ada konfirmasi "Yakin keluar? Progress akan hilang"?

❓ **Powerup usage:**
- Klik powerup → apa yang terjadi? Modal? Langsung apply?
- Setelah pakai 50:50 → apakah 2 pilihan langsung hilang atau fade out?

❓ **Timer habis:**
- Auto-submit jawaban kosong?
- Modal "Waktu Habis!"?
- Lanjut ke soal berikutnya atau game over?

❓ **Answer submission:**
- Kapan jawaban di-submit? Klik "Next"? Auto setelah pilih?
- Ada visual feedback "Jawaban disimpan ✓"?

---

## 4. RESPONSIVE DESIGN (TIDAK TERLIHAT DI SCREENSHOT)

**Asumsi dari layout:**
- Desktop-first design (sidebar 80px fixed)
- Mobile: sidebar jadi bottom tab bar?
- Tablet: sidebar collapse?

**Testing required:**
- [ ] Mobile portrait (375px)
- [ ] Mobile landscape (667px)
- [ ] Tablet (768px)
- [ ] Desktop (1280px, 1920px)

---

## 5. ACCESSIBILITY AUDIT

### 5.1 Keyboard Navigation
**Perlu test:**
- [ ] Tab order: sidebar → header → mode cards → bottom
- [ ] Focus indicator visible (outline 2px blue)
- [ ] Quiz: Tab antar pilihan jawaban
- [ ] Quiz: Enter untuk submit
- [ ] Quiz: Number key (1-4) untuk pilih A-D
- [ ] Escape untuk close modal/quiz

### 5.2 Screen Reader
**Perlu test:**
- [ ] Sidebar menu items: `<nav>` + `aria-label="Main navigation"`
- [ ] Mode cards: `<button>` atau `<a>` dengan descriptive text
- [ ] Quiz: `<fieldset>` + `<legend>` untuk soal
- [ ] Progress bar: `role="progressbar"` + `aria-valuenow`
- [ ] Timer: `aria-live="polite"` untuk countdown
- [ ] Powerup: `aria-label` descriptive (e.g., "50:50, hapus 2 jawaban salah, 24 tersisa")

### 5.3 Color Contrast (WCAG AA)
**Perlu check:**
- [ ] Text on blue button: white on `#2563EB` (likely pass)
- [ ] Sidebar text: white on `#0F172A` (pass)
- [ ] Selected answer: text on light blue (need check — might fail)
- [ ] Timer green: `#10B981` on white (pass)
- [ ] Orange banner text: dark on `#FEF3C7` (likely pass)

**Tool:** https://webaim.org/resources/contrastchecker/

---

## 6. PERFORMANCE CONSIDERATIONS

### 6.1 Ukuran File Screenshot
- 1055: 123KB → homepage ringan ✅
- 1057-1065: ~87-125KB → quiz interface ringan ✅
- 1066: 263KB → ada elemen tambahan (modal? image?)
- 1069: 720KB 🔴 → **sangat besar, perlu optimasi**

**Hypothesis 1069:**
- Halaman hasil dengan banyak data (rekap 10 soal)
- Chart/grafik skor (canvas/svg heavy)
- Unoptimized images

**Action:**
- [ ] Inspect 1069 DOM: cari large image/svg
- [ ] Lazy load chart library
- [ ] Compress image assets (WebP)

### 6.2 React Performance
**Perlu profiling:**
- [ ] Quiz re-render per detik (timer countdown)
- [ ] Powerup state update efficiency
- [ ] Large list rendering (Try Out pembahasan: 110 soal)

**Optimization:**
- Use `React.memo` untuk answer options
- `useMemo` untuk powerup filtered list
- Virtual scroll untuk pembahasan list (react-window)

---

## 7. BRANDING & POLISH

### 7.1 Positif
✅ Consistent color palette  
✅ Mode cards punya personality (badge + icon + warna)  
✅ Gamification elements visible (level, rank, energi, koin)  
✅ "Mythic" rank badge adds prestige feel  

### 7.2 Improvement
⚠️ Logo "SQ" terlalu simple → bisa lebih stylized  
⚠️ Font pairing generic → consider custom font (e.g., Poppins untuk heading)  
⚠️ Emoji native (`👑`, `⚡`, `🪙`) → inconsistent rendering cross-platform → ganti icon library (Lucide/Heroicons)  
⚠️ Tidak ada empty state illustration (e.g., "Belum ada catatan salah" → pakai illustration)  

---

## 8. COMPETITIVE ANALYSIS (QUICK)

**Compared to:**
- Quizizz: SKDQuest lebih clean, less cluttered ✅
- Kahoot: SKDQuest lebih serius, less playful (good for SKD context) ✅
- Ruangguru: SKDQuest powerup lebih engaging ✅
- Zenius: SKDQuest gamification lebih prominent ✅

**SKDQuest unique selling point:**
- Survival Mode (hardcore)
- PvP Battle (multiplayer)
- Powerup system (strategic gameplay)
- Liga ranking (competitive)

---

## 9. PRIORITIZED RECOMMENDATIONS

### 🔴 High Priority (Must-Fix)
1. **Accessibility:** Keyboard nav + screen reader labels
2. **Performance:** Optimize hasil page (1069: 720KB)
3. **UX Safety:** Exit confirmation di quiz
4. **Contrast:** Verify WCAG AA compliance selected answer

### 🟡 Medium Priority (Should-Fix)
5. **Interaction feedback:** Powerup tooltips + active state
6. **Card affordance:** Hover state semua mode cards
7. **Typography:** Bump soal font-size ke 20px, line-height 1.6
8. **Icon consistency:** Replace emoji dengan icon library

### 🟢 Low Priority (Nice-to-Have)
9. **Branding:** Custom logo + font pairing
10. **Empty state:** Illustration untuk buku catatan kosong
11. **Dark mode:** Toggle di profil
12. **Micro-interactions:** Hover lift, button ripple

---

## 10. NEXT STEPS

### Immediate Actions
```bash
# 1. Accessibility audit
npm install @axe-core/react
# Add <AxeDevTools /> di App.tsx (dev only)

# 2. Performance profiling
npm install --save-dev vite-plugin-inspect
# Check bundle size: npm run build && ls -lh dist/assets/

# 3. Contrast check
# Manual: https://webaim.org/resources/contrastchecker/
# Screenshot setiap kombinasi warna text+bg
```

### Code Review Focus
- `src/pages/Quiz.tsx` → interaction logic
- `src/components/PowerupBar.tsx` → tooltip implementation
- `src/pages/Dashboard.tsx` → card hover states
- `src/components/PlayerProfileModal.tsx` → hasil page optimization

### User Testing (5 users)
- Task 1: "Mulai Latihan Harian, kerjakan 3 soal"
- Task 2: "Pakai powerup 50:50"
- Task 3: "Keluar dari quiz (X button)"
- Task 4: "Buka Try Out paket pertama"

**Observe:**
- Apakah user bingung interaksi powerup?
- Apakah user takut klik X (takut progress hilang)?
- Apakah user notice timer countdown?

---

## 11. KESIMPULAN

**Overall Rating: 7.5/10**

**Strengths:**
- Clean visual hierarchy
- Engaging gamification
- Unique powerup system
- Mode variety clear

**Weaknesses:**
- Accessibility incomplete (keyboard, screen reader)
- Interaction feedback subtle (hover, active states)
- Performance concern (hasil page 720KB)
- Missing safety nets (exit confirmation, disabled state clarity)

**Verdict:** Core UX solid. Polish + accessibility pass needed before public launch.

**Timeline Estimate:**
- High priority fixes: 3-5 hari
- Medium priority: 5-7 hari
- Low priority: 2-3 hari
- **Total: 10-15 hari kerja** untuk production-ready UI/UX.
