import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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
}

interface QuizSessionContextType {
  activeSession: QuizSession | null;
  isAutoSaving: boolean;
  createSession: (mode: string, questions: any[]) => Promise<string>;
  updateSession: (sessionId: string, updates: Partial<QuizSession>) => Promise<void>;
  completeSession: (sessionId: string, finalData: {
    score: number;
    twkScore?: number;
    tiuScore?: number;
    tkpScore?: number;
    accuracy?: number;
    coinsEarned: number;
    xpEarned: number;
  }) => Promise<string>;
  recoverSession: () => Promise<QuizSession | null>;
  abandonSession: (sessionId: string) => Promise<void>;
  clearSession: () => void;
}

const QuizSessionContext = createContext<QuizSessionContextType | undefined>(undefined);

export function QuizSessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Auto-save every 30 seconds if there's an active session
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(async () => {
      try {
        setIsAutoSaving(true);
        await updateSession(activeSession.id, {
          currentIndex: activeSession.currentIndex,
          answers: activeSession.answers,
          score: activeSession.score,
          twkScore: activeSession.twkScore,
          tiuScore: activeSession.tiuScore,
          tkpScore: activeSession.tkpScore,
          usedPowerups: activeSession.usedPowerups
        });
        console.log('✅ Auto-saved quiz session:', activeSession.id);
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [activeSession]);

  const createSession = useCallback(async (mode: string, questions: any[]): Promise<string> => {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Energy deduction is handled by Quiz.tsx (Deferred Deduction)

    // Create session
    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: user.id,
        mode,
        questions_json: questions,
        status: 'active',
        energy_consumed: 1
      })
      .select()
      .single();

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
      timeSpent: data.time_spent_seconds || 0
    };

    setActiveSession(session);
    console.log('✅ Quiz session created:', data.id);
    return data.id;
  }, []);

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

    const { error } = await supabase
      .from('quiz_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) throw error;

    // Update local state
    if (activeSession?.id === sessionId) {
      setActiveSession({ ...activeSession, ...updates });
    }
  }, [activeSession]);

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
    }
  ): Promise<string> => {
    const session = activeSession;
    if (!session) throw new Error('No active session');

    // Mark session as completed
    const { error: sessionError } = await supabase
      .from('quiz_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        score: finalData.score,
        twk_score: finalData.twkScore || 0,
        tiu_score: finalData.tiuScore || 0,
        tkp_score: finalData.tkpScore || 0
      })
      .eq('id', sessionId);

    if (sessionError) throw sessionError;

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

    // Create result record
    const { data: resultData, error: resultError } = await supabase
      .from('quiz_results')
      .insert({
        session_id: sessionId,
        mode: session.mode,
        score: finalData.score,
        twk_score: finalData.twkScore || 0,
        tiu_score: finalData.tiuScore || 0,
        tkp_score: finalData.tkpScore || 0,
        accuracy: finalData.accuracy || 0,
        time_spent_seconds: session.timeSpent,
        coins_earned: finalData.coinsEarned,
        xp_earned: finalData.xpEarned,
        questions_json: session.questions,
        answers_json: session.answers,
        powerups_used: session.usedPowerups,
        passed_twk: passedTwk,
        passed_tiu: passedTiu,
        passed_tkp: passedTkp,
        passed_overall: passedOverall
      })
      .select()
      .single();

    if (resultError) throw resultError;

    // PENTING: Update profile dengan koin dan XP ditangani oleh Result.tsx untuk menjaga konsistensi dengan fitur lainnya (seperti Akurasi, Catatan Salah).
    // QuizSessionContext HANYA mengurus status sesi dan pencatatan quiz_results.

    setActiveSession(null);
    console.log('✅ Quiz session completed:', sessionId);
    return resultData.id;
  }, [activeSession]);

  const recoverSession = useCallback(async (): Promise<QuizSession | null> => {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
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
      timeSpent: data.time_spent_seconds || 0
    };

    setActiveSession(session);
    console.log('✅ Recovered quiz session:', data.id);
    return session;
  }, []);

  const abandonSession = useCallback(async (sessionId: string) => {
    const { error } = await supabase
      .from('quiz_sessions')
      .update({ status: 'abandoned' })
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
