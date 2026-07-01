import { ErrorBoundary } from './components/ErrorBoundary';

import { QuizSessionProvider } from './context/QuizSessionContext';

import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';

import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';

import { Home, Trophy, BookOpen, Store, User, BookOpenCheck } from 'lucide-react';

import { ThemeProvider } from './context/ThemeContext';

import Dashboard from './pages/Dashboard';

import Quiz from './pages/Quiz';

import Result from './pages/Result';

import Leaderboard from './pages/Leaderboard';

import Quest from './pages/Quest';

import Shop from './pages/Shop';

import Profile from './pages/Profile';

import Auth from './pages/Auth';

import Onboarding from './pages/Onboarding';

import PembahasanTryout from './pages/PembahasanTryout';

import { DuelProvider } from './context/DuelContext';

import IncomingDuelRequest from './components/IncomingDuelRequest';



function Navigation() {

  const location = useLocation();





  const hideNavPaths = ['/quiz', '/result', '/auth', '/onboarding'];

  if (hideNavPaths.includes(location.pathname)) return null;



  const navItems = [

    { path: '/', icon: Home, label: 'Home' },

    { path: '/liga', icon: Trophy, label: 'Liga' },

    { path: '/quest', icon: BookOpen, label: 'Quest' },

    { path: '/pembahasan-tryout', icon: BookOpenCheck, label: 'Pembahasan' },

    { path: '/toko', icon: Store, label: 'Toko' },

    { path: '/profil', icon: User, label: 'Profil' },

  ];



  return (

    <>

      {/* Mobile Bottom Navigation */}

      <nav className="md:hidden fixed bottom-0 w-full bg-skd-card/95 backdrop-blur-md border-t border-skd-border z-50 transition-colors pb-[env(safe-area-inset-bottom)]">

        <ul className="flex justify-around items-center h-16">

          {navItems.map(({ path, icon: Icon, label }) => {

            const isActive = location.pathname === path;

            return (

              <li key={path} className="flex-1 h-full">

                <Link to={path} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-skd-accent' : 'text-skd-muted hover:text-skd-text'}`}>

                  <Icon size={20} className={isActive ? 'drop-shadow-[0_0_8px_rgba(245,166,35,0.5)]' : ''} />

                  <span className="text-[10px] font-bold">{label}</span>

                </Link>

              </li>

            );

          })}

        </ul>

      </nav>



      {/* Desktop Sidebar Navigation */}

      <nav className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-[88px] hover:w-64 bg-skd-card border-r border-skd-border z-50 transition-all duration-300 group overflow-hidden shadow-sm">

        <div className="h-24 flex items-center justify-center group-hover:justify-start group-hover:px-6 shrink-0 relative w-full">

          <h1 className="text-[20px] font-bold tracking-tighter bg-gradient-to-r from-skd-accent to-yellow-500 bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute left-6 whitespace-nowrap">SKDQuest</h1>

          <h1 className="text-[22px] font-bold tracking-tighter bg-gradient-to-r from-skd-accent to-yellow-500 bg-clip-text text-transparent group-hover:opacity-0 transition-opacity duration-300">SQ</h1>

        </div>



        <ul className="flex-1 px-3 group-hover:px-4 space-y-2 mt-2 w-full">

          {navItems.map(({ path, icon: Icon, label }) => {

            const isActive = location.pathname === path;

            return (

              <li key={path}>

                <Link

                  to={path}

                  className={`flex flex-col group-hover:flex-row items-center group-hover:items-center px-0 group-hover:px-4 py-3 group-hover:py-3.5 rounded-xl transition-all w-full ${isActive

                    ? 'bg-skd-accent/10 text-skd-accent font-bold'

                    : 'text-skd-muted hover:bg-skd-bg hover:text-skd-text font-medium'

                    }`}

                >

                  <div className="flex flex-col items-center justify-center shrink-0 w-16 group-hover:w-6 gap-1.5 group-hover:gap-0">

                    <Icon size={22} className={`group-hover:!w-5 group-hover:!h-5 transition-all ${isActive ? 'drop-shadow-[0_0_8px_rgba(245,166,35,0.5)]' : ''}`} />

                    <span className="text-[10px] group-hover:hidden font-bold leading-none block">{label}</span>

                  </div>

                  <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden group-hover:block text-[14px] font-bold">{label}</span>

                </Link>

              </li>

            );

          })}

        </ul>

      </nav>

    </>

  );

}



// Auth state di-hoist ke AppLayout agar tidak re-query setiap navigasi
// ProtectedRoute hanya membaca state yang sudah ada
interface AuthState {
  loading: boolean;
  session: any;
  needsOnboarding: boolean;
}

function ProtectedRoute({
  children,
  authState
}: {
  children: React.ReactNode;
  authState: AuthState;
}) {
  const location = useLocation();
  const { loading, session, needsOnboarding } = authState;

  if (loading) {
    return (
      <div className="min-h-screen bg-skd-bg flex flex-col items-center justify-center gap-3 text-skd-accent font-bold">
        <div className="w-10 h-10 border-4 border-skd-accent/20 border-t-skd-accent rounded-full animate-spin" />
        <span className="text-sm">Memuat Arena...</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppLayout() {
  const location = useLocation();
  const hideNavPaths = ['/quiz', '/result', '/auth', '/onboarding'];
  const isFullScreen = hideNavPaths.includes(location.pathname);

  // Auth state di-kelola di sini — satu kali untuk semua route
  // ProtectedRoute hanya membaca state ini tanpa query ulang
  const [authState, setAuthState] = useState<AuthState>({
    loading: true,
    session: null,
    needsOnboarding: false
  });
  const checkingRef    = useRef(false);
  const checkedUserRef = useRef<string | null>(null);

  const checkOnboarding = async (userId: string) => {
    if (checkingRef.current && checkedUserRef.current === userId) return;
    checkingRef.current    = true;
    checkedUserRef.current = userId;

    const cacheKey = `onboarding_${userId}`;

    try {
      const { data: profile } = await supabase!
        .from('profiles')
        .select('nickname, target_kedinasan')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        // User baru Google — buat profil awal tanpa nickname/target
        const { data: { user } } = await supabase!.auth.getUser();
        if (user) {
          const rawName = user.user_metadata?.full_name ||
                          user.user_metadata?.name ||
                          user.email?.split('@')[0] || 'pejuang';
          const safeUsername = rawName
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 20) || 'pejuang';
          await supabase!.from('profiles').upsert({ id: user.id, username: safeUsername });
        }
        sessionStorage.setItem(cacheKey, 'true');
        setAuthState(s => ({ ...s, needsOnboarding: true, loading: false }));
      } else {
        const isComplete = !!(profile.nickname && profile.target_kedinasan);
        // Cache hasil — false = sudah onboarding, true = perlu onboarding
        sessionStorage.setItem(cacheKey, String(!isComplete));
        setAuthState(s => ({ ...s, needsOnboarding: !isComplete, loading: false }));
      }
    } catch {
      setAuthState(s => ({ ...s, needsOnboarding: true, loading: false }));
    } finally {
      checkingRef.current = false;
    }
  };

  useEffect(() => {
    if (!supabase) {
      setAuthState({ loading: false, session: null, needsOnboarding: false });
      return;
    }

    // Cek session awal sekali saat AppLayout mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        setAuthState({ loading: false, session: null, needsOnboarding: false });
        return;
      }

      // Cek cache di sessionStorage dulu — hindari query Supabase setiap refresh
      const cacheKey = `onboarding_${session.user.id}`;
      const cached   = sessionStorage.getItem(cacheKey);

      if (cached !== null) {
        // Sudah pernah dicek di sesi ini — langsung pakai hasil cache
        setAuthState({ loading: false, session, needsOnboarding: cached === 'true' });
      } else {
        // Belum ada cache — query Supabase
        setAuthState(s => ({ ...s, session }));
        checkOnboarding(session.user.id);
      }
    });

    // Dengarkan perubahan auth (Google OAuth callback, logout, dll)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          checkingRef.current    = false;
          checkedUserRef.current = null;
          setAuthState({ loading: false, session: null, needsOnboarding: false });
          return;
        }
        if (!session?.user) return;

        setAuthState(s => ({ ...s, session }));

        // Cek cache — skip query jika sudah ada
        const cacheKey = `onboarding_${session.user.id}`;
        const cached   = sessionStorage.getItem(cacheKey);
        if (cached !== null && event !== 'USER_UPDATED') {
          setAuthState(s => ({ ...s, loading: false, needsOnboarding: cached === 'true' }));
          return;
        }

        await checkOnboarding(session.user.id);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-skd-bg text-skd-text font-syne transition-colors flex flex-col md:flex-row overflow-x-hidden">
      <Navigation />
      <IncomingDuelRequest />
      <main className={`flex-1 min-w-0 ${!isFullScreen ? 'md:ml-[88px] pb-20 md:pb-0' : ''} min-h-screen transition-all duration-300`}>
        <div className={`w-full h-full ${!isFullScreen ? 'max-w-7xl mx-auto' : ''}`}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/"                  element={<ProtectedRoute authState={authState}><Dashboard /></ProtectedRoute>} />
            <Route path="/onboarding"        element={<ProtectedRoute authState={authState}><Onboarding /></ProtectedRoute>} />
            <Route path="/quiz"              element={<ProtectedRoute authState={authState}><Quiz /></ProtectedRoute>} />
            <Route path="/result"            element={<ProtectedRoute authState={authState}><Result /></ProtectedRoute>} />
            <Route path="/liga"              element={<ProtectedRoute authState={authState}><Leaderboard /></ProtectedRoute>} />
            <Route path="/quest"             element={<ProtectedRoute authState={authState}><Quest /></ProtectedRoute>} />
            <Route path="/toko"              element={<ProtectedRoute authState={authState}><Shop /></ProtectedRoute>} />
            <Route path="/profil"            element={<ProtectedRoute authState={authState}><Profile /></ProtectedRoute>} />
            <Route path="/pembahasan-tryout" element={<ProtectedRoute authState={authState}><PembahasanTryout /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}



function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DuelProvider>
          <QuizSessionProvider>
            <Router>
              <AppLayout />
            </Router>
          </QuizSessionProvider>
        </DuelProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}



export default App;