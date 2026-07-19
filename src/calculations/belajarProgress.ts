/**
 * Belajar Progress Tracking — localStorage
 * Tracks which sub-babs have been completed
 */

import type { BelajarProgress } from '../data/materi/index';

const STORAGE_KEY = 'skdquest_belajar_progress';

export function loadBelajarProgress(): BelajarProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveBelajarProgress(progress: BelajarProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // silently fail
  }
}

export function markSubBabComplete(modulId: string, subBabId: string): BelajarProgress {
  const progress = loadBelajarProgress();
  progress[`${modulId}_${subBabId}`] = true;
  saveBelajarProgress(progress);
  return progress;
}

export function isSubBabComplete(modulId: string, subBabId: string): boolean {
  const progress = loadBelajarProgress();
  return progress[`${modulId}_${subBabId}`] === true;
}

export function getCompletedCount(modulId: string, totalSubBabs: number): number {
  const progress = loadBelajarProgress();
  let count = 0;
  for (const key of Object.keys(progress)) {
    if (key.startsWith(`${modulId}_`) && progress[key]) {
      count++;
    }
  }
  return Math.min(count, totalSubBabs);
}

export function getTotalProgress(totalSubBabs: number): number {
  const progress = loadBelajarProgress();
  const completed = Object.values(progress).filter(Boolean).length;
  return Math.min(completed, totalSubBabs);
}