-- SQL Schema untuk Supabase SKDQuest
-- Jalankan kode ini di Supabase SQL Editor untuk membuat tabel dan kebijakan keamanan (RLS)

-- 1. Buat Tabel Profiles (Data Pengguna)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    score INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 1240,
    energy INTEGER DEFAULT 25,
    streak INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktifkan Row Level Security (RLS) pada tabel profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Buat Kebijakan RLS (Profiles)
CREATE POLICY "Semua orang bisa melihat profil" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Pengguna bisa mengubah profil sendiri" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Pengguna bisa mendaftarkan profil baru" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);


-- 2. Buat Tabel PvP Rooms (Kamar PvP Kustom)
CREATE TABLE IF NOT EXISTS public.pvp_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) UNIQUE NOT NULL,
    host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
    player_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktifkan RLS pada pvp_rooms
ALTER TABLE public.pvp_rooms ENABLE ROW LEVEL SECURITY;

-- Buat Kebijakan RLS (PvP Rooms)
CREATE POLICY "Semua orang bisa melihat room aktif" ON public.pvp_rooms
    FOR SELECT USING (true);

CREATE POLICY "Host bisa mengelola room sendiri" ON public.pvp_rooms
    FOR ALL USING (auth.uid() = host_id);

CREATE POLICY "Pemain bisa membuat/bergabung room" ON public.pvp_rooms
    FOR INSERT WITH CHECK (true);


-- 3. Buat Tabel PvP Room Players (Pemain di dalam Room)
CREATE TABLE IF NOT EXISTS public.pvp_room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.pvp_rooms(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, player_id)
);

-- Aktifkan RLS pada pvp_room_players
ALTER TABLE public.pvp_room_players ENABLE ROW LEVEL SECURITY;

-- Buat Kebijakan RLS (PvP Room Players)
CREATE POLICY "Semua orang bisa melihat daftar pemain" ON public.pvp_room_players
    FOR SELECT USING (true);

CREATE POLICY "Pemain bisa mendaftar masuk" ON public.pvp_room_players
    FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Pemain bisa keluar room" ON public.pvp_room_players
    FOR DELETE USING (auth.uid() = player_id);


-- 4. Fungsi Otomatis untuk Sync Auth dengan Profiles
-- Saat ada pengguna baru melakukan Sign Up, profil mereka akan otomatis terdaftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, score, coins, energy, streak, level)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', 'Pejuang_' || substring(gen_random_uuid()::text from 1 for 6)),
        0,
        1240,
        25,
        0,
        1
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk sync auth
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
