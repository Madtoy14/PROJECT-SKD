# Plan — Settings Keamanan + Password (Google-only)

**Tanggal:** 24 Jul 2026  
**Status:** DISKUSI SELESAI — tunggu "gas" / "lanjut implement"  
**Repo:** SKD_WEB · branch `master`  
**Prod:** https://skdquest.vercel.app  
**Terkait:** `docs/plan-auth-manual-diskusi.md`, `docs/audit-post-wave-abc.md`

---

## Keputusan user (final)

| Q | Keputusan |
|---|---|
| Q1 Route Settings | **`/settings`** terpisah (Profile padat) |
| Q2 Setelah set password | **Session tetap**; toast sukses; **tidak** force logout |
| Q3 Scope Settings MVP | **Keamanan saja** (bukan tema/notif/hapus akun) |
| Q4 Forgot copy di Auth | **Ya**, patch di PR yang sama |
| Q5 UI/UX desktop + mobile | **1 kolom card** + entry sidebar/Profile; **bukan** bottom nav; **bukan** fullscreen shell |

---

## Domain

1. User Google-only sering **tanpa** identity `email`/password.
2. **Buat/ubah password** = `supabase.auth.updateUser({ password })` saat **sudah login**.
3. **Forgot** di `/auth` = recovery untuk yang **sudah** punya password; copy jujur untuk Google-only.
4. Deteksi: `user.identities?.some(i => i.provider === 'email')`.
5. Min password **8** (sama Auth signup).
6. Tidak account linking 2 user; tidak magic link/OTP.

---

## UI/UX — mobile & desktop (final)

### Pola nav app (existing)

- **Mobile:** top bar + hamburger sidebar + bottom nav
- **Desktop:** sidebar kiri collapse 88px → expand hover
- Fullscreen (tanpa chrome): `/quiz`, `/auth`, `/onboarding`, result/review

### Entry point Settings

| Surface | Perilaku |
|---|---|
| Mobile sidebar | Item **Pengaturan** (gear) **di atas** Logout |
| Desktop sidebar | Gear dekat logout (expand: label “Pengaturan”) |
| Profile | Gear di header profil (secondary) |
| Bottom nav | **Jangan** tambah tab (slot mahal) |

Active state: highlight gear / item saat `pathname === '/settings'`.

### Shell halaman

- `/settings` **tetap pakai chrome app** (bottom nav mobile + sidebar desktop).
- **Jangan** masuk `hideNavPaths` / fullscreen seperti quiz.
- **Jangan** modal Settings mengganti route.

### Layout konten (YAGNI)

**Satu pola mobile + desktop:** card 1 kolom centered.

```
Mobile                          Desktop
[←] Pengaturan                  (content area di kanan app sidebar)
────────────────                max-w-lg / max-w-xl mx-auto
Keamanan                        card sama seperti mobile
Email (read-only, wrap)
Metode: Google · Password ✓/—

[ Buat / Ubah password ]
  password + show/hide
  konfirmasi
  [Simpan] full-width / primary

[ Keluar ] danger outline
```

- Header halaman: **back** (`navigate(-1)` atau ke `/profile`) + judul “Pengaturan”.
- Mobile: sticky page header di bawah top bar app; padding `safe-area`; touch target ≥ 44px.
- Desktop: **tanpa** master-detail 2-pane dulu. Rail kiri section (“Keamanan | …”) **nanti** kalau section ≥ 2.
- Form full width di card; error/success di dalam card + toast.
- Logout di Settings **dan** di sidebar app (duplikat OK).

### Interaksi

- Submit: disable double-click; loading di tombol Simpan.
- Sukses set/ubah password: toast; **session tetap**; refresh `identities` di state lokal.
- Keyboard: Enter submit form.
- Tidak perlu focus trap (bukan modal).

### Anti-pola UI

- Settings di bottom nav
- Fullscreen hide chrome
- Desktop modal kecil untuk form password
- 2-pane settings kosong “untuk nanti”

---

## Scope MVP

### `/settings` — Keamanan
- Email (read-only dari session)
- Badge metode: Google / Email+password
- Form **Buat password** jika `!hasPassword`
- Form **Ubah password** jika `hasPassword` (password baru + konfirmasi; MVP tanpa current password re-check)
- Tombol **Keluar** (signOut → `/auth`)

### `Auth.tsx` — Forgot copy
- Teks: lupa password hanya jika sudah set password.
- Google-only: masuk Google dulu → set password di Pengaturan.

### Out of scope
- Tema, notifikasi, hapus akun, unlink Google
- Force re-login setelah set password
- Nickname di Settings
- 2-pane settings nav

---

## Step implementasi (kecil)

| Step | Kerja | File |
|---|---|---|
| S1 | Route `/settings` + ProtectedRoute; **jangan** hideNav | `App.tsx` |
| S2 | Entry **Pengaturan** di mobile sidebar + desktop sidebar (gear) | `App.tsx` |
| S3 | Halaman Settings 1-kolom card (mobile+desktop) | `src/pages/Settings.tsx` (baru) |
| S4 | Entry gear di Profile | `Profile.tsx` |
| S5 | Copy forgot jujur | `Auth.tsx` |
| S6 | Manual cek + `npm test` + `npm run build` | — |

**Handlers Settings:**
```ts
// hasPassword = identities includes provider 'email'
await supabase.auth.updateUser({ password: newPassword })
// toast; session tetap; refresh identities jika perlu
await supabase.auth.signOut() // hanya tombol Keluar
```

---

## Cek manual

1. Login Google (belum password) → Settings (sidebar + Profile gear) → Buat password → toast → tetap login.  
2. Logout → login email+password OK.  
3. Settings → Ubah password → login password baru OK.  
4. `/auth` Lupa password: copy sebut Google → Settings.  
5. User email-only: Settings tampil Ubah password.  
6. **Mobile:** bottom nav tetap; form proporsional ~360–430px; back + gear sidebar.  
7. **Desktop:** sidebar gear + card centered; hover expand label “Pengaturan”.  
8. Build lolos.

---

## Checklist

- [x] Q1–Q4 dijawab  
- [x] Q5 UI/UX mobile+desktop dijawab  
- [x] S1–S5 implement (`Settings.tsx`, route, sidebar, Profile gear, Auth copy)  
- [ ] Manual cek  
- [ ] Commit + push + deploy  

**Handoff:** bilang **gas** / **lanjut implement** untuk coding.
