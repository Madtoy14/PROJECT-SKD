# 🔒 SYSTEM AUDIT REPORT — SKDQuest
**Auditor:** Senior System Architect & Security Auditor  
**Scope:** src/ folder + Supabase RLS + TypeScript build health  
**Date:** 17 Juli 2026  
**Status:** 🔴 **CRITICAL ISSUES FOUND**

---

## 📊 EXECUTIVE SUMMARY

### System Health Status

| Area | Status | Critical Issues | High Priority | Medium Priority |
|------|--------|-----------------|---------------|-----------------|
| **TypeScript Type Safety** | 🟡 NEEDS FIX | 1 | 15+ | 8 |
| **Security (RLS/Transactions)** | 🟢 GOOD | 0 | 2 | 3 |
| **UI Efficiency (Ponytail)** | 🟢 ACCEPTABLE | 0 | 1 | 2 |
| **Quiz Logic & Bank Soal** | 🟢 SOLID | 0 | 0 | 1 |

### Verdict

**Overall:** 🟡 **System functional but has technical debt that will cause build failures.**

**Top Priority:**
1. ❌ **Build currently BROKEN** — `Quiz.tsx:473` implicit `any` type
2. ⚠️ 15+ explicit `any` types in Quiz.tsx create runtime risk
3. ⚠️ Edge function validate-energy has race condition (lines 81-92)

**Good News:**
- ✅ Shop.tsx transaction logic is server-side atomic (RPC-based)
- ✅ Local question bank properly typed with validation
- ✅ Bundle size healthy at 2.6MB (not bloated)
- ✅ Edge functions have auth checks

---

## 🚨 TECHNICAL DEBT

### CRITICAL — Build Blockers

#### TC-01: Build Failure in Quiz.tsx
**Severity:** 🔴 **CRITICAL**  
**Location:** `src/pages/Quiz.tsx:473`  
**Error:** `Parameter 'opt' implicitly has an 'any' type.`

**Root Cause:**
```typescript
const cleanedOptions = useMemo(
  () => currentQuestion?.options?.map(opt => ({  // ← opt has implicit any
    ...opt,
    cleanedText: cleanMathText(opt.text || '')
  })) ?? [],
  [currentQuestion?.options]
);
```

**Fix:**
```typescript
const cleanedOptions = useMemo(
  () => currentQuestion?.options?.map((opt: QuestionOption) => ({
    ...opt,
    cleanedText: cleanMathText(opt.text || '')
  })) ?? [],
  [currentQuestion?.options]
);
```

**Effort:** 30 seconds  
**Action:** Add explicit type annotation `(opt: QuestionOption)` at line 473.

---

### HIGH — Type Safety Violations

#### TC-02: Explicit `any` Types in Quiz.tsx (15+ occurrences)
**Severity:** 🟠 **HIGH**  
**Locations:**
- `src/pages/Quiz.tsx:162` — `const [questions, setQuestions] = useState<any[]>([]);`
- `src/pages/Quiz.tsx:164` — `const [profile, setProfile] = useState<any>(null);`
- `src/pages/Quiz.tsx:237` — `const channelRef = useRef<any>(null);`
- `src/pages/Quiz.tsx:398` — `.find((o: any) => o.score === 5)?.id`
- `src/pages/Quiz.tsx:399` — `.filter((o: any) => o.id !== correctId).map((o: any) => o.id)`
- `src/pages/Quiz.tsx:449` — `const initQuestions = async (data: any[])`
- `src/pages/Quiz.tsx:498` — `catch (err: any)`
- `src/pages/Quiz.tsx:510` — `let catatanData: any[] = [];`
- `src/pages/Quiz.tsx:787` — `.find((o: any) => o.id === optionId)`
- `src/pages/Quiz.tsx:816` — `const updates: any = {};`
- `src/pages/Quiz.tsx:1072` — `.find((o: any) => o.id === ansId)`
- `src/pages/Quiz.tsx:1089` — `const updates: any = {};`
- `src/pages/Quiz.tsx:1446` — `.map((opt: any) => {`

**Root Cause:** Quiz.tsx doesn't import proper types from `src/data/questions/index.ts`.

**Fix:**
```typescript
// Add at top of Quiz.tsx
import { Question, QuestionOption } from '../data/questions/index';
import type { UserProfile } from '../lib/supabase';

// Then replace:
const [questions, setQuestions] = useState<Question[]>([]);
const [profile, setProfile] = useState<UserProfile | null>(null);
const channelRef = useRef<RealtimeChannel | null>(null);
const initQuestions = async (data: Question[]) => { ... }
let catatanData: Array<{ id: string; type: string }> = [];
```

**Effort:** 15 minutes  
**Impact:** Prevents runtime null reference errors and enables IDE autocomplete.

---

#### TC-03: Loose Catch Blocks
**Severity:** 🟠 **HIGH**  
**Locations:**
- `src/pages/Shop.tsx:140` — `catch (err: any)`
- `src/pages/Quiz.tsx:498` — `catch (err: any)`

**Root Cause:** TypeScript 6.0 prefers `unknown` for caught errors.

**Fix:**
```typescript
catch (error) {
  if (error instanceof Error) {
    console.error('Purchase error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

**Effort:** 5 minutes  
**Action:** Replace `catch (err: any)` with `catch (error)` and type-guard.

---

#### TC-04: Metadata Type Too Loose
**Severity:** 🟡 **MEDIUM**  
**Location:** `src/lib/transactions.ts:16` and `:76`

**Current:**
```typescript
metadata?: Record<string, any>;
```

**Risk:** Allows arbitrary data in transaction logs, hard to query later.

**Fix:**
```typescript
interface TransactionMetadata {
  item_title?: string;
  item_type?: 'item' | 'energy' | 'paket';
  quantity?: number;
  [key: string]: string | number | boolean | undefined; // extensible but typed
}

interface TransactionParams {
  // ...
  metadata?: TransactionMetadata;
}
```

**Effort:** 10 minutes  
**Priority:** MEDIUM (doesn't break build, but makes logs unqueryable).

---

### MEDIUM — Strict Mode Disabled

#### TC-05: TypeScript Strict Mode Not Enabled
**Severity:** 🟡 **MEDIUM**  
**Location:** `tsconfig.app.json:19-20`

**Current:**
```json
{
  "noUnusedLocals": false,
  "noUnusedParameters": false
}
```

**Missing:**
```json
"strict": true,
"noImplicitAny": true,
"strictNullChecks": true
```

**Root Cause:** Strict mode disabled to bypass type errors quickly during development.

**Risk:** Silent bugs from null/undefined access.

**Fix:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Effort:** 30 minutes (will expose 20+ errors that must be fixed).  
**Action:** Enable after fixing TC-01 and TC-02.

---

## 🔒 SECURITY RISKS

### HIGH — Race Condition in Energy Validation

#### SEC-01: TOCTOU in validate-energy Edge Function
**Severity:** 🟠 **HIGH**  
**Location:** `supabase/functions/validate-energy/index.ts:73-92`

**Vulnerability:**
```typescript
// Line 73-78: Read energy
const lastUpdate = new Date(profile.last_energy_update);
const now = new Date();
const minutesPassed = (now.getTime() - lastUpdate.getTime()) / 1000 / 60;
const energyGained = Math.floor(minutesPassed / 2.5);
const currentEnergy = Math.min(profile.energy + energyGained, 25);

// Line 81-88: Write energy (NO TRANSACTION)
if (energyGained > 0) {
  await supabaseClient
    .from('profiles')
    .update({ energy: currentEnergy, last_energy_update: now.toISOString() })
    .eq('id', userId);
}

// Line 92: Check (STALE DATA)
const hasEnough = currentEnergy >= energyRequired;
```

**Attack Vector:**
1. User opens 2 browser tabs
2. Tab 1 calls validate-energy → reads `energy: 5`
3. Tab 2 calls validate-energy → reads `energy: 5` (same)
4. Both tabs pass check, energy deducted twice but only read once
5. User plays 2 quizzes with only 5 energy

**Exploit Probability:** HIGH (easy to trigger with F5 spam).

**Fix:** Use atomic RPC function instead of edge function:
```sql
CREATE OR REPLACE FUNCTION consume_energy(
  p_user_id UUID,
  p_amount INT
) RETURNS JSONB AS $$
DECLARE
  v_current_energy INT;
  v_last_update TIMESTAMPTZ;
  v_minutes_passed NUMERIC;
  v_energy_gained INT;
  v_new_energy INT;
BEGIN
  -- Lock row for update (prevents race condition)
  SELECT energy, last_energy_update INTO v_current_energy, v_last_update
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Calculate regenerated energy
  v_minutes_passed := EXTRACT(EPOCH FROM (NOW() - v_last_update)) / 60.0;
  v_energy_gained := FLOOR(v_minutes_passed / 2.5);
  v_new_energy := LEAST(v_current_energy + v_energy_gained, 25);

  -- Check if enough
  IF v_new_energy < p_amount THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Energi tidak cukup', 'current', v_new_energy);
  END IF;

  -- Deduct atomically
  UPDATE profiles
  SET energy = v_new_energy - p_amount,
      last_energy_update = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'remaining', v_new_energy - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Effort:** 2 hours (write RPC + test + migrate callers).  
**Priority:** HIGH — exploitable in production.

---

### MEDIUM — Missing RLS Policies (Incomplete Audit)

#### SEC-02: No RLS Policy Files Found
**Severity:** 🟡 **MEDIUM**  
**Location:** `supabase/` folder

**Finding:** No `.sql` migration files found in repo.

**Risk:** Cannot verify if RLS is enabled on:
- `profiles` table
- `transactions` table
- `quiz_sessions` table
- `wrong_books` table

**Required Policies:**
```sql
-- profiles: users can only read/update their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- transactions: users can only read own, inserts allowed (logged by server)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (true); -- only service_role key can call this

-- quiz_sessions: users own their sessions
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON quiz_sessions FOR ALL
  USING (auth.uid() = user_id);
```

**Verification Needed:**
1. Login to Supabase Dashboard
2. Check Table Editor → each table → "Row Level Security" badge
3. If missing, apply policies above

**Effort:** 1 hour (write + test + deploy).  
**Action:** Create `supabase/migrations/20260717_rls_policies.sql` and apply.

---

### MEDIUM — Shop Transaction Logging is Async (Non-Atomic)

#### SEC-03: Transaction Log Can Fail Silently
**Severity:** 🟡 **MEDIUM**  
**Location:** `src/pages/Shop.tsx:128-137`

**Current Flow:**
```typescript
// Line 108-120: RPC purchase (atomic, server-side) ✅
const { data: rpcResult } = await supabase.rpc('purchase_item', { ... });

// Line 125-126: Fetch fresh profile ✅
const freshProfile = await fetchProfile();

// Line 128-137: Log transaction (ASYNC, can fail silently) ⚠️
await logCoinPurchase(itemId, finalCost, coinsAfter, { ... });
```

**Risk:** If `logCoinPurchase` fails:
- Purchase completes (coins deducted, item added)
- But no audit trail in `transactions` table
- Anti-cheat detection loses data

**Impact:** LOW — purchase still works, only audit trail affected.

**Fix:** Make RPC `purchase_item` insert transaction log internally:
```sql
CREATE OR REPLACE FUNCTION purchase_item(
  p_item_id TEXT,
  p_cost INT,
  p_item_type TEXT,
  p_quantity INT DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_coins_after INT;
BEGIN
  -- (existing purchase logic)
  ...

  -- Insert transaction log INSIDE same transaction
  INSERT INTO transactions (user_id, type, category, item_id, amount, balance_after, source, metadata)
  VALUES (
    v_user_id,
    'purchase',
    'coin',
    p_item_id,
    -p_cost,
    v_coins_after,
    'shop_purchase',
    jsonb_build_object('item_type', p_item_type, 'quantity', p_quantity)
  );

  RETURN jsonb_build_object('success', true, 'coins_after', v_coins_after);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Effort:** 1 hour (modify RPC + test).  
**Priority:** MEDIUM — audit trail important but not critical path.

---

### LOW — Edge Function Error Handling Exposes Stack Traces

#### SEC-04: Generic Error Messages Leak Implementation
**Severity:** 🟢 **LOW**  
**Location:**
- `supabase/functions/validate-quiz-score/index.ts:130-136`
- `supabase/functions/validate-energy/index.ts:108-116`

**Current:**
```typescript
catch (error) {
  return new Response(
    JSON.stringify({ error: error.message }), // ← Can leak SQL errors, file paths
    { status: 500, headers: corsHeaders }
  );
}
```

**Risk:** If Supabase throws "table X does not exist" → reveals schema info.

**Fix:**
```typescript
catch (error) {
  console.error('[validate-energy] Error:', error); // Log to Supabase logs
  return new Response(
    JSON.stringify({ error: 'Internal server error' }), // Generic message
    { status: 500, headers: corsHeaders }
  );
}
```

**Effort:** 5 minutes per function.  
**Priority:** LOW — info leak minimal.

---

## 🎨 UI EFFICIENCY (PONYTAIL COMPLIANCE)

### Status: 🟢 ACCEPTABLE (per PONYTAIL_AUDIT_REPORT.md v2)

**Key Metrics:**
- Bundle size: **2.6MB** (healthy, not bloated)
- React.memo usage: ✅ Added in recent commit (`73d6ba3`)
- Dead dependencies: ⚠️ `@types/howler` removed in `cd04363`

### HIGH — Chart.js Still Heavy

#### UI-01: chart.js + react-chartjs-2 = 630KB
**Severity:** 🟠 **HIGH** (if charts rarely used)  
**Location:** `package.json` dependencies

**Usage:** Only 2 files use charts (likely Profile.tsx stats).

**Options:**
1. **Keep it** — If charts used on every profile view
2. **Lazy load** — `const Chart = lazy(() => import('react-chartjs-2'))`
3. **Replace with CSS** — Use gradient `<div>` bars (Ponytail philosophy)

**Ponytail Recommendation:** Lazy load.
```typescript
// src/pages/Profile.tsx
const StatsChart = lazy(() => import('../components/StatsChart'));

// Wrap in Suspense
<Suspense fallback={<div>Loading chart...</div>}>
  <StatsChart data={stats} />
</Suspense>
```

**Effort:** 30 minutes.  
**Impact:** Saves 630KB for users who don't open Profile.

---

### MEDIUM — Quiz.tsx Still 1527 Lines

#### UI-02: Quiz Component God Object
**Severity:** 🟡 **MEDIUM**  
**Location:** `src/pages/Quiz.tsx` (1527 lines)

**Issue:** Single file handles:
- Question rendering
- Power-up logic
- Timer management
- PvP realtime sync
- Autosave
- Results submission

**Ponytail Take:** "If it works and renders fast, don't split prematurely."

**When to Refactor:**
- ❌ NOT NOW — Recent React.memo additions need soak time
- ✅ LATER — If adding new game modes (time attack, co-op)

**Effort to split:** 4-6 hours.  
**Priority:** LOW (not blocking).

---

### LOW — framer-motion Kept (Justified)

#### UI-03: framer-motion 600KB Retained
**Severity:** 🟢 **LOW**  
**Location:** `package.json`

**Decision from PONYTAIL_AUDIT_REPORT.md:**
> ✅ Keep. Used in 6 files, deeply integrated. ROI low (~600KB / 6 hours work).

**Agreed.** No action needed.

---

## 📚 QUIZ LOGIC & BANK SOAL

### Status: 🟢 SOLID

#### QL-01: Local Question Bank Properly Typed
**Location:** `src/data/questions/index.ts`

**Findings:**
- ✅ Exports strict `Question` and `QuestionOption` interfaces
- ✅ Includes `validateQuestions()` integrity checker
- ✅ Fisher-Yates shuffle implemented correctly (unbiased)
- ✅ Category-based filtering works

**No issues found.**

---

#### QL-02: Quiz.tsx Logic Sound
**Location:** `src/pages/Quiz.tsx`

**Checked:**
- ✅ Power-up gating via `ALLOWED_POWER_UPS` record
- ✅ `cleanMathText()` wrapped in `useMemo` (line 472-478)
- ✅ Autosave debounced via `QuizSessionContext`
- ✅ Server-side score validation via edge function

**Minor Issue:** `cleanMathText()` has redundant `.split().join()` chains (lines 9-44).

**Optimization (optional):**
```typescript
const cleanMathText = (text: string): string => {
  if (!text) return "";
  let cleaned = text;
  
  // Use single regex instead of 8x .split().join()
  cleaned = cleaned.replace(/\\\\?[\[\]\(\)]/g, ' '); // removes \[, \], \(, \), \\[, etc.
  cleaned = cleaned.replace(/\\\\?frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
  cleaned = cleaned.replace(/\\\\?text\{([^}]+)\}/g, '$1');
  
  const symbolMap: Record<string, string> = {
    '\\\\times': 'x', '\\times': 'x',
    '\\\\div': ':', '\\div': ':',
    '\\\\cdot': '·', '\\cdot': '·',
    '\\\\pm': '±', '\\pm': '±',
    '\\\\approx': '≈', '\\approx': '≈',
    '\\\\neq': '≠', '\\neq': '≠'
  };
  
  Object.entries(symbolMap).forEach(([k, v]) => {
    cleaned = cleaned.replaceAll(k, v);
  });
  
  return cleaned.replace(/\\+/g, '').trim();
};
```

**Effort:** 10 minutes.  
**Impact:** Marginal (function already memoized).  
**Priority:** LOW — "ponytail: works fine, optimize only if profiler shows hotspot."

---

## ✅ ACTIONABLE TASKS

### Priority Matrix

```
CRITICAL → Do NOW (blocks build/deploy)
HIGH     → Do this sprint (security/stability)
MEDIUM   → Do next sprint (quality/maintainability)
LOW      → Do when bored (nice-to-have)
```

---

### 🔴 CRITICAL (DO NOW)

| ID | Task | File | Effort | Blocker? |
|----|------|------|--------|----------|
| **TC-01** | Fix `Quiz.tsx:473` implicit any type | `src/pages/Quiz.tsx:473` | 30 sec | ✅ YES |

**Command:**
```bash
# Line 473: Add type annotation
# Before: () => currentQuestion?.options?.map(opt => ({
# After:  () => currentQuestion?.options?.map((opt: QuestionOption) => ({
```

---

### 🟠 HIGH (THIS SPRINT)

| ID | Task | File | Effort | Impact |
|----|------|------|--------|--------|
| **TC-02** | Replace 15+ `any` types in Quiz.tsx | `src/pages/Quiz.tsx` | 15 min | Type safety |
| **TC-03** | Fix catch blocks (use `unknown`) | `src/pages/Shop.tsx:140`<br>`src/pages/Quiz.tsx:498` | 5 min | TS6 compat |
| **SEC-01** | Fix race condition in energy validation | `supabase/functions/validate-energy/index.ts` | 2 hours | Exploitable |
| **SEC-02** | Verify RLS policies exist | Supabase Dashboard | 1 hour | Data leak risk |
| **UI-01** | Lazy load chart.js (if rarely used) | `src/pages/Profile.tsx` | 30 min | -630KB bundle |

**Total Effort:** ~4 hours

---

### 🟡 MEDIUM (NEXT SPRINT)

| ID | Task | File | Effort | Impact |
|----|------|------|--------|--------|
| **TC-04** | Tighten transaction metadata type | `src/lib/transactions.ts:16,76` | 10 min | Query-ability |
| **TC-05** | Enable TypeScript strict mode | `tsconfig.app.json` | 30 min | Catches bugs |
| **SEC-03** | Move transaction logging into RPC | `supabase/` (SQL function) | 1 hour | Audit integrity |

**Total Effort:** ~2 hours

---

### 🟢 LOW (WHEN BORED)

| ID | Task | File | Effort | Impact |
|----|------|------|--------|--------|
| **SEC-04** | Sanitize edge function error messages | `supabase/functions/*/index.ts` | 15 min | Info leak |
| **UI-02** | Split Quiz.tsx (if adding new modes) | `src/pages/Quiz.tsx` | 6 hours | Maintainability |
| **QL-02** | Optimize `cleanMathText()` with regex | `src/pages/Quiz.tsx:4-44` | 10 min | Marginal perf |

**Total Effort:** ~6.5 hours

---

## 📞 EXECUTION SEQUENCE (FOR AUTONOMOUS AGENT)

### Phase 1: Unblock Build (5 minutes)
```bash
# Task TC-01
sed -i '473s/map(opt =>/map((opt: QuestionOption) =>/' src/pages/Quiz.tsx
npm run build  # Verify success
```

### Phase 2: Type Safety (20 minutes)
```bash
# Task TC-02: Add imports and fix types
# Edit src/pages/Quiz.tsx:
# - Line 1: Add `import { Question, QuestionOption } from '../data/questions/index';`
# - Line 162: `useState<Question[]>([])`
# - Line 164: `useState<UserProfile | null>(null)`
# ... (see TC-02 details)

# Task TC-03: Fix catch blocks
# Replace `catch (err: any)` → `catch (error)` + type guard
```

### Phase 3: Security (3 hours)
```bash
# Task SEC-01: Create consume_energy RPC
# 1. Write SQL function (see SEC-01 fix)
# 2. Deploy: supabase db push
# 3. Update callers to use RPC instead of edge function

# Task SEC-02: Verify RLS
# 1. Login to Supabase Dashboard
# 2. Check each table for RLS badge
# 3. Apply policies if missing (see SEC-02 fix)
```

### Phase 4: Optimization (1 hour)
```bash
# Task UI-01: Lazy load charts
# Wrap chart imports in React.lazy() + Suspense

# Task TC-04: Tighten metadata type
# Define TransactionMetadata interface
```

---

## 📈 ESTIMATED RESULTS AFTER FIXES

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| **Build Status** | ❌ BROKEN | ✅ PASSING | Fixed |
| **Type Safety** | 16 `any` types | 1 `any` type | -94% |
| **Exploitable Bugs** | 1 (energy race) | 0 | Fixed |
| **Bundle Size** | 2.6MB | 2.0MB (if UI-01 done) | -23% |
| **RLS Coverage** | Unknown | 100% verified | Audited |

---

## 🏁 CONCLUSION

**Current State:** System is production-ready **EXCEPT** for the build error at `Quiz.tsx:473`.

**Risk Level:**
- 🔴 **CRITICAL:** 1 issue (build blocker)
- 🟠 **HIGH:** 4 issues (security + type safety)
- 🟡 **MEDIUM:** 3 issues (quality)
- 🟢 **LOW:** 3 issues (nice-to-have)

**Next Action:** Fix TC-01 (30 seconds) → unblocks deployment.

**Recommended Sprint Plan:**
1. **Day 1:** Fix TC-01, TC-02, TC-03 → build passes + type-safe
2. **Day 2-3:** Fix SEC-01, SEC-02 → close security holes
3. **Day 4:** UI-01, TC-04 → optimize bundle + code quality

**Total Effort:** ~8 hours spread over 1 sprint.

---

**Report End**  
**Generated:** 17 Juli 2026  
**Auditor:** Senior System Architect (Lazy Mode Activated 🧔‍♂️)

> "Fix the build blocker first. Everything else can wait until CI is green."
