# Supabase Migrations

Urutan apply:

1. `202507210001_initial_schema.sql` — tabel dasar (profiles, soal_skd, quiz_sessions, quiz_results, duels, pvp_rooms, notifications, friends)
2. `202507210002_extended_schema.sql` — kolom tambahan + realtime publication
3. `202507210003_attempt_integrity.sql` — package_id, constraint duplikasi
4. `202507210004_server_scoring.sql` — RLS untuk quiz + RPC `complete_quiz_session` (server-side scoring)
5. `202507210005_security_fixes.sql` — RLS pvp_rooms + pvp_room_players
6. `202507210006_characters.sql` — tabel characters + seed data
7. `202507210007_rpc_security_fixes.sql` — RPC shop lama (usang, ganti dengan RPC di `supabase/functions/rpc/`)

> SQL root (`supabase_schema*.sql`, `supabase_rpc_security_fixes.sql`, dll) adalah versi kerja lama.
> Migration di folder ini adalah snapshot untuk reproduksi.
> Selalu backup DB sebelum menjalankan migration baru.

RPC baru telah ditempatkan di `supabase/functions/rpc/`:
- `purchase_item.sql` — server-authoritative (ganti versi lama)
- `sell_item.sql` — server-authoritative (ganti versi lama)
- `consume_powerup.sql`, `claim_quest.sql`, `consume_energy.sql` — RPC baru
- `daily_claim.sql`, `spin_wheel.sql` — diperbaiki (auth.uid)
- `update_profile_public.sql`, `public_profile_view.sql` — RPC/view baru
