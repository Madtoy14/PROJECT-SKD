
-- =============================================
-- TABEL KARAKTER / AVATAR
-- =============================================
CREATE TABLE IF NOT EXISTS public.characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female')),
    image_url TEXT NOT NULL,
    is_free BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buka izin agar semua orang (termasuk yang belum login) bisa membaca data karakter
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Semua orang bisa melihat karakter" ON public.characters;
CREATE POLICY "Semua orang bisa melihat karakter" ON public.characters
    FOR SELECT USING (true);

-- =============================================
-- DATA AWAL (SEED) 10 KARAKTER
-- =============================================
INSERT INTO public.characters (id, name, gender, image_url, is_free)
VALUES
  -- 5 Karakter Pria
  ('ipdn_male', 'Pria - IPDN', 'male', 'https://nfjzyqhcfvlhfwvoseds.supabase.co/storage/v1/object/public/avatars/IPDN%20MALE.png', true),
  ('perhubungan_male', 'Pria - Kemenhub', 'male', 'https://nfjzyqhcfvlhfwvoseds.supabase.co/storage/v1/object/public/avatars/PERHUBUNGAN%20MALE.png', true),
  ('stan_male', 'Pria - PKN STAN', 'male', 'https://nfjzyqhcfvlhfwvoseds.supabase.co/storage/v1/object/public/avatars/STAN%20MALE.png', true),
  ('stis_male', 'Pria - STIS', 'male', 'https://nfjzyqhcfvlhfwvoseds.supabase.co/storage/v1/object/public/avatars/STIS%20MALE.png', true),
  ('stmkg_male', 'Pria - STMKG', 'male', 'https://nfjzyqhcfvlhfwvoseds.supabase.co/storage/v1/object/public/avatars/STMKG%20MALE.png', true),
  
  -- 5 Karakter Wanita
  ('ipdn_female', 'Wanita - IPDN', 'female', 'https://nfjzyqhcfvlhfwvoseds.supabase.co/storage/v1/object/public/avatars/IPDN%20FEMALE.png', true),
  ('perhubungan_female', 'Wanita - Kemenhub', 'female', 'https://nfjzyqhcfvlhfwvoseds.supabase.co/storage/v1/object/public/avatars/PERHUBUNGAN%20FEMALE.png', true),
  ('stan_female', 'Wanita - PKN STAN', 'female', 'https://nfjzyqhcfvlhfwvoseds.supabase.co/storage/v1/object/public/avatars/STAN%20FEMALE.png', true),
  ('stis_female', 'Wanita - STIS', 'female', 'https://nfjzyqhcfvlhfwvoseds.supabase.co/storage/v1/object/public/avatars/STIS%20FEMALE.png', true),
  ('stmkg_female', 'Wanita - STMKG', 'female', 'https://nfjzyqhcfvlhfwvoseds.supabase.co/storage/v1/object/public/avatars/STMKG%20FEMALE.png', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  gender = EXCLUDED.gender,
  image_url = EXCLUDED.image_url;

