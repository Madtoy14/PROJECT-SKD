import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

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
}

const QuizSessionContext = createContext<QuizSessionContextType | undefined>(undefined);

export function QuizSessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const activeSessionRef = useRef<QuizSession | null>(null);
  const isAutoSavingRef = useRef(false);

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

  // Cleanup on unmount or sudden exit (browser close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const session = activeSessionRef.current;
      if (session) {
        supabase!.from('quiz_sessions').update({ status: 'cancelled' }).eq('id', session.id).then();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      const session = activeSessionRef.current;
      if (session) {
        supabase!.from('quiz_sessions').update({ status: 'cancelled' }).eq('id', session.id).then();
      }
    };
  }, []);

  // Auto-save every 30 seconds if there's an active session
  useEffect(() => {
    // Only initialize the interval if there's an active session
    if (!activeSession) return;

    const interval = setInterval(async () => {
      // Always get the latest session data from the ref so we don't need activeSession in deps
      const currentSession = activeSessionRef.current;
      if (!currentSession) return;

      if (isAutoSavingRef.current) {
        console.warn('Auto-save skipped: previous save still in progress');
        return;
      }
      try {
        setIsAutoSaving(true);
        await updateSession(currentSession.id, {
          currentIndex: currentSession.currentIndex,
          answers: currentSession.answers,
          score: currentSession.score,
          twkScore: currentSession.twkScore,
          tiuScore: currentSession.tiuScore,
          tkpScore: currentSession.tkpScore,
          usedPowerups: currentSession.usedPowerups
        });
        console.log('✅ Auto-saved quiz session:', currentSession.id);
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [activeSession?.id, updateSession]); // Only depend on ID so it doesn't reset on every answer/tick

  const createSession = useCallback(async (mode: string, questions: any[], packageId?: string, packageVersion?: number): Promise<string> => {
    let { data: { user } } = await supabase!.auth.getUser();
    if (!user) {
      console.warn("auth.getUser() returned null, attempting fallback to getSession()...");
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
    console.log('✅ Quiz session created:', data.id);
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
    const session = activeSession;
    if (!session) throw new Error('No active session');

    // Pastikan jawaban terakhir tersimpan di database sebelum RPC dijalankan
    if (finalData.finalAnswers) {
      await updateSession(sessionId, { answers: finalData.finalAnswers, score: finalData.score });
    }

    // Calculate passing status for tryout
    let passedTwk = null;
    let passedTiu = null;
    let passedTkp = null;
    let passedOverall = null;

    if (session.mode === 'tryout') {
      const twkQuestions = session.questions.filter((q: any) => q.category === 'TWK').length;
      const tiuQuestions = session.questions.filter((q: any) => q.category === 'TIU').length;
      const tkpQuestions = session.questions.filter((q: any) => q.category === 'TKP').length;

      const twkPassThreshold = twkQuestions < 30 ? Math.ceil(twkQuestions * 0.433 * 5) : 65;
      const tiuPassThreshold = tiuQuestions < 35 ? Math.ceil(tiuQuestions * 0.457 * 5) : 80;
      const tkpPassThreshold = tkpQuestions < 45 ? Math.ceil(tkpQuestions * 0.293 * 5) : 166;

      passedTwk = (finalData.twkScore || 0) >= twkPassThreshold;
      passedTiu = (finalData.tiuScore || 0) >= tiuPassThreshold;
      passedTkp = (finalData.tkpScore || 0) >= tkpPassThreshold;
      passedOverall = passedTwk && passedTiu && passedTkp;
    }

    // Call Idempotent RPC to complete session, insert result, and award coins/xp
    const { data: resultId, error: rpcError } = await supabase!.rpc('complete_quiz_session', {
      p_session_id: sessionId,
      p_score: finalData.score,
      p_twk_score: finalData.twkScore || 0,
      p_tiu_score: finalData.tiuScore || 0,
      p_tkp_score: finalData.tkpScore || 0,
      p_accuracy: finalData.accuracy || 0,
      p_coins_earned: finalData.coinsEarned,
      p_xp_earned: finalData.xpEarned,
      p_passed_twk: passedTwk,
      p_passed_tiu: passedTiu,
      p_passed_tkp: passedTkp,
      p_passed_overall: passedOverall
    });

    if (rpcError) throw rpcError;

    // Simpan package_id jika ada
    if (resultId && session.packageId) {
      try {
        await supabase!.from('quiz_results').update({ package_id: session.packageId }).eq('id', resultId);
      } catch (e) {
        console.error("Gagal menyimpan package_id", e);
      }
    }

    // AI Analytics Update: Update akurasi in profiles
    try {
      const { data: profile } = await supabase!.from('profiles').select('id, akurasi').eq('id', (await supabase!.auth.getUser()).data.user?.id).single();
      if (profile) {
        let currentAkurasi: any = profile.akurasi || {
          TWK: { correct: 0, total: 0 },
          TIU: { correct: 0, total: 0 },
          TKP: { correct: 0, total: 0 }
        };

        let twkCor = 0, tiuCor = 0, tkpCor = 0;
        let twkTot = 0, tiuTot = 0, tkpTot = 0;
        
        session.questions.forEach((q: any, idx: number) => {
          const ansId = finalData.finalAnswers ? finalData.finalAnswers[idx] : session.answers[idx];
          
          if (q.category === 'TWK') { 
            twkTot++; 
            if (ansId && ansId === q.correct) twkCor++; 
          }
          if (q.category === 'TIU') { 
            tiuTot++; 
            if (ansId && ansId === q.correct) tiuCor++; 
          }
          if (q.category === 'TKP') { 
            tkpTot++; 
            if (ansId) {
              const opt = q.options.find((o: any) => o.id === ansId);
              // Asumsi nilai TKP >= 5 (atau 50) dianggap benar maksimal
              if (opt && (opt.score >= 5 || opt.score >= 50)) tkpCor++; 
            }
          }
        });

        currentAkurasi.TWK = { correct: (currentAkurasi.TWK?.correct || 0) + twkCor, total: (currentAkurasi.TWK?.total || 0) + twkTot };
        currentAkurasi.TIU = { correct: (currentAkurasi.TIU?.correct || 0) + tiuCor, total: (currentAkurasi.TIU?.total || 0) + tiuTot };
        currentAkurasi.TKP = { correct: (currentAkurasi.TKP?.correct || 0) + tkpCor, total: (currentAkurasi.TKP?.total || 0) + tkpTot };

        await supabase!.from('profiles').update({ akurasi: currentAkurasi }).eq('id', profile.id);
      }
    } catch (e) {
       // ignore error
    }

    setActiveSession(null);
    console.log('✅ Quiz session completed:', sessionId);
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
    console.log('✅ Recovered quiz session:', data.id);
    return session;
  }, []);

  const abandonSession = useCallback(async (sessionId: string) => {
    const { error } = await supabase!
      .from('quiz_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId);

    if (error) throw error;

    setActiveSession(null);
    console.log('✅ Quiz session abandoned:', sessionId);
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
      clearSession
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
