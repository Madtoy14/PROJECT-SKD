-- ============================================================
-- SECURITY FIX: RLS Policy pvp_rooms & pvp_room_players
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- FIX 1: pvp_rooms INSERT — hanya izinkan jika auth.uid() = host_id
-- Sebelumnya: WITH CHECK (true) → siapapun bisa insert room
DROP POLICY IF EXISTS "Pemain bisa membuat/bergabung room" ON public.pvp_rooms;

CREATE POLICY "Pemain bisa membuat room" ON public.pvp_rooms
    FOR INSERT WITH CHECK (auth.uid() = host_id);

-- FIX 2: pvp_room_players INSERT — hanya izinkan jika player adalah diri sendiri
-- Mencegah user mendaftarkan orang lain ke room tanpa consent
DROP POLICY IF EXISTS "Pemain bisa bergabung room" ON public.pvp_room_players;

CREATE POLICY "Pemain bisa bergabung room" ON public.pvp_room_players
    FOR INSERT WITH CHECK (auth.uid() = player_id);

-- FIX 3: pvp_room_players SELECT — hanya bisa lihat room yang diikuti
-- Sebelumnya tidak ada policy SELECT eksplisit
DROP POLICY IF EXISTS "Pemain bisa melihat data room" ON public.pvp_room_players;

CREATE POLICY "Pemain bisa melihat data room" ON public.pvp_room_players
    FOR SELECT USING (
        auth.uid() = player_id
        OR EXISTS (
            SELECT 1 FROM public.pvp_rooms
            WHERE pvp_rooms.id = pvp_room_players.room_id
              AND pvp_rooms.host_id = auth.uid()
        )
    );

-- FIX 4: pvp_room_players DELETE — hanya bisa keluar sendiri
DROP POLICY IF EXISTS "Pemain bisa keluar dari room" ON public.pvp_room_players;

CREATE POLICY "Pemain bisa keluar dari room" ON public.pvp_room_players
    FOR DELETE USING (auth.uid() = player_id);

-- Verifikasi: tampilkan semua policy yang aktif
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('pvp_rooms', 'pvp_room_players')
ORDER BY tablename, cmd;
