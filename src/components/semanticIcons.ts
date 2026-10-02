import { BarChart2, BookOpen, Bookmark, Home, LogOut, Settings, Store, Target, Trophy, User, Users, BookOpenCheck } from 'lucide-react';

export const semanticIcons = {
  home: Home,
  belajar: BookOpen,
  tryout: BookOpenCheck,
  liga: Trophy,
  quest: Target,
  wrongBook: Bookmark,
  toko: Store,
  profil: User,
  pengaturan: Settings,
  logout: LogOut,
  statistics: BarChart2,
  multiplayer: Users,
} as const;
