import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Client Supabase yang terisolasi dengan fallback cerdas jika env belum terpasang
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper check apakah Supabase terhubung
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};

// Interface profil pengguna
export interface UserProfile {
  id: string;
  username: string;
  score: number;
  coins: number;
  energy: number;
  streak: number;
  level: number;
  avatar_url?: string;
}

// ── Fallback LocalStorage untuk Guest Mode (Supabase offline/belum disetup) ──
const getLocalProfile = (): UserProfile => {
  const local = localStorage.getItem('skdquest_profile');
  if (local) return JSON.parse(local);
  
  const defaultProfile: UserProfile = {
    id: 'guest_user',
    username: 'CIHUYYYY',
    score: 1250, // Warrior I / Elite
    coins: 1240,
    energy: 24,
    streak: 29,
    level: 14
  };
  localStorage.setItem('skdquest_profile', JSON.stringify(defaultProfile));
  return defaultProfile;
};

const saveLocalProfile = (profile: UserProfile) => {
  localStorage.setItem('skdquest_profile', JSON.stringify(profile));
};

// ── PETA API SUPABASE DAN FALLBACK GUEST ──

// 1. Ambil Profil Pengguna
export const fetchProfile = async (userId: string = 'current'): Promise<UserProfile> => {
  if (!isSupabaseConfigured() || userId === 'current') {
    return getLocalProfile();
  }

  try {
    const { data, error } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data as UserProfile;
  } catch (err) {
    console.warn('Menggunakan profil lokal (Supabase offline/belum sinkron):', err);
    return getLocalProfile();
  }
};

// 2. Simpan/Update Profil Pengguna
export const updateProfile = async (profileUpdate: Partial<UserProfile>): Promise<UserProfile> => {
  const currentLocal = getLocalProfile();
  const updatedLocal = { ...currentLocal, ...profileUpdate };
  saveLocalProfile(updatedLocal);

  if (!isSupabaseConfigured()) {
    return updatedLocal;
  }

  try {
    // Cari user ID aktif di Supabase
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return updatedLocal;

    const { data, error } = await supabase!
      .from('profiles')
      .update({ ...profileUpdate, updated_at: new Date() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  } catch (err) {
    console.warn('Update profil Supabase gagal, profil tersimpan secara lokal:', err);
    return updatedLocal;
  }
};

// 3. Gabung Papan Peringkat Bulanan (Leaderboard/Liga)
export const fetchMonthlyLeaderboard = async () => {
  if (!isSupabaseConfigured()) {
    // Mengembalikan data statis tiruan jika Supabase belum disetup
    return [
      { rank: 1, name: 'Raden Saori', score: 3800, isMe: false },
      { rank: 2, name: 'BudiSantoso', score: 3210, isMe: false },
      { rank: 3, name: 'SitiRahma', score: 2950, isMe: false },
      { rank: 4, name: 'Anda', score: getLocalProfile().score, isMe: true },
      { rank: 5, name: 'AndiWijaya', score: 2640, isMe: false },
      { rank: 6, name: 'DewiBulan', score: 2100, isMe: false },
      { rank: 7, name: 'FajarPagi', score: 1870, isMe: false }
    ].sort((a, b) => b.score - a.score);
  }

  try {
    const { data, error } = await supabase!
      .from('profiles')
      .select('id, username, score')
      .order('score', { ascending: false })
      .limit(50);

    if (error) throw error;

    const currentUser = await supabase!.auth.getUser();
    const currentUserId = currentUser.data.user?.id;

    return data.map((p, idx) => ({
      rank: idx + 1,
      name: p.username,
      score: p.score,
      isMe: p.id === currentUserId
    }));
  } catch (err) {
    console.error('Fetch Supabase Leaderboard gagal, menggunakan fallback:', err);
    return [
      { rank: 1, name: 'Raden Saori', score: 3800, isMe: false },
      { rank: 2, name: 'BudiSantoso', score: 3210, isMe: false },
      { rank: 3, name: 'Anda', score: getLocalProfile().score, isMe: true }
    ];
  }
};

// 4. Integrasi Room PvP (Realtime Match Matchmaking)
export const createPvpRoom = async (hostId: string, code: string): Promise<any> => {
  if (!isSupabaseConfigured()) {
    return { id: 'local_room', code, host_id: hostId, status: 'waiting' };
  }

  const { data, error } = await supabase!
    .from('pvp_rooms')
    .insert([{ code, host_id: hostId, status: 'waiting', player_count: 1 }])
    .select()
    .single();

  if (error) throw error;

  // Daftarkan host di table pvp_room_players
  await supabase!
    .from('pvp_room_players')
    .insert([{ room_id: data.id, player_id: hostId }]);

  return data;
};
