import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
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
import { AudioProvider } from './context/AudioContext';
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
                  className={`flex flex-col group-hover:flex-row items-center group-hover:items-center px-0 group-hover:px-4 py-3 group-hover:py-3.5 rounded-xl transition-all w-full ${
                    isActive 
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

function AppLayout() {
  const location = useLocation();
  const hideNavPaths = ['/quiz', '/result', '/auth', '/onboarding'];
  const isFullScreen = hideNavPaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-skd-bg text-skd-text font-syne transition-colors flex flex-col md:flex-row">
      <Navigation />
      <IncomingDuelRequest />
      
      {/* Main Content Area - padded for sidebar on desktop and bottom nav on mobile */}
      <main className={`flex-1 min-w-0 ${!isFullScreen ? 'md:ml-[88px] pb-20 md:pb-0' : ''} min-h-screen transition-all duration-300`}>
        <div className={`w-full h-full ${!isFullScreen ? 'max-w-7xl mx-auto' : ''}`}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/result" element={<Result />} />
            <Route path="/liga" element={<Leaderboard />} />
            <Route path="/quest" element={<Quest />} />
            <Route path="/toko" element={<Shop />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/pembahasan-tryout" element={<PembahasanTryout />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AudioProvider>
        <DuelProvider>
          <Router>
            <AppLayout />
          </Router>
        </DuelProvider>
      </AudioProvider>
    </ThemeProvider>
  );
}

export default App;
