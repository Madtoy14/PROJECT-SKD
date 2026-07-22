# Prompt untuk Chat Baru (Handoff SKDQuest)

Salin **seluruh blok** di bawah ini ke chat/agent baru.

---

```text
Kamu lanjutkan project SKDQuest di repo:
C:\Users\NET\.gemini\antigravity\playground\SKD_WEB
GitHub: Madtoy14/PROJECT-SKD (branch master)

## Bahasa
Jawab & kerja dalam Bahasa Indonesia. Ringkas, teknis, YAGNI.

## Status saat handoff
- Soft launch / production SUDAH BOLEH (kritis selesai).
- RPC Supabase production sudah bersih: 9 function, 1 signature masing-masing.
- Client sudah diselaraskan ke RPC baru.
- Build production lolos.
- Smoke fitur utama (claim/spin/shop/quest/quiz) aman.
- /inject.html = placeholder 404 polos (bukan token).
- Utang non-blocker masih ada; plan ada di docs.

## Baca dulu (wajib)
1. docs/RINGKASAN-HASIL.md
2. docs/PLAN-LANJUTAN.md
3. docs/plan-utang-non-blocker.md
4. docs/status-akhir-remediation.md
5. docs/deploy-checklist.md
6. git log --oneline -20
7. git status

## RPC production yang valid (jangan diubah signature tanpa migrasi client)
- daily_claim()
- spin_wheel()
- consume_energy(p_amount int)
- purchase_item(p_item_id text, p_quantity int)
- sell_item(p_item_id text)
- claim_quest(p_quest_id int)
- consume_powerup(p_session_id uuid, p_item_id text)
- complete_quiz_session(p_session_id uuid, optional flags...)
- update_profile_public(...)

## SQL penting
- supabase/apply-all-security-rpcs.sql (sudah pernah di-apply; jangan sembarangan re-run full jika tidak perlu)
- supabase/cleanup-rpc-overloads-v2.sql
- supabase/functions/rpc/*.sql

## Prioritas kerja berikutnya (urut)
P1:
1) Fase A: semua power-up di src/pages/Quiz.tsx wajib lewat consume_powerup; efek hanya setelah RPC sukses
2) Fase B: unify completion/finish quiz + retry UX; navigate result hanya jika ada result_id
3) Fase C: backup/PITR Supabase + update deploy checklist

P2:
4) CI GitHub Actions (npm ci, lint, test, build, audit high)
5) Hardening quest progress / used_powerups server-side

P3:
6) A11y polish
7) SEO domain final
8) Kerapian repo: Soal/*.pdf, SQL root legacy, scripts generator

## Aturan implementasi
- Jangan buka lagi mutasi ekonomi/skor dari client (updateProfile untuk coins/inventory/score sensitif).
- Server authoritative.
- Commit kecil per fase, build harus lolos.
- Jangan commit secret/.env.
- Jangan rewrite besar yang tidak diminta.
- Sebelum ubah SQL production: ingatkan backup.

## Jangan anggap selesai total
Launch boleh, residual risk tetap ada (power-up client path, completion retry, CI, backup).

## Mulai sekarang
1) Konfirmasi git status + commit HEAD
2) Kerjakan Fase A (consume_powerup di semua handler Quiz)
3) Build + ringkas hasil
4) Commit terpisah, tanya sebelum push jika perlu
```

---

## Cara pakai

1. Buka chat/agent baru.
2. Paste blok prompt di atas.
3. Pastikan working directory project SKD_WEB.
4. Lanjut dari **Fase A**.

## Catatan arah (jangan hilang)

- **Sudah live-ready secara kritis**
- **Belum zero-debt**
- Dokumen kanonis handoff = 3 file:
  - `docs/RINGKASAN-HASIL.md`
  - `docs/PLAN-LANJUTAN.md`
  - `docs/PROMPT-CHAT-BARU.md`
