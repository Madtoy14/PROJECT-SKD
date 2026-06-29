# Result.tsx Database Integration Guide

## Changes Required

Update `src/pages/Result.tsx` to load data from database instead of location.state.

## Implementation

### 1. Add imports

```typescript
import { ResultSkeleton } from '../components/LoadingSkeleton';
import { supabase } from '../lib/supabase';
```

### 2. Replace state management (beginning of component)

```typescript
export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // NEW: Result data from database
  const [resultData, setResultData] = useState<any>(null);
  
  // Get resultId from location state
  const resultId = location.state?.resultId;
  const fallbackMode = location.state?.mode || 'latihan';
  
  // Load result from database
  useEffect(() => {
    const loadResult = async () => {
      setLoading(true);
      try {
        // Load profile
        const userProfile = await fetchProfile();
        setProfile(userProfile);
        
        // If we have resultId, load from database
        if (resultId) {
          const { data, error: resultError } = await supabase
            .from('quiz_results')
            .select('*')
            .eq('id', resultId)
            .single();
          
          if (resultError) throw resultError;
          setResultData(data);
        } else {
          // Fallback to location.state (old method)
          setResultData({
            mode: location.state?.mode || 'latihan',
            score: location.state?.score || 0,
            twk_score: location.state?.twkScore || 0,
            tiu_score: location.state?.tiuScore || 0,
            tkp_score: location.state?.tkpScore || 0,
            accuracy: location.state?.accuracy || 0,
            coins_earned: location.state?.coinsEarned || 50,
            xp_earned: location.state?.xpEarned || 150,
            questions_json: location.state?.quizQuestions || [],
            answers_json: location.state?.userAnswers || {},
            passed_twk: location.state?.passed_twk,
            passed_tiu: location.state?.passed_tiu,
            passed_tkp: location.state?.passed_tkp,
            passed_overall: location.state?.passed_overall
          });
        }
      } catch (err) {
        console.error('Failed to load result:', err);
        setError('Gagal memuat hasil kuis');
      } finally {
        setLoading(false);
      }
    };
    
    loadResult();
  }, [resultId]);
  
  // Show loading state
  if (loading) {
    return <ResultSkeleton />;
  }
  
  // Show error state
  if (error || !resultData) {
    return (
      <div className="min-h-screen bg-skd-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-skd-card border border-skd-border rounded-3xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-skd-danger/10 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="text-skd-danger" size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-skd-text mb-2">
              {error || 'Data Tidak Ditemukan'}
            </h2>
            <p className="text-sm text-skd-muted">
              Tidak dapat memuat hasil kuis. Data mungkin sudah tidak tersedia.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-skd-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }
  
  // Extract data from resultData
  const gameMode = resultData.mode;
  const isTryout = gameMode === 'tryout';
  const score = resultData.score;
  const twkScore = resultData.twk_score || 0;
  const tiuScore = resultData.tiu_score || 0;
  const tkpScore = resultData.tkp_score || 0;
  const earnedCoins = resultData.coins_earned || 0;
  const gainedXP = resultData.xp_earned || 0;
  const userAnswers = resultData.answers_json || {};
  const quizQuestions = resultData.questions_json || [];
  
  // ... rest of existing Result.tsx logic
}
```

### 3. Update "Tinjau Pembahasan" button

```typescript
<button
  onClick={() => navigate('/pembahasan-tryout', {
    state: {
      userAnswers: resultData.answers_json,
      quizQuestions: resultData.questions_json,
      resultId: resultData.id
    }
  })}
  className="w-full py-4 rounded-2xl border-2 border-skd-border text-skd-text font-bold hover:bg-skd-muted/5 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99] transition-all"
>
  Tinjau Pembahasan Lembar Jawaban <ArrowRight size={20} />
</button>
```

### 4. Add "Lihat Riwayat" feature (optional enhancement)

Add a new page to view all quiz history:

```typescript
// src/pages/QuizHistory.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ListSkeleton } from '../components/LoadingSkeleton';
import { Trophy, Calendar, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuizHistory() {
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Failed to load history:', error);
      } else {
        setResults(data || []);
      }
      setLoading(false);
    };
    
    loadHistory();
  }, []);
  
  if (loading) return <ListSkeleton count={10} />;
  
  return (
    <div className="min-h-screen bg-skd-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-skd-text">Riwayat Kuis</h1>
          <p className="text-sm text-skd-muted mt-2">
            Lihat kembali hasil kuis yang pernah Anda kerjakan
          </p>
        </div>
        
        {results.length === 0 ? (
          <div className="bg-skd-card border border-skd-border rounded-3xl p-12 text-center">
            <Trophy className="mx-auto text-skd-muted opacity-40 mb-4" size={48} />
            <p className="text-skd-muted">Belum ada riwayat kuis</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result, idx) => (
              <motion.button
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate('/result', { state: { resultId: result.id } })}
                className="w-full bg-skd-card border border-skd-border rounded-2xl p-6 hover:border-skd-primary/30 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-skd-primary px-3 py-1 bg-skd-primary/10 rounded-full">
                        {result.mode === 'tryout' ? 'Try Out' : result.mode === 'survival' ? 'Survival' : 'Latihan'}
                      </span>
                      <span className="text-xs text-skd-muted flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(result.completed_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-2xl font-bold text-skd-text font-space">
                          {result.score}
                        </p>
                        <p className="text-xs text-skd-muted">Skor</p>
                      </div>
                      {result.mode === 'tryout' && (
                        <>
                          <div>
                            <p className="text-sm font-bold text-skd-text">{result.twk_score}</p>
                            <p className="text-xs text-skd-muted">TWK</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-skd-text">{result.tiu_score}</p>
                            <p className="text-xs text-skd-muted">TIU</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-skd-text">{result.tkp_score}</p>
                            <p className="text-xs text-skd-muted">TKP</p>
                          </div>
                        </>
                      )}
                      <div>
                        <p className="text-sm font-bold text-yellow-500">+{result.coins_earned}</p>
                        <p className="text-xs text-skd-muted">Koin</p>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="text-skd-muted group-hover:text-skd-primary transition-colors" size={20} />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5. Add route in App.tsx

```typescript
import QuizHistory from './pages/QuizHistory';

// In routes:
<Route path="/quiz-history" element={<QuizHistory />} />
```

### 6. Add link in Profile.tsx

```typescript
<button
  onClick={() => navigate('/quiz-history')}
  className="w-full py-3 bg-skd-card border border-skd-border text-skd-text rounded-xl font-bold hover:bg-skd-muted/5 transition-colors flex items-center justify-center gap-2"
>
  <History size={18} />
  Riwayat Kuis
</button>
```

## Testing Checklist

- [ ] Complete a quiz and verify Result page loads from database
- [ ] Refresh Result page - data should persist
- [ ] Navigate away and back - data should still be there
- [ ] Test with missing resultId - should show error state
- [ ] Test Quiz History page shows all past results
- [ ] Click on history item - should load Result page correctly
- [ ] Test with different quiz modes (latihan, tryout, survival)

## Database Verification

```sql
-- Check if results are being saved
SELECT 
  id,
  mode,
  score,
  coins_earned,
  xp_earned,
  completed_at
FROM quiz_results
ORDER BY completed_at DESC
LIMIT 10;

-- Check if rewards were applied to profile
SELECT 
  username,
  coins,
  score as xp,
  level,
  total_quizzes_completed
FROM profiles
WHERE id = '<user_id>';
```

## Migration Path

If you want to keep backward compatibility:

```typescript
// In Result.tsx
if (resultId) {
  // New method: Load from database
  const { data } = await supabase.from('quiz_results').select('*').eq('id', resultId).single();
  setResultData(data);
} else if (location.state?.score !== undefined) {
  // Old method: Use location.state (fallback)
  setResultData({
    mode: location.state.mode,
    score: location.state.score,
    // ... map all location.state fields
  });
} else {
  // No data available
  setError('Data tidak ditemukan');
}
```
