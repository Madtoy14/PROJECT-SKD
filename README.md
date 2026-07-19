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

- **Frontend**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Edge Functions, Authentication)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: React Router DOM

## 📂 Struktur Direktori Utama

- `/src/pages` - Komponen halaman utama (Dashboard, Quiz, Result, Profile, Toko, dll).
- `/src/components` - Komponen UI yang dapat digunakan kembali (*MathCard*, *AnimatedCounter*, *LoadingSkeleton*, dll).
- `/src/lib` - Konfigurasi dan *helper functions* utilitas (Koneksi Supabase, logika *fetch* data, dll).
- `/supabase` - Skrip SQL dan konfigurasi database Supabase.

## 🚀 Setup & Instalasi (Development)

1. **Clone repository ini**
   ```bash
   git clone <repo-url>
   cd project-skd
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**
   Buat file `.env` di _root directory_ dan masukkan kredensial Supabase Anda:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Jalankan Aplikasi Lokal**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173`.

## 📦 Build (Produksi)

Untuk melakukan build (kompilasi untuk _deployment_):
```bash
npm run build
```
Hasil build akan tersimpan di dalam folder `dist/`.

---
*Dibuat untuk membantu pejuang NIP.*
