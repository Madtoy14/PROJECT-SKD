# Plan Auth Manual — Login / Sign Up / Forgot (diskusi matang)

**Tanggal:** 24 Jul 2026  
**Status:** IMPLEMENT FE partial — `Auth.tsx` email login/signup/forgot/reset sudah ada. **Jangan sentuh `App.tsx`** (jatah Hermes: login loop #14).  
**Repo:** `SKD_WEB` · branch `master`  
**Production:** https://skdquest.vercel.app  
**Terkait:** bug #14 login loop (`docs/plan-smoke-bugfix-diskusi.md`)

---

## Keputusan final (user setuju saran)

| Topik | Keputusan |
|---|---|
| Google | **Primary** — tombol besar di atas |
| Email + password | **Secondary** — form di bawah pemisah "atau" |
| Halaman | Satu route `/auth`, ganti mode (bukan multi-route) |
| Mode | `login` · `signup` · `forgot` · `reset-password` (reset sudah ada) |
| Signup field | Email + password + konfirmasi saja |
| Nickname / target | Tetap di **Onboarding** — jangan dobel di signup |
| Password min | **8 karakter** |
| Verifikasi email | **Wajib** (Supabase email confirm ON) |
| Google + email sama | MVP: **tolak dobel**, pesan jelas; **no account linking** |
| Provider lain | Tidak (no Apple) |
| Magic link / OTP / username login | **Tidak** di MVP |
| Urutan ship | **1) Fix loop #14 → 2) email form** |

---

## Status kode sekarang

| Ada | Tidak ada |
|---|---|
| Google OAuth (`signInWithOAuth`) | `signInWithPassword` |
| Mode `reset-password` (recovery hash) | `signUp` email |
| Onboarding setelah profil kosong | Mode `login` / `signup` / `forgot` |
| `AuthMode = 'google' \| 'reset-password'` | Kirim `resetPasswordForEmail` dari UI |

File: `src/pages/Auth.tsx`, gate di `src/App.tsx`.

---

## Wireframe final

### Login (default)

```
┌─────────────────────────────┐
│        SKDQuest ⚔️          │
│      Masuk ke Arena         │
│                             │
│ [ Lanjutkan dengan Google ] │  ← primary, besar
│                             │
│ ────────── atau ──────────  │
│                             │
│ Email                       │
│ [________________________]  │
│ Password                    │
│ [________________________]👁 │
│ [         Masuk          ]  │
│                             │
│ Lupa password?              │
│ Belum punya akun? Daftar    │
└─────────────────────────────┘
```

### Sign up

```
Buat Akun Pejuang

[ Lanjutkan dengan Google ]

────────── atau ──────────

Email
Password (min 8)
Konfirmasi password
[        Daftar        ]

Sudah punya akun? Masuk
```

### Forgot

```
Lupa Password

Email
[     Kirim link reset     ]

Kembali ke Masuk
```

### Reset password

Sudah ada di `Auth.tsx` (dari link email recovery).  
Copy sukses: arahkan ke **Masuk** (bukan "masuk ulang dengan Google" saja).

---

## Copy UI (Bahasa Indonesia)

| Mode | Judul | CTA utama |
|---|---|---|
| login | Masuk ke Arena | Masuk |
| signup | Buat Akun Pejuang | Daftar |
| forgot | Lupa Password | Kirim link reset |
| reset-password | Buat Password Baru | Simpan Password Baru |
| Google | — | Lanjutkan dengan Google |

Pemisah: `atau`  
Link: `Lupa password?` · `Belum punya akun? Daftar` · `Sudah punya akun? Masuk` · `Kembali ke Masuk`

### Error / success message (ramah)

| Kasus | Pesan |
|---|---|
| Password salah / user tidak ada | Email atau password salah. |
| Email sudah terdaftar (signup) | Email sudah dipakai. Masuk atau lanjutkan dengan Google. |
| Email belum diverifikasi | Cek email untuk verifikasi, lalu masuk lagi. |
| Password < 8 | Password minimal 8 karakter. |
| Konfirmasi tidak cocok | Konfirmasi password tidak cocok. |
| Forgot terkirim | Link reset dikirim. Cek inbox / spam. |
| Reset sukses | Password berhasil diubah. Silakan masuk. |
| Network / Supabase | Gagal terhubung. Coba lagi. |

Jangan bocorkan "email tidak terdaftar" vs "password salah" secara terpisah (security).

---

## Aturan domain auth

1. **1 email = 1 user** Supabase Auth.
2. **Onboarding** tetap: nickname + `target_kedinasan` wajib sebelum app utama (semua provider).
3. **Confirm email ON** di Supabase Auth settings.
4. **Redirect:**
   - Login/signup sukses → App gate (`/` atau `/onboarding` via `App.tsx`).
   - Google: `redirectTo: origin + '/'` (sudah).
   - Reset email: `redirectTo: origin + '/auth'` (hash recovery).
5. **Account linking Google↔email = later**, bukan MVP.
6. **Server authoritative** — auth lewat Supabase client saja; jangan custom JWT.

---

## Urutan implementasi (setelah "lanjut implement")

### Step 0 — Prasyarat (WAJIB dulu)

Fix **login loop #14** di `App.tsx` / auth gate:

- Timeout 5s jangan false-logout jika session masih valid.
- Race `getSession` + `onAuthStateChange` + cache onboarding.
- Manual email **di atas loop** = support nightmare.

Cek: refresh app + Google login → tidak bolak-balik `/auth` ↔ `/` / onboarding.

### Step 1 — Supabase dashboard (bukan code dulu)

- [ ] Email provider enabled
- [ ] Confirm email **ON**
- [ ] Site URL + redirect URLs: production + local
- [ ] Template email (opsional polish): confirm + reset Bahasa Indonesia

### Step 2 — `Auth.tsx` mode + form

- Ganti `AuthMode` → `'login' | 'signup' | 'forgot' | 'reset-password'`
- Default mode: `login` (bukan `google` saja)
- UI: Google primary → divider → form sesuai mode
- State: email, password, confirmPassword, show/hide, loading, error, success
- Validasi client: email non-empty, password ≥ 8, match di signup

### Step 3 — Handler Supabase

| Aksi | API |
|---|---|
| Login | `supabase.auth.signInWithPassword({ email, password })` |
| Signup | `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })` |
| Forgot | `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin/auth })` |
| Reset | sudah ada `updateUser({ password })` |
| Google | sudah ada `signInWithOAuth` |

Setelah login/signup sukses: biarkan `App.tsx` `onAuthStateChange` yang redirect (jangan double navigate agresif).

Signup: jika Supabase return "user already registered" → pesan pakai tabel di atas.

### Step 4 — Reset password copy

- Setelah sukses: "Silakan masuk" + mode `login` (bukan hanya Google).

### Step 5 — Gate onboarding

- Pastikan user email baru tanpa nickname → `/onboarding` (path yang sama dengan Google).
- Jangan buat profil ekonomis dari client; upsert profil minimal (seperti Google) boleh di gate yang sama.

### Step 6 — Cek manual

1. Daftar email baru → email confirm → masuk → onboarding → dashboard.  
2. Login email benar / salah.  
3. Lupa password → link → set password → login.  
4. Signup email yang sudah Google → pesan jelas, tidak 2 progress.  
5. Google masih jalan.  
6. Refresh / cold open → **tidak loop** (#14).  
7. Mobile layout form proporsional.

### Step 7 — Build

- `npm run build` lolos  
- Commit kecil, mis. `feat: email password auth login signup forgot`

---

## Out of scope (jangan kerjakan)

- Magic link, OTP, SMS  
- Login username  
- Apple / provider lain  
- Account linking di Settings  
- Nickname di form signup  
- Route terpisah `/login` `/signup`  
- Captcha custom (kecuali Supabase enable nanti)  
- Ubah ekonomi / profil field selain auth gate

---

## Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Loop auth tetap | Step 0 wajib |
| 2 akun email=Google | Pesan tolak; linking later |
| User tidak cek email | Copy jelas + resend later (opsional) |
| Scope creep form | 1 file mode switch |
| Password lemah | Min 8 + match |

---

## File kunci

| Path | Peran |
|---|---|
| `src/pages/Auth.tsx` | UI + handler login/signup/forgot/reset/Google |
| `src/App.tsx` | session gate, onboarding, anti-loop |
| `src/pages/Onboarding.tsx` | nickname + target (tidak diubah flow) |
| Supabase Auth settings | email provider, confirm, redirect URLs |

---

## Prompt siap-tempel untuk Hermes

```
Baca docs/plan-auth-manual-diskusi.md di repo SKD_WEB.

Konteks: desain auth manual sudah FINAL (user setuju).
Google primary + email/password secondary di /auth.
Mode: login | signup | forgot | reset-password.
Onboarding tetap terpisah. Password min 8. Confirm email ON.
Account linking / magic link / Apple = out of scope.

Tugasmu:
1. Ringkas keputusan + wireframe 1 layar.
2. Konfirmasi urutan: fix login loop #14 dulu, baru email form.
3. Jika user bilang "lanjut implement": kerjakan Step 0 → Step 6 berurutan, commit kecil, npm run build.
4. Jika user masih diskusi: jangan coding; challenge hanya jika ada lubang keamanan/UX.

Aturan: Bahasa Indonesia, ringkas, YAGNI. Jangan sentuh secret/.env.
Server auth = Supabase saja.
```

---

## Checklist

- [x] Keputusan layout & field  
- [x] Wireframe + copy  
- [x] Out of scope jelas  
- [x] User bilang **lanjut implement** (FE Auth.tsx)  
- [x] Step 2–4 FE: login / signup / forgot / reset di `Auth.tsx`  
- [ ] Step 0 (#14) — **Hermes** di `App.tsx` (jangan bentrok)  
- [ ] Step 1 Supabase: Email provider ON + Confirm email ON + redirect URLs  
- [ ] Step 5–6: cek manual end-to-end setelah #14 + Supabase settings  

### Batas kerja anti-bentrok

| Area | Owner |
|---|---|
| `src/pages/Auth.tsx` | ZCode (email form) — **done** |
| `src/App.tsx` auth gate / loop | **Hermes only** |
| Smoke bugs #10–12 gameplay | Hermes (`plan-smoke-bugfix-diskusi.md`) |
| Supabase Auth dashboard | User (manual) |

---

**Handoff Hermes:** jangan edit `Auth.tsx` kecuali konflik merge. Fix #14 di `App.tsx` saja.
