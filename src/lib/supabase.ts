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

// 5. Mengambil Soal dari Supabase (Soal SKD)
export const fetchQuestionsFromSupabase = async (gameMode: string) => {
  if (!isSupabaseConfigured()) {
    // Fallback ke data statis jika Supabase belum disetup
    const { SOAL_SKD } = await import('../data/soal');
    return SOAL_SKD;
  }

  try {
    let questions: any[] = [];
    
    if (gameMode === 'latihan' || gameMode === 'survival') {
      // 10 soal acak
      const { data, error } = await supabase!.rpc('get_random_soal', { limit_count: 10 });
      if (error) {
        // Fallback jika RPC belum ada
        const res = await supabase!.from('soal_skd').select('*').limit(50);
        if (res.error) throw res.error;
        questions = res.data.sort(() => 0.5 - Math.random()).slice(0, 10);
      } else {
        questions = data;
      }
    } else if (gameMode === 'pvp' || gameMode === 'pvp1v1') {
      // 15 soal acak
      const { data, error } = await supabase!.rpc('get_random_soal', { limit_count: 15 });
      if (error) {
        const res = await supabase!.from('soal_skd').select('*').limit(50);
        if (res.error) throw res.error;
        questions = res.data.sort(() => 0.5 - Math.random()).slice(0, 15);
      } else {
        questions = data;
      }
    } else if (gameMode === 'tryout') {
      // 110 soal berdasar kategori: 35 TIU, 30 TWK, 45 TKP
      const fetchCategory = async (tipe: string, limit: number) => {
        const { data, error } = await supabase!.rpc('get_random_soal_by_tipe', { soal_tipe: tipe, limit_count: limit });
        if (error) {
          const res = await supabase!.from('soal_skd').select('*').eq('tipe', tipe).limit(limit * 2);
          if (res.error) throw res.error;
          return res.data.sort(() => 0.5 - Math.random()).slice(0, limit);
        }
        return data;
      };

      const [tiu, twk, tkp] = await Promise.all([
        fetchCategory('TIU', 35),
        fetchCategory('TWK', 30),
        fetchCategory('TKP', 45)
      ]);
      
      questions = [...twk, ...tiu, ...tkp]; // Susunan biasa: TWK, TIU, TKP
    } else {
      // Default: ambil 10
      const { data, error } = await supabase!.from('soal_skd').select('*').limit(10);
      if (error) throw error;
      questions = data;
    }

    // Jika database berhasil dihubungi tapi tabel masih KOSONG, gunakan data fallback lokal
    if (!questions || questions.length === 0) {
      console.warn('Tabel Supabase kosong, menggunakan data lokal.');
      const { SOAL_SKD } = await import('../data/soal');
      // Berikan sebagian saja agar mirip sesuai mode (atau semuanya jika tryout)
      if (gameMode === 'latihan' || gameMode === 'survival') {
        return SOAL_SKD.sort(() => 0.5 - Math.random()).slice(0, 10);
      }
      if (gameMode === 'pvp' || gameMode === 'pvp1v1') {
        return SOAL_SKD.sort(() => 0.5 - Math.random()).slice(0, 15);
      }
      return SOAL_SKD;
    }

    // Mapping agar formatnya sesuai dengan interface Soal di aplikasi
    return questions.map(q => {
      let parsedOptions: any[] = [];
      try {
        const rawOpsi = typeof q.opsi === 'string' ? JSON.parse(q.opsi) : q.opsi;
        
        if (Array.isArray(rawOpsi)) {
          if (typeof rawOpsi[0] === 'string') {
             const labels = ['A', 'B', 'C', 'D', 'E'];
             parsedOptions = rawOpsi.map((text, i) => ({
               id: labels[i] || String(i),
               text: text,
               score: q.tipe === 'TKP' ? (i + 1) * 10 : (labels[i] === q.kunci ? 50 : 0)
             }));
          } else {
             parsedOptions = rawOpsi;
          }
        } else if (typeof rawOpsi === 'object' && rawOpsi !== null) {
          parsedOptions = Object.keys(rawOpsi).map(key => {
            const val = rawOpsi[key];
            if (typeof val === 'object' && val !== null) return { id: key, ...val };
            return {
              id: key,
              text: String(val),
              score: q.tipe === 'TKP' ? (parseInt(key) || 1) * 10 : (key === q.kunci ? 50 : 0)
            };
          }).sort((a, b) => a.id.localeCompare(b.id));
        }
      } catch (err) {
        console.error('Failed parsing opsi', q.opsi, err);
      }

      return {
        id: q.id,
        category: q.tipe,
        text: q.pertanyaan,
        options: parsedOptions,
        correct: q.kunci,
        explanation: q.pembahasan
      };
    });

  } catch (err) {
    console.error('Gagal mengambil soal dari Supabase, fallback ke data lokal:', err);
    const { SOAL_SKD } = await import('../data/soal');
    if (gameMode === 'latihan' || gameMode === 'survival') return SOAL_SKD.sort(() => 0.5 - Math.random()).slice(0, 10);
    if (gameMode === 'pvp' || gameMode === 'pvp1v1') return SOAL_SKD.sort(() => 0.5 - Math.random()).slice(0, 15);
    return SOAL_SKD;
  }
};
