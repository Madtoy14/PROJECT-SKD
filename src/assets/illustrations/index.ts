import practice from './practice.svg';
import survival from './survival.svg';
import pvp from './pvp.svg';
import tryout from './tryout.svg';
import wrongBook from './wrong-book.svg';
import streak from './streak.svg';
import quest from './quest.svg';
import coin from './coin.svg';
import energy from './energy.svg';
import statistics from './statistics.svg';

export const dashboardIllustrations = {
  practice,
  survival,
  pvp,
  tryout,
  wrongBook,
  streak,
  quest,
  coin,
  energy,
  statistics,
} as const;

export type DashboardIllustrationName = keyof typeof dashboardIllustrations;
