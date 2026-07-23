# Plan Lanjutan SKDQuest (handoff chat baru)

**Update:** 24 Jul 2026  
**Repo:** `Madtoy14/PROJECT-SKD` · branch `master`  
**Local:** `C:\Users\NET\.gemini\antigravity\playground\SKD_WEB`  
**Production:** https://skdquest.vercel.app  
**Supabase:** PROJECT-SKD (`nfjzyqhcfvlhfwvoseds`)  
**HEAD acuan (cek `git log -1`):** lihat commit terbaru di `master` (setelah `22b79c6` purchase transactions fix, `79ee556` tryout model B, dll.)

---

## Bahasa & aturan kerja

- Jawab **Bahasa Indonesia**, ringkas, teknis, YAGNI.
- Commit kecil, build harus lolos (`npm run build`).
- Jangan commit secret/`.env`.
- **Server authoritative** — jangan buka mutasi `coins` / `inventory` / skor sensitif dari client.
- Sebelum ubah SQL production: backup dulu (`docs/backup-restore.md`).
- Soft launch **boleh**; residual risk tetap ada.

---

## Status ringkas

| Aspek | Status |
|---|---|
| Soft launch / kritis keamanan | ✅ boleh |
| RPC ekonomi utama | ✅ (lihat daftar bawah) |
| Build production | ✅ |
| Working tree (saat handoff) | cek `git status` |
| Mayar top-up | ❌ belum |
| Lint hard-gate CI | ⚠️ lint masih report-only |
| Backup/PITR Supabase | ⚠️ manual / free sering no auto-backup |

### Sudah selesai (sesi remediation + lanjut)

1. Power-up quiz → `consume_powerup` (efek hanya setelah RPC sukses)
2. Finish quiz unify + retry; navigate result hanya dengan `result_id`
3. Backup runbook + deploy checklist
4. CI GitHub Actions (lint continue-on-error)
5. Quest progress di `complete_quiz_session`; `used_powerups` log; `reset_daily_quests`
6. Spin bayar: fix rowtype uuid (`fix-spin-wheel.sql`); tanggal Asia/Jakarta
7. Wrong book: join `soal_skd` / `soal_tryout` (bukan tabel `questions`)
8. Energy: `sync_energy` + `consume_energy` regen; fail-closed di Quiz; focus resync
9. Tryout **model B**: beli 1× unlock → attempt gratis (bukan per attempt)
10. Paket soal statis: `paket_tryout_1..6` by timestamp (30 TWK + 35 TIU + 45 TKP)
11. FE: hanya paket **1 & 2 live**; 3–6 “Segera Hadir”
12. Fetch tryout: by `paket_id`, order `created_at` (no shuffle)
13. SVG di soal: `SafeRichText` (render `<svg>` + `<br/>`)
14. Anti-copy soal di mode tryout/survival/pvp
15. Route kanonis `/tryout-lobby` (`/pembahasan` redirect)
16. Modal responsif + backdrop clean
17. Repo hygiene: untrack `Soal/*.pdf`, `supabase_schema*.sql`, scripts generator
18. `purchase_item` / `sell_item`: log ke `transactions.metadata` (bukan `details`)

---

## Model produk tryout (FINAL = B)

| | |
|---|---|
| **Beli** | 1× via `purchase_item` (`paket_tryout_N`, 1000 koin) |
| **Setelah beli** | `purchased_packages` berisi id paket → **Mulai** gratis berulang |
| **Bukan** | charge per attempt (`start_tryout_attempt` tidak dipakai lobby) |
| **Soal** | Statis per `paket_id` di `soal_tryout` |
| **Live UI** | Paket 1 & 2; 3–6 `isDevelopment: true` |

File FE: `src/data/tryout_packages.ts`, `src/pages/TryOutLobby.tsx`.

---

## RPC production penting

### Inti (9 + tambahan)

| Function | Catatan |
|---|---|
| `daily_claim()` | Asia/Jakarta YYYY-MM-DD |
| `spin_wheel()` | scalar vars, bukan `%rowtype` |
| `consume_energy(p_amount int)` | regen dulu, clamp 0–25 |
| `sync_energy()` | regen display dashboard |
| `purchase_item(p_item_id, p_quantity)` | katalog server; log `metadata` |
| `sell_item(p_item_id)` | log `metadata` |
| `claim_quest(p_quest_id)` | claimed = `quests_progress[id]=999` |
| `consume_powerup(session, item)` | + `used_powerups` |
| `complete_quiz_session(...)` | skor server + quest progress |
| `update_profile_public(...)` | non-ekonomi |
| `reset_daily_quests()` | reset quest 1–3 harian |
| `record_wrong_answer` / `increment_wrong_mastery` | wrong book write |
| `start_tryout_attempt` | **legacy model A** — tidak dipakai lobby model B |

### Verifikasi cepat di SQL Editor

```sql
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'daily_claim','spin_wheel','consume_energy','sync_energy',
    'purchase_item','sell_item','claim_quest','consume_powerup',
    'complete_quiz_session','update_profile_public','reset_daily_quests',
    'record_wrong_answer','increment_wrong_mastery'
  )
ORDER BY 1, 2;
```

---

## SQL apply production (file di repo)

Apply di Supabase SQL Editor **setelah backup** jika belum / error:

| File | Kapan |
|---|---|
| `supabase/fix-purchase-transactions-schema.sql` | **WAJIB** jika beli paket error `column "details"...` |
| `supabase/fix-tryout-package-catalog.sql` / full `purchase_item.sql` | katalog `paket_tryout_1..6` @ 1000 |
| `supabase/reassign-tryout-packages-v2.sql` | reassign paket by timestamp (sudah dijalankan → cek count) |
| `supabase/fix-spin-wheel.sql` | spin bayar uuid bug |
| `supabase/fix-energy-and-wrong-answer.sql` | energy + wrong book RPC |
| `supabase/fix-claim-quest.sql` | claim quest sentinel 999 |
| `supabase/fase-e-hardening.sql` | consume_powerup log + complete + claim + reset |

### Cek paket tryout di DB

```sql
SELECT paket_id, paket,
  COUNT(*) FILTER (WHERE tipe='TWK') twk,
  COUNT(*) FILTER (WHERE tipe='TIU') tiu,
  COUNT(*) FILTER (WHERE tipe='TKP') tkp,
  COUNT(*) total
FROM public.soal_tryout
WHERE paket_id IS NOT NULL
GROUP BY 1,2 ORDER BY paket;

-- sisa unassigned (normal: TWK~53 TIU~43 TKP~44)
SELECT tipe, COUNT(*) FROM public.soal_tryout
WHERE paket_id IS NULL AND tipe IN ('TWK','TIU','TKP')
GROUP BY 1;
```

---

## Skema penting

### `soal_tryout`

- `id`, `tipe`, `pertanyaan`, `opsi`, `kunci`, `pembahasan`, `created_at`
- `paket` int (mirror opsional)
- `paket_id` text **kanonis** → `paket_tryout_1` … `paket_tryout_6`

### `transactions`

```
user_id, type, category, item_id, amount, balance_after, source, metadata
```

**Bukan** kolom `details`.

### `soal_skd`

Bank latihan/survival (~UUID). Wrong book resolve ke sini dulu, lalu `soal_tryout`.

---

## File FE penting

| Path | Peran |
|---|---|
| `src/pages/Quiz.tsx` | power-up RPC, energy fail-closed, anti-copy, SafeRichText |
| `src/pages/TryOutLobby.tsx` | model B: beli 1× / mulai gratis |
| `src/data/tryout_packages.ts` | katalog paket 1–6 |
| `src/lib/supabase.ts` | RPC helpers, fetch tryout ordered by paket |
| `src/components/SafeRichText.tsx` | render SVG + br |
| `src/pages/Dashboard.tsx` | energy sync, spin, entry tryout → lobby |
| `src/pages/Quest.tsx` | claim fail-closed (no client coin) |
| `.github/workflows/ci.yml` | CI |

---

## Prioritas next (urut)

### P0 — tutup loop production (manual smoke)

1. [ ] Apply `fix-purchase-transactions-schema.sql` jika belum
2. [ ] Smoke: **Beli Paket 1** → saldo −1000 → badge Dimiliki → Mulai gratis ×2
3. [ ] Smoke: soal tryout **statis** + **SVG** tampil (bukan source string)
4. [ ] Smoke: spin bayar 100; energy latihan; claim quest; wrong book tulis

### P1 — cleanup / konsistensi

5. [ ] Shop: rapikan item legacy `paket_tryout_akbar_*` vs lobby `paket_tryout_1..2`
6. [ ] Docs ekonomi: catat model B tryout (bukan per-attempt) di `docs/ekonomi-katalog.md`
7. [ ] Opsional: biarkan / dokumentasikan `start_tryout_attempt` sebagai legacy

### P2 — kualitas

8. [ ] CI: lint hard-gate setelah bersihkan error react-hooks
9. [ ] A11y: skip-link, div→button, aria sisa
10. [ ] SEO domain final

### P3 — produk

11. [ ] **Mayar** order + webhook + credit atomik
12. [ ] Starting balance user baru
13. [ ] Tuning reward harian ~150–300
14. [ ] Buka paket 3+ setelah QA konten (set `isDevelopment: false`)
15. [ ] Backup/PITR / export mingguan

### Konten (bukan code)

- Paket 2–6: kualitas soal AI jelek → review / regenerate sebelum buka
- Sisa unassigned (53 TWK / 43 TIU / 44 TKP): gudang, jangan paksa paket 7 tanpa 45 TKP

---

## Smoke checklist go-live singkat

1. Login  
2. Dashboard energy sync  
3. Daily claim / spin  
4. Shop beli power-up  
5. Latihan: energy potong, power-up RPC  
6. Wrong book list + latih  
7. Tryout: **beli 1×** → mulai → SVG/soal OK → finish result  
8. Quest claim  
9. `/inject.html` → 404 polos  
10. Logout  

---

## Prompt singkat untuk chat baru

```text
Lanjutkan SKDQuest di C:\Users\NET\.gemini\antigravity\playground\SKD_WEB
GitHub Madtoy14/PROJECT-SKD branch master.
Baca dulu: docs/plan.md, docs/RINGKASAN-HASIL.md, docs/ekonomi-katalog.md
git log -15 && git status
Bahasa Indonesia, YAGNI, commit kecil, build lolos.
Model tryout = B (beli 1× via purchase_item, attempt gratis).
Prioritas: smoke beli tryout (fix transactions metadata), lalu P1 shop cleanup / Mayar.
Jangan buka mutasi ekonomi dari client.
```

---

## Jangan

- Jangan anggap zero residual risk
- Jangan re-run full `apply-all-security-rpcs.sql` sembarangan
- Jangan kembalikan charge per-attempt tanpa keputusan produk
- Jangan commit `.env` / secret
- Jangan rewrite besar yang tidak diminta

---

## Definition of “ekonomi clean” (target)

- [x] Shop beli/jual server  
- [x] Power-up consume server  
- [x] Spin server  
- [x] Tryout unlock 1× server (`purchase_item`)  
- [x] Energy sync/consume server  
- [x] Wrong book write RPC  
- [x] Quest claim server fail-closed  
- [ ] Smoke beli tryout production lolos formal  
- [ ] Mayar  
- [ ] Shop legacy cleanup  

**Kesimpulan handoff:** soft launch OK; next chat = **verifikasi beli paket + smoke**, lalu Mayar/poles.
