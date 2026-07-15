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
  selected_avatar?: string;
  unlocked_avatars?: string[];       // khusus ID karakter/avatar
  purchased_packages?: string[];     // khusus ID paket premium (paket_*)
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
    item_tinta_hitam?: number;
    item_lompatan_kilat?: number;
  };
  quests_progress?: Record<number, number>;
  quests_claimed?: number[];
  nickname?: string;
  target_kedinasan?: string;
  bio?: string;
  akurasi?: {
    TWK: { correct: number; total: number };
    TIU: { correct: number; total: number };
    TKP: { correct: number; total: number };
  };
    friends?: string[];       // array user_id pertemanan
  catatan_salah?: Array<{ id: string; type: string }>;
  last_spin_date?: string;
  last_claim_date?: string;
  badges?: number[];
  total_quizzes_completed?: number;
  total_correct_answers?: number;
  total_pvp_wins?: number;
  highest_survival_score?: number;
  last_login?: string;
  last_energy_update?: string;
}

export interface Character {
  id: string;
  name: string;
  gender: 'male' | 'female';
  image_url: string;
  is_free: boolean;
}

// ── Supabase-only API ──

const normalizeProfile = (data: any): UserProfile | null => {
  if (!data) return null;
  const parseSafely = (val: any) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    return val;
  };
  data.quests_progress = parseSafely(data.quests_progress);
  data.akurasi = parseSafely(data.akurasi);
  data.inventory = parseSafely(data.inventory);
  data.catatan_salah = parseSafely(data.catatan_salah);
  data.friends = parseSafely(data.friends);
  if (typeof data.purchased_packages === 'string') {
    data.purchased_packages = parseSafely(data.purchased_packages);
  }
  return data as UserProfile;
};

// 1. Ambil Profil Pengguna
export const fetchProfile = async (userId: string = 'current'): Promise<UserProfile | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  let targetId = userId;
  
  if (targetId === 'current') {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) {
      return null;
    }
    targetId = user.id;
  }

  try {
    const { data, error } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .single();

    if (error) throw error;
    
    return normalizeProfile(data) as UserProfile;
  } catch (err) {
    console.error('Gagal mengambil profil dari Supabase:', err);
    return null;
  }
};

// 2. Simpan/Update Profil Pengguna
export const updateProfile = async (profileUpdate: Partial<UserProfile>): Promise<UserProfile | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    // Cari user ID aktif di Supabase
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return null;

    const payload: Partial<UserProfile> & { updated_at: Date } = { ...profileUpdate, updated_at: new Date() };

    const { data, error } = await supabase!
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    return normalizeProfile(data) as UserProfile;
  } catch (err) {
    console.error('Gagal menyimpan profil ke Supabase:', err);
    return null;
  }
};

// 3. Gabung Papan Peringkat Bulanan (Leaderboard/Liga)
export const fetchMonthlyLeaderboard = async () => {
  if (!isSupabaseConfigured()) {
    // Mengembalikan data statis tiruan jika Supabase belum disetup
    return [
      { rank: 1, name: 'Raden Saori', score: 3800, isMe: false },
      { rank: 2, name: 'BudiSantoso', score: 3210, isMe: false },
      { rank: 3, name: 'SitiRahma', score: 2950, isMe: false }
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
      id: p.id,
      rank: idx + 1,
      name: p.username,
      score: p.score,
      isMe: p.id === currentUserId
    }));
  } catch (err) {
    console.error('Fetch Supabase Leaderboard gagal, menggunakan fallback:', err);
    return [
      { rank: 1, name: 'Raden Saori', score: 3800, isMe: false },
      { rank: 2, name: 'BudiSantoso', score: 3210, isMe: false }
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

export async function getUserAnalytics(userId: string) {
  if (!supabase) return null;
  
  const wrongStats = await getWrongBooksStats(userId);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: results, error } = await supabase
    .from('quiz_results')
    .select('created_at, score')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching quiz results:', error);
  }
  
  const dailyScores: Record<string, { total: number, count: number }> = {};
  
  results?.forEach(res => {
    const date = new Date(res.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
    if (!dailyScores[date]) {
      dailyScores[date] = { total: 0, count: 0 };
    }
    dailyScores[date].total += (res.score || 0);
    dailyScores[date].count += 1;
  });
  
  const trendLabels = Object.keys(dailyScores);
  const trendData = trendLabels.map(date => Math.round(dailyScores[date].total / dailyScores[date].count));

  if (trendLabels.length === 0) {
    const today = new Date().toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
    trendLabels.push(today);
    trendData.push(0);
  }
  
  return {
    wrongStats,
    trend: {
      labels: trendLabels,
      data: trendData
    }
  };
}

// 5. Mengambil Soal dari Supabase (Soal SKD)
export const fetchQuestionsFromSupabase = async (gameMode: string) => {
    if (!isSupabaseConfigured()) {
    // Fallback ke data lokal terstruktur jika Supabase belum dikonfigurasi
    const { getRandomQuestions } = await import('../data/questions/index');
    if (gameMode === 'tryout') {
      return [
        ...getRandomQuestions('TWK', 30),
        ...getRandomQuestions('TIU', 35),
        ...getRandomQuestions('TKP', 45)
      ];
    }
    if (gameMode === 'survival') return getRandomQuestions('ALL');
    if (gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') return getRandomQuestions('ALL', 15);
    return getRandomQuestions('ALL', 10);
  }

  try {
    let questions: any[] = [];
    
    // Helper Fisher-Yates shuffle — lebih acak dari sort(() => Math.random())
    const shuffle = <T>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    if (gameMode === 'latihan') {
      // Ambil lebih banyak dari DB lalu shuffle & slice untuk variasi maksimal
      const { data, error } = await supabase!.rpc('get_random_soal', { limit_count: 10 });
      if (error) {
        const res = await supabase!.from('soal_skd').select('*').limit(100);
        if (res.error) throw res.error;
        questions = shuffle(res.data).slice(0, 10);
      } else {
        questions = data;
      }
    } else if (gameMode === 'survival') {
      // Survival butuh lebih banyak soal — ambil semua lalu shuffle
      const { data, error } = await supabase!.rpc('get_random_soal', { limit_count: 500 });
      if (error) {
        const res = await supabase!.from('soal_skd').select('*');
        if (res.error) throw res.error;
        questions = shuffle(res.data);
      } else {
        questions = data;
      }
    } else if (gameMode === 'pvp' || gameMode === 'pvp1v1') {
      // 15 soal acak — ambil lebih banyak lalu shuffle & slice
      const { data, error } = await supabase!.rpc('get_random_soal', { limit_count: 15 });
      if (error) {
        const res = await supabase!.from('soal_skd').select('*').limit(100);
        if (res.error) throw res.error;
        questions = shuffle(res.data).slice(0, 15);
      } else {
        questions = data;
      }
    } else if (gameMode === 'tryout') {
      // 110 soal berdasar kategori dari tabel 'soal_tryout' untuk Try Out BKN Standar
      const fetchCategory = async (tipe: string, limit: number) => {
        const { data, error } = await supabase!.rpc('get_random_tryout_soal_by_tipe', { soal_tipe: tipe, limit_count: limit });
        if (error) {
          const res = await supabase!.from('soal_tryout').select('*').eq('tipe', tipe);
          if (res.error) throw res.error;
          return shuffle(res.data).slice(0, limit);
        }
        return data;
      };

      const [twk, tiu, tkp] = await Promise.all([
        fetchCategory('TWK', 30),
        fetchCategory('TIU', 35),
        fetchCategory('TKP', 45)
      ]);

      // Tryout: urutan TWK → TIU → TKP (standar BKN), tapi soal dalam tiap kategori sudah diacak
      questions = [...twk, ...tiu, ...tkp];
    } else {
      // Default: ambil lalu shuffle
      const { data, error } = await supabase!.from('soal_skd').select('*').limit(50);
      if (error) throw error;
      questions = shuffle(data).slice(0, 10);
    }

        // Jika database berhasil dihubungi tapi tabel masih KOSONG, gunakan data lokal terstruktur
    if (!questions || questions.length === 0) {
      console.warn('Tabel Supabase kosong, fallback ke questions/index.ts');
      const { getRandomQuestions } = await import('../data/questions/index');
      if (gameMode === 'tryout') {
        return [
          ...getRandomQuestions('TWK', 30),
          ...getRandomQuestions('TIU', 35),
          ...getRandomQuestions('TKP', 45)
        ];
      }
      if (gameMode === 'survival') return getRandomQuestions('ALL');
      if (gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') return getRandomQuestions('ALL', 15);
      return getRandomQuestions('ALL', 10);
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

            // Normalisasi score ke skala 0-5 (contract Question interface)
      // TWK/TIU: benar = 5, salah = 0
      // TKP: ambil score langsung (1-5), normalisasi jika masih skala lama (>5)
      const normalizedOptions = parsedOptions.map((o: any) => {
        let score = typeof o.score === 'number' ? o.score : (parseInt(o.score) || 0);
        if (q.tipe === 'TKP') {
          // Jika data lama masih pakai skala 10-50, konversi ke 1-5
          if (score > 5) score = Math.round(score / 10);
          score = Math.max(1, Math.min(5, score)); // clamp 1-5
        } else {
          // TWK / TIU: benar = 5, salah = 0 (skala konsisten dengan JSON lokal)
          score = o.id === q.kunci ? 5 : 0;
        }
        return { ...o, score };
      });

      return {
        id: q.id,
        category: q.tipe,
        text: q.pertanyaan,
        options: normalizedOptions,
        correct: q.kunci,
        explanation: q.pembahasan || 'Tidak ada pembahasan.',
        xp_reward: q.xp_reward || 10,
        coin_reward: q.coin_reward || 5
      };
    });

    } catch (err) {
    console.error('Gagal mengambil soal dari Supabase, fallback ke questions/index.ts:', err);
    const { getRandomQuestions } = await import('../data/questions/index');
    if (gameMode === 'tryout') {
      return [
        ...getRandomQuestions('TWK', 30),
        ...getRandomQuestions('TIU', 35),
        ...getRandomQuestions('TKP', 45)
      ];
    }
    if (gameMode === 'survival') return getRandomQuestions('ALL');
    if (gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') return getRandomQuestions('ALL', 15);
    return getRandomQuestions('ALL', 10);
  }
};

// 7. Ambil Daftar Karakter
export const fetchAvailableCharacters = async (): Promise<Character[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }
  try {
    const { data, error } = await supabase!.from('characters').select('*').order('id', { ascending: true });
    if (error) throw error;
    return data as Character[];
  } catch (err) {
    console.error('Gagal mengambil daftar karakter:', err);
    return [];
  }
};

export async function saveWrongQuestion(userId: string, questionId: string, quizType: string) {
  if (!supabase) return;
  
  // 1. Simpan ke tabel wrong_books
  const { error } = await supabase.from('wrong_books').upsert({
    user_id: userId,
    question_id: questionId,
    quiz_type: quizType,
    mastery_count: 0,
    last_attempted_at: new Date().toISOString()
  });
  if (error) console.error("Error saving wrong question:", error);

  // 2. Sinkronkan dengan field catatan_salah di profiles menggunakan logika normalizeProfile
  const profile = await fetchProfile(userId);
  if (profile) {
    const catatan = profile.catatan_salah || [];
    // Hindari duplikasi
    if (!catatan.find((item: any) => (item === questionId || item?.id === questionId))) {
      await updateProfile({ catatan_salah: [...catatan, { id: questionId, type: quizType }] });
    }
  }
}

export async function getWrongQuestions(userId: string, filter?: string) {
  if (!supabase) return [];
  let query = supabase
    .from('wrong_books')
    .select(`
      id, mastery_count, quiz_type, question_id,
      questions (*)
    `)
    .eq('user_id', userId)
    .lt('mastery_count', 3);
    
  if (filter) {
    query = query.eq('quiz_type', filter.toUpperCase());
  }
  
  const { data, error } = await query;

  
  if (error) {
    console.error("Error fetching wrong questions:", error);
    return [];
  }
  return data;
}

export async function incrementMastery(userId: string, questionId: string) {
  if (!supabase) return;
  const { error } = await supabase.rpc('increment_mastery', {
    p_user_id: userId,
    p_question_id: questionId
  });
  if (error) console.error("Error incrementing mastery:", error);
}

export async function getWrongBooksStats(userId: string) {
  if (!supabase) return { twk: 0, tiu: 0, tkp: 0, total: 0 };
  const { data, error } = await supabase
    .from('wrong_books')
    .select('quiz_type, mastery_count')
    .eq('user_id', userId)
    .lt('mastery_count', 3);

  if (error) {
    console.error("Error fetching wrong books stats:", error);
    return { twk: 0, tiu: 0, tkp: 0, total: 0 };
  }

  const stats = { twk: 0, tiu: 0, tkp: 0, total: 0 };

  data?.forEach(item => {
    const type = item.quiz_type?.toLowerCase() as keyof typeof stats;
    if (stats[type] !== undefined) {
      stats[type]++;
    }
    stats.total++;
  });

  return stats;
}