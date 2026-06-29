# Quiz.tsx Auto-Save Integration Guide

## Changes Required

Update `src/pages/Quiz.tsx` to integrate with the new QuizSessionContext.

### 1. Add Import at the top

```typescript
// Add this import after existing imports
import { useQuizSession } from '../context/QuizSessionContext';
import { QuizSkeleton } from '../components/LoadingSkeleton';
```

### 2. Add to component initialization (around line 79-106)

```typescript
export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const gameMode = location.state?.mode || 'latihan';
  
  // ADD THIS: Initialize QuizSession hook
  const { 
    activeSession, 
    isAutoSaving,
    createSession, 
    updateSession, 
    completeSession, 
    recoverSession,
    abandonSession 
  } = useQuizSession();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [recoveredSession, setRecoveredSession] = useState<any>(null);
  
  // ... rest of existing state
```

### 3. Add recovery check on mount (after line 107)

```typescript
// Check for existing session on mount
useEffect(() => {
  const checkRecovery = async () => {
    const session = await recoverSession();
    if (session) {
      setRecoveredSession(session);
      setShowRecoveryPrompt(true);
    }
  };
  checkRecovery();
}, []);

// Handle recovery decision
const handleContinueSession = () => {
  if (recoveredSession) {
    setQuestions(recoveredSession.questions);
    setCurrentQuestionIndex(recoveredSession.currentIndex);
    setAnswers(recoveredSession.answers);
    setTotalScore(recoveredSession.score);
    setSessionId(recoveredSession.id);
    setShowRecoveryPrompt(false);
  }
};

const handleStartNewSession = async () => {
  if (recoveredSession) {
    await abandonSession(recoveredSession.id);
  }
  setShowRecoveryPrompt(false);
  // Continue with normal quiz start
};
```

### 4. Update quiz start logic (find where questions are loaded)

```typescript
// After questions are loaded, create session
useEffect(() => {
  const initQuiz = async () => {
    setLoadingQuestions(true);
    try {
      // ... existing question loading logic
      const loadedQuestions = await fetchQuestionsFromSupabase(...);
      setQuestions(loadedQuestions);
      
      // CREATE SESSION
      if (!sessionId) {
        const newSessionId = await createSession(gameMode, loadedQuestions);
        setSessionId(newSessionId);
      }
    } catch (error) {
      console.error('Failed to initialize quiz:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };
  
  initQuiz();
}, [gameMode]);
```

### 5. Update answer handler (find handleAnswer function)

```typescript
const handleAnswer = async (optionId: string) => {
  const newAnswers = { ...answers, [currentQuestionIndex]: optionId };
  setAnswers(newAnswers);
  
  // Calculate score
  const currentQuestion = questions[currentQuestionIndex];
  let newScore = totalScore;
  if (currentQuestion.correct === optionId) {
    const points = activePowerUps.skorGanda ? 10 : 5;
    newScore += points;
    setTotalScore(newScore);
  }
  
  // UPDATE SESSION
  if (sessionId) {
    try {
      await updateSession(sessionId, {
        currentIndex: currentQuestionIndex,
        answers: newAnswers,
        score: newScore,
        twkScore: calculateCategoryScore('TWK', newAnswers),
        tiuScore: calculateCategoryScore('TIU', newAnswers),
        tkpScore: calculateCategoryScore('TKP', newAnswers)
      });
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }
  
  // ... rest of existing logic
};

// Helper function to calculate category scores
const calculateCategoryScore = (category: string, currentAnswers: Record<number, string>) => {
  let score = 0;
  questions.forEach((q, idx) => {
    if (q.category === category && currentAnswers[idx] === q.correct) {
      score += 5;
    }
  });
  return score;
};
```

### 6. Update quiz completion (find handleFinish or similar)

```typescript
const handleFinish = async () => {
  if (!sessionId) return;
  
  setIsGameOver(true);
  
  // Calculate final scores
  const twkScore = calculateCategoryScore('TWK', answers);
  const tiuScore = calculateCategoryScore('TIU', answers);
  const tkpScore = calculateCategoryScore('TKP', answers);
  const accuracy = (Object.keys(answers).length / questions.length) * 100;
  
  // Determine rewards
  const isTryout = gameMode === 'tryout';
  const coinsEarned = isTryout ? 300 : gameMode === 'survival' ? Math.floor(totalScore * 0.2) : 50;
  const xpEarned = isTryout ? 500 : gameMode === 'survival' ? totalScore : 150;
  
  try {
    // COMPLETE SESSION
    const resultId = await completeSession(sessionId, {
      score: totalScore,
      twkScore,
      tiuScore,
      tkpScore,
      accuracy,
      coinsEarned,
      xpEarned
    });
    
    // Navigate to result page with resultId
    navigate('/result', {
      state: {
        resultId,
        mode: gameMode,
        // Pass other necessary data
      }
    });
  } catch (error) {
    console.error('Failed to complete session:', error);
    // Fallback to old method
    navigate('/result', {
      state: {
        score: totalScore,
        mode: gameMode,
        twkScore,
        tiuScore,
        tkpScore,
        userAnswers: answers,
        quizQuestions: questions
      }
    });
  }
};
```

### 7. Add recovery prompt UI (add to render, before main quiz UI)

```typescript
return (
  <>
    {/* Recovery Prompt Modal */}
    <AnimatePresence>
      {showRecoveryPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-skd-card border border-skd-border rounded-3xl p-8 max-w-md w-full space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-skd-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-skd-primary" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-skd-text mb-2">
                Kuis Belum Selesai
              </h2>
              <p className="text-sm text-skd-muted">
                Anda memiliki kuis yang belum diselesaikan. Lanjutkan dari soal terakhir?
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleContinueSession}
                className="w-full py-3 bg-skd-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Lanjutkan Kuis
              </button>
              <button
                onClick={handleStartNewSession}
                className="w-full py-3 bg-skd-card border border-skd-border text-skd-text rounded-xl font-bold hover:bg-skd-muted/5 transition-colors"
              >
                Mulai Kuis Baru
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Auto-save indicator */}
    <AnimatePresence>
      {isAutoSaving && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-40 bg-skd-card border border-skd-border rounded-full px-4 py-2 flex items-center gap-2 shadow-lg"
        >
          <Loader2 className="animate-spin text-skd-primary" size={16} />
          <span className="text-xs font-bold text-skd-muted">Menyimpan...</span>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Existing Quiz UI */}
    {loadingQuestions ? <QuizSkeleton /> : (
      <div className="min-h-screen bg-skd-bg">
        {/* ... rest of existing Quiz UI ... */}
      </div>
    )}
  </>
);
```

### 8. Update App.tsx to wrap with QuizSessionProvider

```typescript
// src/App.tsx
import { QuizSessionProvider } from './context/QuizSessionContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AudioProvider>
        <ThemeProvider>
          <DuelProvider>
            <QuizSessionProvider>
              <Router>
                {/* ... existing routes ... */}
              </Router>
            </QuizSessionProvider>
          </DuelProvider>
        </ThemeProvider>
      </AudioProvider>
    </ErrorBoundary>
  );
}
```

## Testing Checklist

- [ ] Start a quiz, answer 3 questions, refresh page → Should show recovery prompt
- [ ] Click "Lanjutkan Kuis" → Should resume from question 4
- [ ] Click "Mulai Kuis Baru" → Should abandon old session and start fresh
- [ ] Complete quiz → Should save result to database
- [ ] Check auto-save indicator appears every 30 seconds
- [ ] Verify no console errors during quiz
- [ ] Test with different game modes (latihan, tryout, survival)

## Database Verification

After implementing, verify in Supabase:

```sql
-- Check active sessions
SELECT * FROM quiz_sessions WHERE status = 'active';

-- Check completed results
SELECT * FROM quiz_results ORDER BY completed_at DESC LIMIT 10;

-- Check transactions
SELECT * FROM transactions WHERE category = 'coin' ORDER BY created_at DESC LIMIT 10;
```
