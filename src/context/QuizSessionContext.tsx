import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase, fetchProfile, updateProfile } from '../lib/supabase';

interface QuizSession {
  id: string;
  mode: string;
  questions: any[];
  currentIndex: number;
  answers: Record<string, string>;
  score: number;
  twkScore: number;
  tiuScore: number;
  tkpScore: number;
  usedPowerups: Array<{questionIndex: number; powerup: string}>;
  timeSpent: number;
  startedAt: string;
  packageId?: string;
  packageVersion?: number;
}

interface QuizSessionContextType {
  activeSession: QuizSession | null;
  isAutoSaving: boolean;
  createSession: (mode: string, questions: any[], packageId?: string, packageVersion?: number) => Promise<string>;
  updateSession: (sessionId: string, updates: Partial<QuizSession>) => Promise<void>;
  completeSession: (sessionId: string, finalData: {
    score: number;
    twkScore?: number;
    tiuScore?: number;
    tkpScore?: number;
    accuracy?: number;
    coinsEarned: number;
    xpEarned: number;
    finalAnswers?: Record<number, string>;
  }) => Promise<string>;
  recoverSession: () => Promise<QuizSession | null>;
  abandonSession: (sessionId: string) => Promise<void>;
  clearSession: () => void;
  /** Save-on-answer dengan debounce 3 detik. Panggil ini setiap user memilih jawaban. */
  debouncedSave: (sessionId: string, updates: Partial<QuizSession>) => void;
}

const QuizSessionContext = createContext<QuizSessionContextType | undefined>(undefined);

export function QuizSessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const activeSessionRef = useRef<QuizSession | null>(null);
  const isAutoSavingRef = useRef(false);
  // Debounce timer ref untuk save-on-answer (3 detik)
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pending update terbaru — mencegah update stale saat request aktif
  const pendingSaveRef = useRef<{ sessionId: string; updates: Partial<QuizSession> } | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    isAutoSavingRef.current = isAutoSaving;
  }, [isAutoSaving]);

  const updateSession = useCallback(async (sessionId: string, updates: Partial<QuizSession>) => {
    const updateData: any = {
      last_activity_at: new Date().toISOString()
    };

    if (updates.currentIndex !== undefined) updateData.current_index = updates.currentIndex;
    if (updates.answers !== undefined) updateData.answers_json = updates.answers;
    if (updates.score !== undefined) updateData.score = updates.score;
    if (updates.twkScore !== undefined) updateData.twk_score = updates.twkScore;
    if (updates.tiuScore !== undefined) updateData.tiu_score = updates.tiuScore;
    if (updates.tkpScore !== undefined) updateData.tkp_score = updates.tkpScore;
    if (updates.usedPowerups !== undefined) updateData.used_powerups = updates.usedPowerups;
    if (updates.timeSpent !== undefined) updateData.time_spent_seconds = updates.timeSpent;
    if (updates.startedAt !== undefined) updateData.started_at = updates.startedAt;

    const { error } = await supabase!
      .from('quiz_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) throw error;

    // Update local state
    if (activeSession?.id === sessionId) {
      setActiveSession({ ...activeSession, ...updates });
    }
  }, [activeSession]);

  // Sinyal disconnect saat tab ditutup menggunakan sendBeacon
  // Alasan: async fetch/supabase client tidak dijamin selesai saat beforeunload
  // sendBeacon adalah satu-satunya cara reliable untuk kirim data saat tab ditutup
  useEffect(() => {
    const handleBeforeUnload = () => {
      const session = activeSessionRef.current;
      if (!session) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) return;

      // PATCH ke Supabase REST API langsung via sendBeacon
      // Filter: hanya update session milik user ini yang masih active
      const url = `${supabaseUrl}/rest/v1/quiz_sessions?id=eq.${session.id}&status=eq.active`;
      const payload = JSON.stringify({
        status: 'interrupted',
        last_activity_at: new Date().toISOString()
      });

      // sendBeacon tidak support custom method (hanya POST)
      // Supabase REST butuh PATCH — gunakan fetch keepalive sebagai fallback
      // keepalive=true menjamin request dikirim meski halaman ditutup
      try {
        fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: payload,
          keepalive: true  // kunci: browser kirim request ini meski tab ditutup
        });
      } catch {
        // Silent fail — tidak ada yang bisa dilakukan di beforeunload
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []); // Aman pakai [] karena session diakses via ref, bukan closure state

  // Save-on-answer dengan debounce 3 detik — menggantikan interval auto-save 30 detik.
  // Dipanggil dari Quiz.tsx setiap kali user memilih jawaban.
  const debouncedSave = useCallback((sessionId: string, updates: Partial<QuizSession>) => {
    // Update local state langsung agar UI tetap responsif
    setActiveSession(prev => prev && prev.id === sessionId ? { ...prev, ...updates } : prev);

    // Simpan pending update terbaru di ref
    pendingSaveRef.current = { sessionId, updates };

    // Batalkan save sebelumnya; flush yang tertunda setelah request selesai
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      if (isAutoSavingRef.current) return;
      const currentSession = activeSessionRef.current;
      if (!currentSession || currentSession.id !== sessionId) return;
      try {
        setIsAutoSaving(true);
        // Ambil update terbaru dari ref (bukan closure)
        const latest = pendingSaveRef.current;
        if (latest && latest.sessionId === sessionId) {
          await updateSession(sessionId, latest.updates);
          pendingSaveRef.current = null;
        }
      } catch {
        // Silent fail — data tetap aman di local state
      } finally {
        setIsAutoSaving(false);
        // Flush ulang bila ada update baru selama request
        const remaining = pendingSaveRef.current;
        if (remaining && remaining.sessionId === sessionId) {
          debouncedSave(remaining.sessionId, remaining.updates);
        }
      }
    }, 3000);
  }, [updateSession]);

  // Cleanup debounce timer saat unmount
  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, []);

  const createSession = useCallback(async (mode: string, questions: any[], packageId?: string, packageVersion?: number): Promise<string> => {
    let { data: { user } } = await supabase!.auth.getUser();
    if (!user) {
      const { data: sessionData } = await supabase!.auth.getSession();
      user = sessionData.session?.user || null;
    }
    if (!user) throw new Error('Not authenticated');

    // Energy deduction is handled by Quiz.tsx (Deferred Deduction)

    // Prepare payload
    const insertPayload: any = {
      user_id: user.id,
      mode,
      questions_json: questions,
      status: 'active',
      energy_consumed: 1,
      package_id: packageId || null,
      package_version: packageVersion || 1
    };

    // Create session
    let { data, error } = await supabase!
      .from('quiz_sessions')
      .insert(insertPayload)
      .select()
      .single();

    // Fallback if package_id column does not exist in production schema yet
    if (error && error.message && error.message.includes('package_id')) {
      console.warn("Schema mismatch: package_id column not found, retrying without package_id...");
      delete insertPayload.package_id;
      delete insertPayload.package_version;
      const retryResult = await supabase!
        .from('quiz_sessions')
        .insert(insertPayload)
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) throw error;

    const session: QuizSession = {
      id: data.id,
      mode: data.mode,
      questions: data.questions_json,
      currentIndex: data.current_index || 0,
      answers: data.answers_json || {},
      score: data.score || 0,
      twkScore: data.twk_score || 0,
      tiuScore: data.tiu_score || 0,
      tkpScore: data.tkp_score || 0,
      usedPowerups: data.used_powerups || [],
      timeSpent: data.time_spent_seconds || 0,
      startedAt: data.started_at || new Date().toISOString(),
      packageId: data.package_id,
      packageVersion: data.package_version
    };

    setActiveSession(session);
    if (import.meta.env.DEV) console.log('✅ Quiz session created:', data.id);
    return data.id;
  }, []);

  const completeSession = useCallback(async (
    sessionId: string,
    finalData: {
      score: number;
      twkScore?: number;
      tiuScore?: number;
      tkpScore?: number;
      accuracy?: number;
      coinsEarned: number;
      xpEarned: number;
      finalAnswers?: Record<number, string>;
    }
  ): Promise<string> => {
    // Snapshot session sebelum async agar tidak stale jika state berubah
    const session = activeSessionRef.current;
    if (!session || session.id !== sessionId) throw new Error('No active session');

    // ── Hitung passing status di client (informasi saja, server tetap authority) ──
    let passedTwk: boolean | null = null;
    let passedTiu: boolean | null = null;
    let passedTkp: boolean | null = null;
    let passedOverall: boolean | null = null;

    if (session.mode === 'tryout') {
      const twkCount = session.questions.filter((q: any) => q.category === 'TWK').length;
      const tiuCount = session.questions.filter((q: any) => q.category === 'TIU').length;
      const tkpCount = session.questions.filter((q: any) => q.category === 'TKP').length;

      const twkThreshold = twkCount < 30 ? Math.ceil(twkCount * 0.433 * 5) : 65;
      const tiuThreshold = tiuCount < 35 ? Math.ceil(tiuCount * 0.457 * 5) : 80;
      const tkpThreshold = tkpCount < 45 ? Math.ceil(tkpCount * 0.293 * 5) : 166;

      passedTwk    = (finalData.twkScore ?? 0) >= twkThreshold;
      passedTiu    = (finalData.tiuScore ?? 0) >= tiuThreshold;
      passedTkp    = (finalData.tkpScore ?? 0) >= tkpThreshold;
      passedOverall = passedTwk && passedTiu && passedTkp;
    }

    // ── Hitung akurasi dari jawaban final (sebelum atomic RPC) ──
    const answersToUse = finalData.finalAnswers
      ? Object.fromEntries(
          Object.entries(finalData.finalAnswers).map(([k, v]) => [k, v])
        )
      : session.answers;

    let twkCor = 0, tiuCor = 0, tkpCor = 0;
    let twkTot = 0, tiuTot = 0, tkpTot = 0;

    session.questions.forEach((q: any, idx: number) => {
      const ansId = answersToUse[idx];
      if (q.category === 'TWK') {
        twkTot++;
        if (ansId && ansId === q.correct) twkCor++;
      } else if (q.category === 'TIU') {
        tiuTot++;
        if (ansId && ansId === q.correct) tiuCor++;
      } else if (q.category === 'TKP') {
        tkpTot++;
        if (ansId) {
          const opt = q.options?.find((o: any) => o.id === ansId);
          // Nilai TKP maksimal adalah 5 (skala 1–5), bukan 50
          // Gunakan satu threshold konsisten: nilai >= 5 dianggap jawaban terbaik
          if (opt && opt.score >= 5) tkpCor++;
        }
      }
    });

    // ── ATOMIC RPC: satu panggilan menangani semua operasi sekaligus ──
    // complete_quiz_session di server melakukan:
    //   1. UPDATE quiz_sessions SET status='completed', answers_json, score, ...
    //   2. INSERT quiz_results
    //   3. UPDATE profiles SET coins, score, level, total_quizzes_completed, ...
    // Semua dalam satu transaksi DB — tidak ada window of failure
    const { data: resultId, error: rpcError } = await supabase!.rpc('complete_quiz_session', {
      p_session_id:   sessionId,
      p_score:        finalData.score,
      p_twk_score:    finalData.twkScore    ?? 0,
      p_tiu_score:    finalData.tiuScore    ?? 0,
      p_tkp_score:    finalData.tkpScore    ?? 0,
      p_accuracy:     finalData.accuracy    ?? 0,
      p_coins_earned: finalData.coinsEarned,
      p_xp_earned:    finalData.xpEarned,
      p_passed_twk:   passedTwk,
      p_passed_tiu:   passedTiu,
      p_passed_tkp:   passedTkp,
      p_passed_overall: passedOverall,
      // Kirim answers_json & package_id langsung ke RPC
      // agar server bisa simpan semuanya dalam satu transaksi
      p_answers_json: answersToUse,
      p_package_id:   session.packageId ?? null
    });

    // Jika RPC gagal, jangan clear session — biarkan user retry
    if (rpcError) throw rpcError;

    // ── Update akurasi profil (fire-and-forget, bukan blocking) ──
    // Ini bukan data kritis — boleh gagal tanpa memblokir navigasi
    fetchProfile('current')
      .then(profile => {
        if (!profile) return;
        const prev = (profile.akurasi as any) ?? {
          TWK: { correct: 0, total: 0 },
          TIU: { correct: 0, total: 0 },
          TKP: { correct: 0, total: 0 }
        };
        return updateProfile({
          akurasi: {
            TWK: { correct: (prev.TWK?.correct ?? 0) + twkCor, total: (prev.TWK?.total ?? 0) + twkTot },
            TIU: { correct: (prev.TIU?.correct ?? 0) + tiuCor, total: (prev.TIU?.total ?? 0) + tiuTot },
            TKP: { correct: (prev.TKP?.correct ?? 0) + tkpCor, total: (prev.TKP?.total ?? 0) + tkpTot }
          }
        });
      })
      .catch(() => { /* non-critical, abaikan */ });

    setActiveSession(null);
    return resultId;
  }, [activeSession]);

  const recoverSession = useCallback(async (): Promise<QuizSession | null> => {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase!
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const session: QuizSession = {
      id: data.id,
      mode: data.mode,
      questions: data.questions_json,
      currentIndex: data.current_index || 0,
      answers: data.answers_json || {},
      score: data.score || 0,
      twkScore: data.twk_score || 0,
      tiuScore: data.tiu_score || 0,
      tkpScore: data.tkp_score || 0,
      usedPowerups: data.used_powerups || [],
      timeSpent: data.time_spent_seconds || 0,
      startedAt: data.started_at || new Date().toISOString(),
      packageId: data.package_id,
      packageVersion: data.package_version
    };

    setActiveSession(session);
    if (import.meta.env.DEV) console.log('✅ Recovered quiz session:', data.id);
    return session;
  }, []);

  const abandonSession = useCallback(async (sessionId: string) => {
    const { error } = await supabase!
      .from('quiz_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId);

    if (error) throw error;

    setActiveSession(null);
    if (import.meta.env.DEV) console.log('✅ Quiz session abandoned:', sessionId);
  }, []);

  const clearSession = useCallback(() => {
    setActiveSession(null);
  }, []);

  return (
    <QuizSessionContext.Provider value={{
      activeSession,
      isAutoSaving,
      createSession,
      updateSession,
      completeSession,
      recoverSession,
      abandonSession,
      clearSession,
      debouncedSave
    }}>
      {children}
    </QuizSessionContext.Provider>
  );
}

export function useQuizSession() {
  const context = useContext(QuizSessionContext);
  if (!context) {
    throw new Error('useQuizSession must be used within QuizSessionProvider');
  }
  return context;
}
