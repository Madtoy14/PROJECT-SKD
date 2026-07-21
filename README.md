# SKDQuest 🚀

SKDQuest adalah platform simulasi dan pembelajaran interaktif untuk mempersiapkan ujian Seleksi Kompetensi Dasar (SKD) CPNS. Aplikasi ini memadukan latihan soal dengan elemen **Gamifikasi** yang kuat agar proses belajar menjadi lebih menyenangkan, adiktif, dan efektif.

## ✨ Fitur Utama

- **Mode Ujian Lengkap**: Tersedia tipe soal standar SKD (TWK, TIU, TKP) yang disimulasikan semirip mungkin dengan kondisi aslinya.
- **Sistem Gamifikasi**: Pemain dapat mengumpulkan Koin, XP (Experience Points), naik Level, serta mempertahankan *Streak* harian.
- **Multi-Game Modes**: 
  - **Latihan**: Mode santai untuk fokus memahami materi.
  - **Tryout**: Simulasi penuh dengan batasan waktu yang disesuaikan.
  - **Survival Mode**: Jawab benar untuk bertahan, energi akan terkuras drastis jika salah menjawab.
  - **PvP / Battle**: Bertanding skor secara *real-time* melawan pemain lain atau melawan Bot.
- **Buku Catatan Salah**: Mengarsipkan secara otomatis soal-soal yang salah dijawab, memungkinkan pengguna melakukan *drill* ulang pada kelemahannya hingga mencapai tingkat keahlian (*Mastery*).
- **Toko & Power-ups**: Sistem *Inventory* yang berisi bantuan strategis saat kuis (seperti *50:50*, *Waktu Beku*, *Skor Ganda*, *Perisai*, dll) yang bisa dibeli menggunakan koin.
- **Daily Spin (Klaim Harian)**: Roda keberuntungan (*Spin Wheel*) harian untuk mendapatkan hadiah tambahan seperti energi atau koin secara gratis.
- **Liga / Leaderboard**: Peringkat pemain secara global berdasarkan akumulasi skor mereka.
- **Responsive & PWA Ready**: Aplikasi bisa diakses lewat Desktop maupun Mobile Browser, serta dapat di-instal layaknya aplikasi native (*Progressive Web App*).

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Edge Functions, Authentication)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: React Router DOM
- **Test**: Vitest

## 📂 Struktur Direktori Utama

- `/src/pages` — halaman utama
- `/src/components` — UI reusable
- `/src/lib` — Supabase helpers
- `/src/__tests__` — unit tests
- `/supabase/migrations` — migration SQL berurutan
- `/supabase/functions` — Edge Functions + RPC SQL
- `/docs` — dokumentasi & progress remediation

## 🚀 Setup & Instalasi (Development)

**Node:** `^20.19.0 || >=22.12.0`

1. **Clone**
   ```bash
   git clone https://github.com/Madtoy14/PROJECT-SKD.git
   cd PROJECT-SKD
   ```

2. **Install (reproducible)**
   ```bash
   npm ci
   ```

3. **Environment**
   Salin `.env.example` → `.env` lalu isi:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Jalankan lokal**
   ```bash
   npm run dev
   ```
   Default: `http://localhost:5173`.

## ✅ Quality gates

```bash
npm run lint
npm test
npm run build
```

## 📦 Build (Produksi)

```bash
npm run build
```
Output di `dist/`. Deploy target: Vercel.

## 🗄️ Migration Supabase

Lihat urutan apply di `supabase/migrations/README.md`.  
**Backup dulu** sebelum apply ke production.

---
*Dibuat untuk membantu pejuang NIP.*
