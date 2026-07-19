/**
 * Mode Belajar — Data Types
 * Ringkasan materi SKD per sub-bab + mini quiz
 */

export interface SubBabQuiz {
  pertanyaan: string;
  opsi: { id: string; text: string }[];
  kunci: string;
  pembahasan: string;
}

export interface SubBab {
  id: string;
  title: string;
  ringkasan: string[];
  tips: string[];
  quiz: SubBabQuiz[];
}

export interface Modul {
  id: string;
  title: string;
  subtitle: string;
  icon: string;   // lucide icon name
  color: string;  // tailwind class
  bg: string;
  border: string;
  subBabs: SubBab[];
}

export interface BelajarProgress {
  [key: string]: boolean; // "twk_pancasila": true
}