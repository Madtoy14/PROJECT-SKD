-- ============================================
-- SKDQUEST EXTENDED DATABASE SCHEMA
-- Run this after supabase_schema.sql
-- ============================================

-- =============================================
-- 1. UPDATE PROFILES TABLE - Add Missing Fields
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_kedinasan TEXT DEFAULT 'IPDN';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT 'Pejuang SKD';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male' CHECK (gender IN ('male', 'female', 'female_hijab'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_energy_update TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weekly_streak_claimed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '{"item_5050": 0, "item_hint": 0, "item_shield": 0, "item_waktu_beku": 0, "item_skor_ganda": 0, "item_terawangan": 0, "item_kesempatan_kedua": 0, "item_energy_refill": 0, "item_streak_protector": 0, "item_coin_booster": 0, "item_tinta_hitam": 0, "item_lompatan_kilat": 0}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unlocked_avatars TEXT[] DEFAULT '{"hitamputih"}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selected_avatar TEXT DEFAULT 'hitamputih';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quests_progress JSONB DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_quizzes_completed INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_correct_answers INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_pvp_wins INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS highest_survival_score INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_score ON public.profiles(score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON public.profiles(last_login DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- =============================================
-- 2. QUIZ_SESSIONS - Mid-Quiz Auto-Save
-- =============================================
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('latihan', 'survival', 'tryout', 'pvp', 'pvp1v1')),
    category TEXT,
    difficulty TEXT,
    questions_json JSONB NOT NULL,
    current_index INTEGER DEFAULT 0,
    answers_json JSONB DEFAULT '{}'::jsonb,
    used_powerups JSONB DEFAULT '[]'::jsonb,
    score INTEGER DEFAULT 0,
    twk_score INTEGER DEFAULT 0,
    tiu_score INTEGER DEFAULT 0,
    tkp_score INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
    time_spent_seconds INTEGER DEFAULT 0,
    energy_consumed INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON public.quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON public.quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_active ON public.quiz_sessions(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_created_at ON public.quiz_sessions(created_at DESC);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can view their own quiz sessions" ON public.quiz_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can create their own quiz sessions" ON public.quiz_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can update their own quiz sessions" ON public.quiz_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can delete their own quiz sessions" ON public.quiz_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 3. QUIZ_RESULTS - Persistent Result History
-- =============================================
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE SET NULL,
    mode TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    twk_score INTEGER DEFAULT 0,
    tiu_score INTEGER DEFAULT 0,
    tkp_score INTEGER DEFAULT 0,
    accuracy NUMERIC(5,2),
    time_spent_seconds INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    questions_json JSONB,
    answers_json JSONB,
    powerups_used JSONB DEFAULT '[]'::jsonb,
    passed_twk BOOLEAN,
    passed_tiu BOOLEAN,
    passed_tkp BOOLEAN,
    passed_overall BOOLEAN,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_mode ON public.quiz_results(mode);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at ON public.quiz_results(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_score ON public.quiz_results(score DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_mode ON public.quiz_results(user_id, mode);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quiz results" ON public.quiz_results;
CREATE POLICY "Users can view their own quiz results" ON public.quiz_results
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own quiz results" ON public.quiz_results;
CREATE POLICY "Users can create their own quiz results" ON public.quiz_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 4. TRANSACTIONS - Audit Trail for Coins & Items
-- =============================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'sell', 'earn', 'spend', 'refund', 'reward', 'penalty')),
    category TEXT CHECK (category IN ('coin', 'item', 'energy', 'xp')),
    item_id TEXT,
    amount INTEGER NOT NULL,
    balance_after INTEGER,
    source TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create transactions" ON public.transactions;
CREATE POLICY "System can create transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 5. DUELS - Real PvP State Management
-- =============================================
CREATE TABLE IF NOT EXISTS public.duels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    opponent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'active', 'completed', 'expired', 'abandoned')),
    questions_json JSONB,
    challenger_answers JSONB DEFAULT '{}'::jsonb,
    opponent_answers JSONB DEFAULT '{}'::jsonb,
    challenger_score INTEGER DEFAULT 0,
    opponent_score INTEGER DEFAULT 0,
    winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    challenger_finished_at TIMESTAMPTZ,
    opponent_finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes'),
    CONSTRAINT different_players CHECK (challenger_id != opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_duels_challenger_id ON public.duels(challenger_id);
CREATE INDEX IF NOT EXISTS idx_duels_opponent_id ON public.duels(opponent_id);
CREATE INDEX IF NOT EXISTS idx_duels_status ON public.duels(status);
CREATE INDEX IF NOT EXISTS idx_duels_pending_opponent ON public.duels(opponent_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_duels_created_at ON public.duels(created_at DESC);

ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own duels" ON public.duels;
CREATE POLICY "Users can view their own duels" ON public.duels
    FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS "Users can create duels" ON public.duels;
CREATE POLICY "Users can create duels" ON public.duels
    FOR INSERT WITH CHECK (auth.uid() = challenger_id);

DROP POLICY IF EXISTS "Users can update their own duels" ON public.duels;
CREATE POLICY "Users can update their own duels" ON public.duels
    FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- =============================================
-- 6. FRIENDS - Social System
-- =============================================
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(user_id, friend_id),
    CONSTRAINT no_self_friend CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);
CREATE INDEX IF NOT EXISTS idx_friends_user_accepted ON public.friends(user_id, status) WHERE status = 'accepted';

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own friends" ON public.friends;
CREATE POLICY "Users can view their own friends" ON public.friends
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can add friends" ON public.friends;
CREATE POLICY "Users can add friends" ON public.friends
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update friend requests" ON public.friends;
CREATE POLICY "Users can update friend requests" ON public.friends
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can delete friendships" ON public.friends;
CREATE POLICY "Users can delete friendships" ON public.friends
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =============================================
-- 7. NOTIFICATIONS - In-App Alerts
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('duel_request', 'friend_request', 'level_up', 'quest_complete', 'achievement', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- =============================================
-- 8. USER_ACTIVITY_LOG - Anti-Cheat Tracking
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.user_activity_log(created_at DESC);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage activity logs" ON public.user_activity_log;
CREATE POLICY "Service role can manage activity logs" ON public.user_activity_log
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- 9. HELPER FUNCTIONS
-- =============================================

-- Function: Auto-expire pending duels
CREATE OR REPLACE FUNCTION expire_pending_duels()
RETURNS void AS $$
BEGIN
    UPDATE public.duels
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate user energy (regeneration logic)
CREATE OR REPLACE FUNCTION calculate_user_energy(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_energy INTEGER;
    last_update TIMESTAMPTZ;
    minutes_passed NUMERIC;
    energy_gained INTEGER;
    new_energy INTEGER;
BEGIN
    SELECT energy, last_energy_update
    INTO current_energy, last_update
    FROM public.profiles
    WHERE id = p_user_id;

    -- 1 energy per 2.5 minutes
    minutes_passed := EXTRACT(EPOCH FROM (NOW() - last_update)) / 60;
    energy_gained := FLOOR(minutes_passed / 2.5)::INTEGER;
    
    new_energy := LEAST(current_energy + energy_gained, 25);
    
    IF energy_gained > 0 THEN
        UPDATE public.profiles
        SET energy = new_energy,
            last_energy_update = NOW()
        WHERE id = p_user_id;
    END IF;
    
    RETURN new_energy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get active quiz session
CREATE OR REPLACE FUNCTION get_active_quiz_session(p_user_id UUID)
RETURNS public.quiz_sessions AS $$
DECLARE
    session_record public.quiz_sessions;
BEGIN
    SELECT * INTO session_record
    FROM public.quiz_sessions
    WHERE user_id = p_user_id
      AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1;
    
    RETURN session_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 10. VIEWS FOR ANALYTICS
-- =============================================

-- Daily Leaderboard
CREATE OR REPLACE VIEW public.leaderboard_daily AS
SELECT 
    p.id,
    p.username,
    p.level,
    p.avatar_url,
    p.selected_avatar,
    SUM(qr.score) as daily_score,
    COUNT(*) as quizzes_today
FROM public.profiles p
JOIN public.quiz_results qr ON p.id = qr.user_id
WHERE qr.completed_at >= CURRENT_DATE
GROUP BY p.id
ORDER BY daily_score DESC
LIMIT 100;

-- Weekly Leaderboard
CREATE OR REPLACE VIEW public.leaderboard_weekly AS
SELECT 
    p.id,
    p.username,
    p.level,
    p.avatar_url,
    p.selected_avatar,
    SUM(qr.score) as weekly_score,
    COUNT(*) as quizzes_week
FROM public.profiles p
JOIN public.quiz_results qr ON p.id = qr.user_id
WHERE qr.completed_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.id
ORDER BY weekly_score DESC
LIMIT 100;

-- All-time Leaderboard
CREATE OR REPLACE VIEW public.leaderboard_alltime AS
SELECT 
    id,
    username,
    level,
    score as total_score,
    avatar_url,
    selected_avatar,
    total_quizzes_completed,
    total_pvp_wins
FROM public.profiles
ORDER BY score DESC, level DESC
LIMIT 100;

-- =============================================
-- 11. ENABLE REALTIME SUBSCRIPTIONS
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'duels') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duels;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'friends') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friends;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- =============================================
-- 12. SAMPLE DATA MIGRATION (Optional)
-- =============================================
-- Update existing profiles with new columns (if they exist)
UPDATE public.profiles
SET 
    inventory = COALESCE(inventory, '{"item_5050": 0, "item_hint": 0, "item_shield": 0, "item_waktu_beku": 0, "item_skor_ganda": 0, "item_terawangan": 0, "item_kesempatan_kedua": 0, "item_energy_refill": 0, "item_streak_protector": 0, "item_coin_booster": 0, "item_tinta_hitam": 0, "item_lompatan_kilat": 0}'::jsonb),
    unlocked_avatars = COALESCE(unlocked_avatars, '{"hitamputih"}'),
    quests_progress = COALESCE(quests_progress, '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb),
    last_energy_update = COALESCE(last_energy_update, NOW()),
    last_login = COALESCE(last_login, NOW())
WHERE inventory IS NULL OR unlocked_avatars IS NULL;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '✅ SKDQuest Extended Schema Applied Successfully!';
    RAISE NOTICE '📊 Created Tables: quiz_sessions, quiz_results, transactions, duels, friends, notifications, user_activity_log';
    RAISE NOTICE '🔧 Created Functions: expire_pending_duels, calculate_user_energy, get_active_quiz_session';
    RAISE NOTICE '📈 Created Views: leaderboard_daily, leaderboard_weekly, leaderboard_alltime';
    RAISE NOTICE '🔐 RLS Policies: Enabled on all tables';
    RAISE NOTICE '⚡ Realtime: Enabled for duels, notifications, friends, profiles';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next Steps:';
    RAISE NOTICE '1. Verify tables created: SELECT tablename FROM pg_tables WHERE schemaname = ''public'';';
    RAISE NOTICE '2. Test RLS policies with test user accounts';
    RAISE NOTICE '3. Update frontend to use new QuizSessionContext';
    RAISE NOTICE '4. Deploy Supabase Edge Functions for server-side validation';
END $$;

COMMIT;
