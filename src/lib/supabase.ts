import { createClient } from '@supabase/supabase-js';
import { sortByAdaptiveDifficulty } from '../calculations/adaptive';

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
  catatan_salah?: Array<{ id: string; type: string; mastery?: number } | string>;
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

/**
 * SEC-01: Atomic energy deduction via RPC (auth.uid server-side).
 * Signature: consume_energy(p_amount int) -> { success, energy_after }
 * Server regen dulu (1/150s, cap 25) lalu potong.
 */
export const consumeEnergy = async (
  amount: number
): Promise<{ success: boolean; energyAfter: number; reason?: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: true, energyAfter: 0 };
  }
  try {
    const { data, error } = await supabase!.rpc('consume_energy', {
      p_amount: amount,
    });
    if (error) {
      if (error.message?.includes('insufficient_energy')) {
        return { success: false, energyAfter: 0, reason: 'insufficient_energy' };
      }
      throw error;
    }
    if (data && typeof data === 'object' && 'success' in data) {
      const result = data as { success: boolean; energy_after?: number; reason?: string };
      return {
        success: !!result.success,
        energyAfter: result.energy_after ?? 0,
        reason: result.reason,
      };
    }
    return { success: true, energyAfter: data as number };
  } catch (err) {
    console.error('consumeEnergy failed:', err);
    return { success: false, energyAfter: 0, reason: 'error' };
  }
};

/**
 * Sync energy regen server-side.
 * Signature: sync_energy() -> { success, energy, seconds_to_next, recovered }
 */
export const syncEnergy = async (): Promise<{
  success: boolean;
  energy: number;
  secondsToNext: number;
  recovered: number;
  reason?: string;
}> => {
  if (!isSupabaseConfigured()) {
    return { success: true, energy: 25, secondsToNext: 0, recovered: 0 };
  }
  try {
    const { data, error } = await supabase!.rpc('sync_energy');
    if (error) throw error;
    const result = (data ?? {}) as {
      success?: boolean;
      energy?: number;
      seconds_to_next?: number;
      recovered?: number;
      reason?: string;
    };
    return {
      success: !!result.success,
      energy: result.energy ?? 0,
      secondsToNext: result.seconds_to_next ?? 0,
      recovered: result.recovered ?? 0,
      reason: result.reason,
    };
  } catch (err) {
    console.error('syncEnergy failed:', err);
    return { success: false, energy: 0, secondsToNext: 0, recovered: 0, reason: 'error' };
  }
};

/**
 * SEC: Atomic power-up consume via RPC (auth.uid + session ownership).
 * Signature: consume_powerup(p_session_id uuid, p_item_id text)
 * -> { success, item_remaining, item_id?, reason? }
 */
export const consumePowerup = async (
  sessionId: string,
  itemId: string
): Promise<{ success: boolean; itemRemaining: number; reason?: string }> => {
  if (!isSupabaseConfigured()) {
    // ponytail: local/dev without Supabase — skip server stock authority
    return { success: true, itemRemaining: 0 };
  }
  try {
    const { data, error } = await supabase!.rpc('consume_powerup', {
      p_session_id: sessionId,
      p_item_id: itemId,
    });
    if (error) throw error;
    const result = (data ?? {}) as {
      success?: boolean;
      item_remaining?: number;
      reason?: string;
    };
    return {
      success: !!result.success,
      itemRemaining: result.item_remaining ?? 0,
      reason: result.reason,
    };
  } catch (err) {
    console.error('consumePowerup failed:', err);
    return { success: false, itemRemaining: 0, reason: 'error' };
  }
};

/**
 * Potong entry fee tryout (server catalog: standar 1000 / akbar 1500).
 * Signature: start_tryout_attempt(p_package_id text, p_tier text)
 */
export const startTryoutAttempt = async (
  packageId?: string,
  tier: 'standar' | 'akbar' = 'standar'
): Promise<{ success: boolean; coinsAfter: number; cost: number; reason?: string }> => {
  if (!isSupabaseConfigured()) {
    // ponytail: local/dev tanpa Supabase
    return { success: true, coinsAfter: 0, cost: tier === 'akbar' ? 1500 : 1000 };
  }
  try {
    const { data, error } = await supabase!.rpc('start_tryout_attempt', {
      p_package_id: packageId ?? null,
      p_tier: tier,
    });
    if (error) throw error;
    const result = (data ?? {}) as {
      success?: boolean;
      coins_after?: number;
      cost?: number;
      reason?: string;
    };
    return {
      success: !!result.success,
      coinsAfter: result.coins_after ?? 0,
      cost: result.cost ?? (tier === 'akbar' ? 1500 : 1000),
      reason: result.reason,
    };
  } catch (err) {
    console.error('startTryoutAttempt failed:', err);
    return { success: false, coinsAfter: 0, cost: 0, reason: 'error' };
  }
};

/**
 * Reset misi harian (quest 1-3) sekali per hari Asia/Jakarta.
 * Signature: reset_daily_quests() -> { success, reset, quests_progress }
 */
export const resetDailyQuests = async (): Promise<{
  success: boolean;
  reset: boolean;
  questsProgress?: Record<string, number>;
  reason?: string;
}> => {
  if (!isSupabaseConfigured()) {
    return { success: true, reset: false };
  }
  try {
    const { data, error } = await supabase!.rpc('reset_daily_quests');
    if (error) throw error;
    const result = (data ?? {}) as {
      success?: boolean;
      reset?: boolean;
      quests_progress?: Record<string, number>;
      reason?: string;
    };
    return {
      success: !!result.success,
      reset: !!result.reset,
      questsProgress: result.quests_progress,
      reason: result.reason,
    };
  } catch (err) {
    console.error('resetDailyQuests failed:', err);
    return { success: false, reset: false, reason: 'error' };
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
export const fetchQuestionsFromSupabase = async (gameMode: string, packageId?: string) => {
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
      // Jika packageId diberikan, filter by paket_id; fallback ke semua soal jika tidak ada paket
      const fetchCategory = async (tipe: string, limit: number) => {
        if (packageId) {
          // Opsi A: filter by paket_id — butuh kolom paket_id di tabel soal_tryout
          const res = await supabase!
            .from('soal_tryout')
            .select('*')
            .eq('tipe', tipe)
            .eq('paket_id', packageId);
          if (!res.error && res.data && res.data.length > 0) {
            return shuffle(res.data).slice(0, limit);
          }
          // fallback ke soal umum jika paket belum punya soal
        }
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
              coin_reward: q.coin_reward || 5,
              difficulty: q.difficulty || 'sedang',
            };
    });

        // Apply adaptive difficulty sorting for latihan + survival (not PvP, not Tryout)
        if (gameMode === 'latihan' || gameMode === 'survival') {
          const firstCategory = questions[0]?.category;
          if (firstCategory) {
            questions = sortByAdaptiveDifficulty(questions, firstCategory);
          }
        }

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

export async function saveWrongQuestion(_userId: string, questionId: string, quizType: string) {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const { data, error } = await supabase.rpc('record_wrong_answer', {
      p_question_id: questionId,
      p_quiz_type: quizType || '',
    });
    if (error) throw error;
    if (data && typeof data === 'object' && 'success' in data && !(data as { success?: boolean }).success) {
      console.warn('record_wrong_answer:', (data as { reason?: string }).reason);
    }
  } catch (err) {
    console.error('saveWrongQuestion failed:', err);
  }
}

/** Map baris soal_skd / soal_tryout → shape runtime Question (selaras fetchQuestionsFromSupabase). */
function mapSoalRowToQuestion(q: any): {
  id: string;
  category: string;
  text: string;
  options: Array<{ id: string; text: string; score: number }>;
  correct: string;
  explanation: string;
} {
  let parsedOptions: any[] = [];
  try {
    const rawOpsi = typeof q.opsi === 'string' ? JSON.parse(q.opsi) : q.opsi;
    if (Array.isArray(rawOpsi)) {
      if (typeof rawOpsi[0] === 'string') {
        const labels = ['A', 'B', 'C', 'D', 'E'];
        parsedOptions = rawOpsi.map((text: string, i: number) => ({
          id: labels[i] || String(i),
          text,
          score: 0,
        }));
      } else {
        parsedOptions = rawOpsi;
      }
    } else if (rawOpsi && typeof rawOpsi === 'object') {
      parsedOptions = Object.keys(rawOpsi).map((key) => {
        const val = rawOpsi[key];
        if (typeof val === 'object' && val !== null) return { id: key, ...val };
        return { id: key, text: String(val), score: 0 };
      }).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    }
  } catch {
    parsedOptions = [];
  }

  const tipe = (q.tipe || q.category || '').toUpperCase();
  const kunci = q.kunci || q.correct || '';
  const options = parsedOptions.map((o: any) => {
    let score = typeof o.score === 'number' ? o.score : (parseInt(o.score, 10) || 0);
    if (tipe === 'TKP') {
      if (score > 5) score = Math.round(score / 10);
      score = Math.max(1, Math.min(5, score || 1));
    } else {
      score = o.id === kunci ? 5 : 0;
    }
    return { id: String(o.id), text: String(o.text ?? ''), score };
  });

  return {
    id: String(q.id),
    category: tipe || 'TWK',
    text: q.pertanyaan || q.text || '',
    options,
    correct: String(kunci),
    explanation: q.pembahasan || q.explanation || 'Tidak ada pembahasan.',
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Resolve id catatan_salah dari soal_skd dulu, sisa coba soal_tryout. */
async function fetchSoalByIds(ids: string[]): Promise<Map<string, ReturnType<typeof mapSoalRowToQuestion>>> {
  const out = new Map<string, ReturnType<typeof mapSoalRowToQuestion>>();
  if (!supabase || ids.length === 0) return out;

  // Hanya UUID valid — id numerik legacy (mis. "831450") bikin error cast uuid di PostgREST
  const uuidIds = ids.filter((id) => UUID_RE.test(String(id)));
  if (uuidIds.length === 0) return out;

  // Supabase .in() aman per batch
  const chunk = <T,>(arr: T[], size: number) => {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
    return res;
  };

  for (const part of chunk(uuidIds, 100)) {
    const { data, error } = await supabase
      .from('soal_skd')
      .select('id, tipe, pertanyaan, opsi, kunci, pembahasan')
      .in('id', part);
    if (error) {
      console.error('fetchSoalByIds soal_skd:', error);
    } else {
      for (const row of data || []) {
        out.set(String(row.id), mapSoalRowToQuestion(row));
      }
    }
  }

  const missing = uuidIds.filter((id) => !out.has(id));
  for (const part of chunk(missing, 100)) {
    if (part.length === 0) break;
    const { data, error } = await supabase
      .from('soal_tryout')
      .select('id, tipe, pertanyaan, opsi, kunci, pembahasan')
      .in('id', part);
    if (error) {
      console.error('fetchSoalByIds soal_tryout:', error);
      continue;
    }
    for (const row of data || []) {
      out.set(String(row.id), mapSoalRowToQuestion(row));
    }
  }

  return out;
}

export async function getWrongQuestions(userId: string, filter?: string) {
  if (!supabase) return [];

  const profile = await fetchProfile(userId);
  if (!profile || !profile.catatan_salah || profile.catatan_salah.length === 0) return [];

  const activeWrongQs = profile.catatan_salah.map((item: any) => {
    if (typeof item === 'string') return { id: item, type: '', mastery: 0 };
    return { id: String(item.id), type: item.type || '', mastery: item.mastery || 0 };
  }).filter((item: any) => item.id && item.mastery < 3);

  let filteredQs = activeWrongQs;
  if (filter) {
    filteredQs = activeWrongQs.filter(
      (item: any) => item.type?.toUpperCase() === filter.toUpperCase()
    );
  }
  if (filteredQs.length === 0) return [];

  const questionIds = filteredQs.map((item: any) => item.id);
  const byId = await fetchSoalByIds(questionIds);

  // Hanya yang ketemu di DB; orphan id di-skip (bukan empty state palsu di caller)
  return filteredQs
    .map((meta: any) => {
      const q = byId.get(meta.id);
      if (!q) return null;
      const category = (meta.type || q.category || '').toUpperCase() || q.category;
      return {
        id: `wb_${q.id}`,
        mastery_count: meta.mastery || 0,
        quiz_type: category,
        question_id: q.id,
        category,
        question: q.text,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        // legacy nested shape (jika ada consumer lama)
        questions: q,
      };
    })
    .filter(Boolean) as any[];
}

/** Resolve daftar Question runtime untuk mode quiz catatan_salah. */
export async function resolveWrongQuestionsForQuiz(
  refs: Array<{ id: string; type?: string; mastery?: number } | string>
): Promise<Array<{
  id: string;
  category: string;
  text: string;
  options: Array<{ id: string; text: string; score: number }>;
  correct: string;
  explanation: string;
  xp_reward: number;
  coin_reward: number;
}>> {
  const active = refs
    .map((item) => {
      if (typeof item === 'string') return { id: item, mastery: 0 };
      return { id: String(item.id), mastery: item.mastery || 0 };
    })
    .filter((x) => x.id && x.mastery < 3);
  if (active.length === 0) return [];
  const byId = await fetchSoalByIds(active.map((x) => x.id));
  return active
    .map((m) => {
      const q = byId.get(m.id);
      if (!q) return null;
      return {
        ...q,
        xp_reward: 10,
        coin_reward: 5,
      };
    })
    .filter(Boolean) as any[];
}

export async function incrementMastery(_userId: string, questionId: string) {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const { data, error } = await supabase.rpc('increment_wrong_mastery', {
      p_question_id: questionId,
    });
    if (error) throw error;
    if (data && typeof data === 'object' && 'success' in data && !(data as { success?: boolean }).success) {
      console.warn('increment_wrong_mastery:', (data as { reason?: string }).reason);
    }
  } catch (err) {
    console.error('incrementMastery failed:', err);
  }
}

export async function getWrongBooksStats(userId: string) {
  if (!supabase) return { twk: 0, tiu: 0, tkp: 0, total: 0, unresolved: 0 };

  // Stats selaras list: hanya id yang resolve di soal_skd/tryout + mastery < 3
  const list = await getWrongQuestions(userId);
  const stats = { twk: 0, tiu: 0, tkp: 0, total: 0, unresolved: 0 };
  list.forEach((q: any) => {
    stats.total++;
    const type = (q.category || q.quiz_type || '').toUpperCase();
    if (type === 'TWK') stats.twk++;
    else if (type === 'TIU') stats.tiu++;
    else if (type === 'TKP') stats.tkp++;
  });

  // Hitung orphan (ada di profil, tidak di bank soal) untuk debug UI
  const profile = await fetchProfile(userId);
  if (profile?.catatan_salah) {
    const active = profile.catatan_salah.filter((item: any) => {
      const mastery = typeof item === 'string' ? 0 : (item.mastery || 0);
      return mastery < 3;
    }).length;
    stats.unresolved = Math.max(0, active - stats.total);
  }

  return stats;
}