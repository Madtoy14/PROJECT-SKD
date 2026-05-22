import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Trophy, BookOpen, Store, User } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Leaderboard from './pages/Leaderboard';
import Quest from './pages/Quest';
import Shop from './pages/Shop';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';

function Navigation() {
  const location = useLocation();
  
  
  const hideNavPaths = ['/quiz', '/result', '/auth', '/onboarding'];
  if (hideNavPaths.includes(location.pathname)) return null;

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/liga', icon: Trophy, label: 'Liga' },
    { path: '/quest', icon: BookOpen, label: 'Quest' },
    { path: '/toko', icon: Store, label: 'Toko' },
    { path: '/profil', icon: User, label: 'Profil' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 w-full bg-skd-card/90 backdrop-blur-md border-t border-skd-border pb-safe z-50 transition-colors">
        <ul className="flex justify-around items-center h-16">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <li key={path} className="flex-1">
                <Link to={path} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-skd-accent' : 'text-skd-muted hover:text-skd-text'}`}>
                  <Icon size={20} className={isActive ? 'drop-shadow-[0_0_8px_rgba(245,166,35,0.5)]' : ''} />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop Sidebar Navigation */}
      <nav className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-20 hover:w-64 bg-skd-card border-r border-skd-border z-50 transition-all duration-300 group overflow-hidden">
        <div className="p-6 flex items-center min-w-[16rem]">
          <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-skd-accent to-yellow-500 bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap absolute">SKDQuest</h1>
          <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-skd-accent to-yellow-500 bg-clip-text text-transparent group-hover:opacity-0 transition-opacity duration-300">SQ</h1>
        </div>
        
        <ul className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <li key={path}>
                <Link 
                  to={path} 
                  className={`flex items-center px-4 py-3 rounded-xl transition-all min-w-[14rem] ${
                    isActive 
                      ? 'bg-skd-accent/10 text-skd-accent font-bold' 
                      : 'text-skd-muted hover:bg-skd-bg hover:text-skd-text font-medium'
                  }`}
                >
                  <div className="w-6 flex items-center justify-center shrink-0">
                    <Icon size={20} className={isActive ? 'drop-shadow-[0_0_8px_rgba(245,166,35,0.5)]' : ''} />
                  </div>
                  <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">{label}</span>
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
    <div className="min-h-screen bg-skd-bg text-skd-text font-syne transition-colors">
      <Navigation />
      
      {/* Main Content Area - padded for sidebar on desktop and bottom nav on mobile */}
      <main className={`${!isFullScreen ? 'md:ml-20 pb-16 md:pb-0' : ''} min-h-screen transition-all duration-300`}>
        <div className={`w-full ${!isFullScreen ? 'max-w-7xl mx-auto' : ''}`}>
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
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppLayout />
      </Router>
    </ThemeProvider>
  );
}

export default App;
