# Status Akhir Remediation SKDQuest

Update: 22 Jul 2026

## Ringkas

Tahap kritis keamanan & integritas ekonomi **selesai**.
Backend RPC production sudah bersih, client sudah diselaraskan, build lolos, smoke test fitur utama aman.

---

## Sudah aman

### 1) Kebocoran sesi
- `public/inject.html` dihapus dari repo
- tidak ada di `dist`
- production/local tidak menyajikan script token
- `/inject.html` dipaksa 404 (bukan fallback SPA)

### 2) Otorisasi backend
- `daily_claim` / `spin_wheel` pakai `auth.uid()` (tanpa user_id client)
- overload lama dibersihkan
- 9 function DEFINER aktif, 1 signature masing-masing

### 3) Ekonomi & scoring server-authoritative
- `purchase_item(item_id, quantity)` harga dari katalog server
- `sell_item(item_id)` reward dari katalog server
- `complete_quiz_session` hitung skor/koin/XP server-side
- `claim_quest`, `consume_energy`, `consume_powerup` atomik

### 4) Frontend sync
- Shop/Quest/Dashboard/QuizSession memanggil signature baru
- fallback reward client-side untuk claim dihapus
- logger transaksi shop ganda di client dihapus

### 5) XSS / PWA / headers
- soal/opsi/review render text node (bukan raw HTML sink)
- Supabase API tidak di-cache service worker
- cache dibersihkan saat logout
- header `nosniff`, `DENY`, referrer, permissions

### 6) Quality
- `npm run build` lolos
- unit test scoring (Vitest) ada
- SQL one-shot + cleanup scripts ada
- docs deploy/progress ada

---

## Function production yang valid

| Function | Args |
|---|---|
| `daily_claim` | — |
| `spin_wheel` | — |
| `consume_energy` | `p_amount integer` |
| `purchase_item` | `p_item_id text, p_quantity integer` |
| `sell_item` | `p_item_id text` |
| `claim_quest` | `p_quest_id integer` |
| `consume_powerup` | `p_session_id uuid, p_item_id text` |
| `complete_quiz_session` | session + optional flags |
| `update_profile_public` | profil non-ekonomi |

---

## Sisa utang teknis (bukan blocker launch)

1. **Completion handler unify** di `Quiz.tsx` (error/retry UX)
2. **Power-up client** masih bisa optimistic sebelum RPC `consume_powerup` di semua handler
3. **CI GitHub Actions** formal belum
4. **Integration test RLS** lintas-user belum
5. **A11y lanjutan**: skip-link, massal `div`→`button`
6. **SEO domain**: ganti `skdquest.vercel.app` jika domain final beda
7. **Edge Function `expire-duels`**: pastikan `CRON_SECRET` terpasang di production
8. **Backup Supabase**: project sempat “No backups” — aktifkan backup/PITR jika memungkinkan

---

## Checklist go-live singkat

1. Redeploy Vercel dari `master`
2. Cek `/inject.html` → **404**
3. Hard refresh / clear site data sekali
4. Smoke:
   - login
   - daily claim
   - spin
   - shop beli/jual
   - quest claim
   - mulai + finish quiz
   - logout
5. Monitor error Supabase/Vercel 30–60 menit

---

## File penting

- `supabase/apply-all-security-rpcs.sql`
- `supabase/cleanup-rpc-overloads.sql`
- `supabase/cleanup-rpc-overloads-v2.sql`
- `docs/deploy-checklist.md`
- `docs/task-progress.md`
- `docs/status-akhir-remediation.md`
