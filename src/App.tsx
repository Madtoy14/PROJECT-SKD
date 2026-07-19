import { ErrorBoundary } from './components/ErrorBoundary';

import { QuizSessionProvider } from './context/QuizSessionContext';

import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';

import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';

import { Home, Trophy, BookOpen, Store, User, BookOpenCheck, Target, Bookmark, Menu, X, LogOut } from 'lucide-react';


import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Quiz = lazy(() => import('./pages/Quiz'));
const Result = lazy(() => import('./pages/Result'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Quest = lazy(() => import('./pages/Quest'));
const Shop = lazy(() => import('./pages/Shop'));
const WrongBook = lazy(() => import('./pages/WrongBook'));
const TryOutLobby = lazy(() => import('./pages/TryOutLobby'));
const ReviewDetail = lazy(() => import('./pages/ReviewDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Auth = lazy(() => import('./pages/Auth'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Belajar = lazy(() => import('./pages/Belajar'));
const BelajarModul = lazy(() => import('./pages/BelajarModul'));
const BelajarSubBab = lazy(() => import('./pages/BelajarSubBab'));

import { DuelProvider } from './context/DuelContext';
import IncomingDuelRequest from './components/IncomingDuelRequest';
import PWAInstallPrompt from './components/PWAInstallPrompt';



function Navigation() {
  const location = useLocation();

  const hideNavPaths = ['/quiz', '/auth', '/onboarding'];

  if (hideNavPaths.includes(location.pathname) || location.pathname.startsWith('/result') || location.pathname.startsWith('/review')) return null;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const mainNav = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/belajar', icon: BookOpen, label: 'Belajar' },
    { path: '/pembahasan', icon: BookOpenCheck, label: 'Try Out' },
    { path: '/quest', icon: Target, label: 'Quest' },
    { path: '/profil', icon: User, label: 'Profil' },
  ];

  const sidebarItems = [
    { path: '/catatan-salah', icon: Bookmark, label: 'Catatan Salah' },
    { path: '/liga', icon: Trophy, label: 'Liga' },
    { path: '/toko', icon: Store, label: 'Toko' },
  ];

  const handleLogout = async () => {
    try {
      if (supabase) await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch { window.location.href = '/auth'; }
  };

  return (
    <>
      {/* ── Mobile Top Bar ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-12 bg-surface/95 backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-subtle transition-colors"
          aria-label="Buka menu navigasi"
        >
          <Menu size={22} className="text-fg" />
        </button>
        <Link to="/" className="text-base font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
          SKDQuest
        </Link>
        <div className="w-9" /> {/* spacer */}

        {/* ── Mobile Sidebar Overlay ── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-[100]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <nav className="absolute top-0 left-0 bottom-0 w-72 bg-surface shadow-2xl border-r border-border flex flex-col animate-in slide-in-from-left duration-200">
              {/* Sidebar Header */}
              <div className="h-14 flex items-center justify-between px-5 border-b border-border">
                <span className="font-bold text-lg bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">SKDQuest</span>
                <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-subtle transition-colors" aria-label="Tutup menu">
                  <X size={18} className="text-fg-muted" />
                </button>
              </div>
              {/* Sidebar Nav Items */}
              <ul className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {sidebarItems.map(({ path, icon: Icon, label }) => {
                  const isActive = location.pathname === path;
                  return (
                    <li key={path}>
                      <Link
                        to={path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                          isActive ? 'bg-primary/10 text-primary' : 'text-fg-muted hover:bg-surface-subtle hover:text-fg'
                        }`}
                      >
                        <Icon size={20} />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {/* Sidebar Logout */}
              <div className="px-3 pb-6 pt-2 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-danger hover:bg-danger/5 transition-colors"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 w-full bg-surface/95 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] backdrop-blur-md border-t border-border z-50 transition-colors pb-[env(safe-area-inset-bottom)]">
        <ul className="flex justify-around items-center h-16">
          {mainNav.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <li key={path} className="flex-1 h-full">
                <Link to={path} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-fg-muted hover:text-fg'}`}>
                  <Icon size={22} className={isActive ? 'drop-shadow-[0_0_8px_rgba(245,166,35,0.5)]' : ''} />
                  <span className="text-[10px] font-bold">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Desktop Sidebar Navigation ── */}
      <nav className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-[88px] hover:w-64 bg-slate-900 border-r border-slate-800 z-50 transition-all duration-300 group overflow-hidden shadow-xl">
        <div className="h-24 flex items-center justify-center group-hover:justify-start group-hover:px-6 shrink-0 relative w-full">
          <h1 className="text-[20px] font-bold tracking-tighter bg-gradient-to-r from-primary to-blue-200 bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute left-6 whitespace-nowrap">SKDQuest</h1>
          <h1 className="text-[22px] font-bold tracking-tighter bg-gradient-to-r from-primary to-blue-200 bg-clip-text text-transparent group-hover:opacity-0 transition-opacity duration-300">SQ</h1>
        </div>

        <ul className="flex-1 px-3 group-hover:px-4 space-y-2 mt-2 w-full">
          {[...mainNav, ...sidebarItems].map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <li key={path}>
                <Link
                  to={path}
                  className={`flex flex-col group-hover:flex-row items-center group-hover:items-center px-0 group-hover:px-4 py-3 group-hover:py-3.5 rounded-xl transition-all w-full border-l-[3px] border-transparent ${isActive
                    ? 'bg-primary/20 text-white font-bold !border-primary'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 font-medium'
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

        {/* Desktop Logout */}
        <div className="px-3 group-hover:px-4 pb-6 pt-2 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="flex flex-col group-hover:flex-row items-center group-hover:items-center px-0 group-hover:px-4 py-3 group-hover:py-3.5 rounded-xl transition-all w-full text-slate-400 hover:bg-white/5 hover:text-red-400 font-medium"
          >
            <div className="flex flex-col items-center justify-center shrink-0 w-16 group-hover:w-6 gap-1.5 group-hover:gap-0">
              <LogOut size={22} className="group-hover:!w-5 group-hover:!h-5 transition-all" />
              <span className="text-[10px] group-hover:hidden font-bold leading-none block">Logout</span>
            </div>
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden group-hover:block text-[14px] font-bold">Logout</span>
          </button>
        </div>
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
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3 text-primary font-bold">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
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
  const hideNavPaths = ['/quiz', '/auth', '/onboarding'];
  const isFullScreen = hideNavPaths.includes(location.pathname) || location.pathname.startsWith('/result') || location.pathname.startsWith('/review');

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

    // Timeout protection: jangan stuck loading forever
    const timeout = setTimeout(() => {
      console.warn('[Auth] Session check timeout, redirecting to /auth');
      setAuthState({ loading: false, session: null, needsOnboarding: false });
    }, 5000); // 5 detik timeout

    // Cek session awal sekali saat AppLayout mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout); // Cancel timeout jika berhasil

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
    }).catch((err) => {
      clearTimeout(timeout);
      console.error('[Auth] Session check failed:', err);
      setAuthState({ loading: false, session: null, needsOnboarding: false });
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
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-main)] font-syne transition-colors flex flex-col md:flex-row overflow-x-hidden">
      <Navigation />
      <IncomingDuelRequest />
      <main className={`flex-1 min-w-0 ${!isFullScreen ? 'md:ml-[88px] pt-12 md:pt-0 pb-20 md:pb-0' : ''} min-h-screen transition-all duration-300`}>
        <div className={`w-full h-full ${!isFullScreen ? 'max-w-7xl mx-auto' : ''}`}>
          <Suspense fallback={
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3 text-primary font-bold">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" role="status" aria-label="Memuat modul" />
              <span className="text-sm text-fg-muted">Memuat Modul...</span>
            </div>
          }>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/"                  element={<ProtectedRoute authState={authState}><Dashboard /></ProtectedRoute>} />
              <Route path="/onboarding"        element={<ProtectedRoute authState={authState}><Onboarding /></ProtectedRoute>} />
              <Route path="/quiz"              element={<ProtectedRoute authState={authState}><Quiz /></ProtectedRoute>} />
              <Route path="/result/:attemptId" element={<ProtectedRoute authState={authState}><Result /></ProtectedRoute>} />
              <Route path="/liga"              element={<ProtectedRoute authState={authState}><Leaderboard /></ProtectedRoute>} />
              <Route path="/quest"             element={<ProtectedRoute authState={authState}><Quest /></ProtectedRoute>} />
              <Route path="/toko"              element={<ProtectedRoute authState={authState}><Shop /></ProtectedRoute>} />
              <Route path="/catatan-salah"     element={<ProtectedRoute authState={authState}><WrongBook /></ProtectedRoute>} />
              <Route path="/pembahasan"        element={<ProtectedRoute authState={authState}><TryOutLobby /></ProtectedRoute>} />
              <Route path="/tryout-lobby"     element={<ProtectedRoute authState={authState}><TryOutLobby /></ProtectedRoute>} />
              <Route path="/review/:attemptId" element={<ProtectedRoute authState={authState}><ReviewDetail /></ProtectedRoute>} />
              <Route path="/review/:packageId/:attemptId" element={<ProtectedRoute authState={authState}><ReviewDetail /></ProtectedRoute>} />
              <Route path="/profil"            element={<ProtectedRoute authState={authState}><Profile /></ProtectedRoute>} />
              <Route path="/belajar"           element={<ProtectedRoute authState={authState}><Belajar /></ProtectedRoute>} />
                            <Route path="/belajar/:modul"     element={<ProtectedRoute authState={authState}><BelajarModul /></ProtectedRoute>} />
                            <Route path="/belajar/:modul/:subbab" element={<ProtectedRoute authState={authState}><BelajarSubBab /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}



function App() {
  return (
    <ErrorBoundary>
      
        <DuelProvider>
          <QuizSessionProvider>
            <Router>
                          <AppLayout />
                          <PWAInstallPrompt />
                        </Router>
          </QuizSessionProvider>
        </DuelProvider>
      
    </ErrorBoundary>
  );
}



export default App;