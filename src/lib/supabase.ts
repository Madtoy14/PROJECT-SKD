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
  equipped_avatar_id?: string;
  unlocked_avatars?: string[];
  inventory?: {
    item_5050: number;
    item_hint: number;
    item_shield: number;
    item_waktu_beku: number;
    item_skor_ganda: number;
    item_terawangan: number;
    item_kesempatan_kedua: number;
    item_energy_refill: number;
    item_streak_protector?: number;
    item_coin_booster?: number;
  };
  quests_progress?: Record<number, number>;
  quests_claimed?: number[];
}

// Fallback LocalStorage untuk Guest Mode (Supabase offline/belum disetup)
const getLocalProfile = (): UserProfile => {
  const local = localStorage.getItem('skdquest_profile');
  if (local) {
    const parsed = JSON.parse(local);
    
    // Pasif Regen Energi +1 setiap 15 menit offline/online
    const now = Date.now();
    const lastRegenStr = localStorage.getItem('skdquest_last_energy_regen');
    const lastRegen = lastRegenStr ? parseInt(lastRegenStr) : now;
    const timeDiff = now - lastRegen;
    const restored = Math.floor(timeDiff / (15 * 60 * 1000));
    
    if (restored > 0) {
      parsed.energy = Math.min(24, (parsed.energy ?? 24) + restored);
      localStorage.setItem('skdquest_last_energy_regen', String(now - (timeDiff % (15 * 60 * 1000))));
    } else if (!lastRegenStr) {
      localStorage.setItem('skdquest_last_energy_regen', String(now));
    }
    const updated = {
      equipped_avatar_id: 'stmkg',
      unlocked_avatars: ['stmkg', 'ipdn', 'stan'], // default free uniforms
      inventory: { item_5050: 0, item_hint: 0, item_shield: 0, item_waktu_beku: 0, item_skor_ganda: 0, item_terawangan: 0, item_kesempatan_kedua: 0, item_energy_refill: 0, item_streak_protector: 0, item_coin_booster: 0 },
      quests_progress: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      quests_claimed: [],
      ...parsed
    };
    updated.coins = 999999999;    if (!updated.inventory) updated.inventory = { item_5050: 0, item_hint: 0, item_shield: 0, item_waktu_beku: 0, item_skor_ganda: 0, item_terawangan: 0, item_kesempatan_kedua: 0, item_energy_refill: 0 };
    if (!updated.quests_progress) updated.quests_progress = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (!updated.quests_claimed) updated.quests_claimed = [];
    return updated;
  }
  
  const defaultProfile: UserProfile = {
    id: 'guest_user',
    username: 'CIHUYYYY',
    score: 1250, // Warrior I / Elite
    coins: 999999999,
    energy: 24,
    streak: 29,
    level: 14,
    equipped_avatar_id: 'stmkg',
    unlocked_avatars: ['stmkg', 'ipdn', 'stan'],
    inventory: {
      item_5050: 2, // start with 2 5050 power-ups for testing
      item_hint: 1,  // start with 1 hint power-up for testing
      item_shield: 1, // start with 1 shield power-up for testing
      item_waktu_beku: 1,
      item_skor_ganda: 1,
      item_terawangan: 1,
      item_kesempatan_kedua: 1,
      item_energy_refill: 1,
      item_streak_protector: 1,
      item_coin_booster: 2
    },
    quests_progress: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    },
    quests_claimed: []
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
    if (gameMode === 'tryout') {
      const { SOAL_TRYOUT } = await import('../data/soal_tryout');
      return SOAL_TRYOUT;
    }
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
      // 110 soal berdasar kategori dari tabel 'soal_tryout' untuk Try Out BKN Standar
      const fetchCategory = async (tipe: string, limit: number) => {
        const { data, error } = await supabase!.rpc('get_random_tryout_soal_by_tipe', { soal_tipe: tipe, limit_count: limit });
        if (error) {
          const res = await supabase!.from('soal_tryout').select('*').eq('tipe', tipe).limit(limit * 2);
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
      if (gameMode === 'tryout') {
        const { SOAL_TRYOUT } = await import('../data/soal_tryout');
        return SOAL_TRYOUT;
      }
      const { SOAL_SKD } = await import('../data/soal');
      // Berikan sebagian saja agar mirip sesuai mode (atau semuanya jika tryout)
      if (gameMode === 'latihan' || gameMode === 'survival') {
        return SOAL_SKD.sort(() => 0.5 - Math.random()).slice(0, gameMode === "survival" ? 500 : 10);
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
               score: q.tipe === 'TKP' ? (i + 1) * (gameMode === 'tryout' ? 1 : 10) : (labels[i] === q.kunci ? (gameMode === 'tryout' ? 5 : 50) : 0)
             }));
          } else {
             parsedOptions = rawOpsi;
          }
        } else if (typeof rawOpsi === 'object' && rawOpsi !== null) {
          parsedOptions = Object.keys(rawOpsi).map(key => {
            const val = rawOpsi[key];
            if (typeof val === 'object' && val !== null) return { id: key, ...val };
            
            // Konversi huruf A-E ke bobot indeks 1-5 untuk TKP
            const keyIdx = ['A', 'B', 'C', 'D', 'E'].indexOf(key.toUpperCase());
            const scoreFactor = keyIdx !== -1 ? (keyIdx + 1) : 1;
            
            return {
              id: key,
              text: String(val),
              score: q.tipe === 'TKP' ? scoreFactor * (gameMode === 'tryout' ? 1 : 10) : (key === q.kunci ? (gameMode === 'tryout' ? 5 : 50) : 0)
            };
          }).sort((a, b) => a.id.localeCompare(b.id));
        }
      } catch (err) {
        console.error('Failed parsing opsi', q.opsi, err);
      }

      // Normalisasi & penskalaan bobot opsi TKP dan TWK/TIU sesuai gameMode
      const normalizedOptions = parsedOptions.map((o: any) => {
        let score = typeof o.score === 'number' ? o.score : (parseInt(o.score) || 0);
        if (q.tipe === 'TKP') {
          if (gameMode === 'tryout') {
            if (score > 5) score = Math.round(score / 10);
          } else {
            if (score <= 5) score = score * 10;
          }
        } else {
          const isCorrect = o.id === q.kunci;
          score = isCorrect ? (gameMode === 'tryout' ? 5 : 50) : 0;
        }
        return { ...o, score };
      });

      return {
        id: q.id,
        category: q.tipe,
        text: q.pertanyaan,
        options: normalizedOptions,
        correct: q.kunci,
        explanation: q.pembahasan
      };
    });

  } catch (err) {
    console.error('Gagal mengambil soal dari Supabase, fallback ke data lokal:', err);
    if (gameMode === 'tryout') {
      const { SOAL_TRYOUT } = await import('../data/soal_tryout');
      return SOAL_TRYOUT;
    }
    const { SOAL_SKD } = await import('../data/soal');
    if (gameMode === 'latihan' || gameMode === 'survival') return SOAL_SKD.sort(() => 0.5 - Math.random()).slice(0, gameMode === "survival" ? 500 : 10);
    if (gameMode === 'pvp' || gameMode === 'pvp1v1') return SOAL_SKD.sort(() => 0.5 - Math.random()).slice(0, 15);
    return SOAL_SKD;
  }
};