import type { Soal } from './soal_tryout';

export interface TryOutPackage {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  cost: number;
  isDevelopment: boolean;
  questions?: Soal[];
}

export const AVAILABLE_PACKAGES: TryOutPackage[] = [
  { 
    id: 'paket_tryout_akbar_1', 
    title: 'Try Out Akbar CPNS #1', 
    description: 'Paket Try Out Akbar Nasional + Pembahasan Lengkap menggunakan sistem CAT. Uji kesiapan Anda secara nyata!', 
    totalQuestions: 110, // Or whatever standard length
    cost: 0, // Set to free for immediate testing as requested
    isDevelopment: false 
    // questions omitted so it falls back to SOAL_TRYOUT natively in ReviewDetail and Quiz
  },
  { 
    id: 'paket_tryout_akbar_2', 
    title: 'Try Out Akbar CPNS #2', 
    description: 'Pembahasan lengkap Try Out Akbar CAT serentak peringkat nasional 2.', 
    totalQuestions: 110,
    cost: 1500,
    isDevelopment: true 
  },
  { 
    id: 'paket_to_2',
    title: 'Try Out Nasional #2',
    description: 'Paket Try Out khusus penalaran HOTS dan soal karakteristik pribadi tingkat lanjut.',
    totalQuestions: 110,
    cost: 1000,
    isDevelopment: true 
  },
  { 
    id: 'paket_to_3',
    title: 'Try Out Nasional #3',
    description: 'Try Out Simulasi Akbar. Cek kesiapan Anda melawan ribuan pesaing lainnya.',
    totalQuestions: 110,
    cost: 1500,
    isDevelopment: true 
  },
  { 
    id: 'paket_to_4',
    title: 'Try Out Nasional #4',
    description: 'Fokus pada soal menjebak TIU Numerik dan Logika Analitis spasial.',
    totalQuestions: 110,
    cost: 1500,
    isDevelopment: true 
  },
  { 
    id: 'paket_to_5',
    title: 'Try Out Nasional #5',
    description: 'Paket paling sulit. Prediksi soal-soal CPNS tahun ini dengan akurasi 90%.',
    totalQuestions: 110,
    cost: 2000,
    isDevelopment: true 
  },
  { 
    id: 'paket_premium_tkp_1', 
    title: 'Paket Soal Rahasia TKP 1', 
    description: 'Pembahasan 100 soal TKP HOTS pilar pelayanan publik & profesionalisme.', 
    totalQuestions: 100,
    cost: 1000,
    isDevelopment: true 
  },
  { 
    id: 'paket_premium_tkp_2', 
    title: 'Paket Soal Rahasia TKP 2', 
    description: 'Pembahasan soal TKP bertema jejaring kerja & anti radikalisme.', 
    totalQuestions: 100,
    cost: 1000,
    isDevelopment: true 
  },
  { 
    id: 'paket_premium_tiu_1', 
    title: 'Trik TIU Numerik 1', 
    description: 'Pembahasan trik matematika numerik, deret aritmatika cepat, & penalaran logis.', 
    totalQuestions: 100,
    cost: 1000,
    isDevelopment: true 
  },
  { 
    id: 'paket_premium_tiu_2', 
    title: 'Trik TIU Analitis 2', 
    description: 'Pembahasan taktis silogisme, diagram venn, & penalaran analitis spasial.', 
    totalQuestions: 100,
    cost: 1000,
    isDevelopment: true 
  },
  { 
    id: 'paket_premium_twk_1', 
    title: 'Hafalan UUD TWK 1', 
    description: 'Pembahasan materi pilar negara, UUD 1945, & nasionalisme secara mendalam.', 
    totalQuestions: 100,
    cost: 1000,
    isDevelopment: true 
  },
  { 
    id: 'paket_premium_twk_2', 
    title: 'Pilar Negara TWK 2', 
    description: 'Pembahasan soal TWK bela negara, patriotisme, & sejarah perjuangan bangsa.', 
    totalQuestions: 100,
    cost: 1000,
    isDevelopment: true 
  },
  { 
    id: 'paket_spesialis_bumn', 
    title: 'Simulasi Khusus BUMN', 
    description: 'Materi soal pembahasan TKD & Core Values Akhlak persiapan BUMN.', 
    totalQuestions: 100,
    cost: 2000,
    isDevelopment: true 
  }
];
