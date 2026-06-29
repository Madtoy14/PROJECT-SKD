// Scoring Rules:
// TWK & TIU: correct = 50, wrong = 0
// TKP: no right/wrong, each option has a weight (10, 20, 30, 40, 50)
//      'correct' field = the BEST answer (50 pts), other options ranked below it

export interface Option {
  id: string;
  text: string;
  score: number; // score when this option is selected
}

export interface Soal {
  id: number;
  category: 'TWK' | 'TIU' | 'TKP';
  text: string;
  options: Option[];
  correct: string; // best answer for TWK/TIU, best answer (50pts) for TKP
}

export const SOAL_SKD: Soal[] = [
  {
    id: 1,
    category: 'TWK',
    text: "Pancasila sebagai dasar negara memiliki makna bahwa Pancasila menjadi dasar dalam mengatur penyelenggaraan pemerintahan negara. Hal ini sesuai dengan kedudukan Pancasila sebagai...",
    options: [
      { id: 'A', text: 'Ideologi terbuka', score: 0 },
      { id: 'B', text: 'Sumber dari segala sumber hukum', score: 50 },
      { id: 'C', text: 'Pandangan hidup bangsa', score: 0 },
      { id: 'D', text: 'Jiwa dan kepribadian bangsa', score: 0 },
      { id: 'E', text: 'Perjanjian luhur', score: 0 }
    ],
    correct: 'B',
  },
  {
    id: 2,
    category: 'TWK',
    text: "Dalam sistem ketatanegaraan Indonesia, lembaga yang memiliki wewenang untuk menguji undang-undang terhadap UUD 1945 adalah...",
    options: [
      { id: 'A', text: 'Mahkamah Agung', score: 0 },
      { id: 'B', text: 'Komisi Yudisial', score: 0 },
      { id: 'C', text: 'Dewan Perwakilan Rakyat', score: 0 },
      { id: 'D', text: 'Majelis Permusyawaratan Rakyat', score: 0 },
      { id: 'E', text: 'Mahkamah Konstitusi', score: 50 }
    ],
    correct: 'E',
  },
  {
    id: 3,
    category: 'TIU',
    text: "Jika 12 pekerja dapat menyelesaikan sebuah proyek dalam waktu 20 hari. Berapa hari yang dibutuhkan jika proyek tersebut dikerjakan oleh 15 pekerja?",
    options: [
      { id: 'A', text: '12 hari', score: 0 },
      { id: 'B', text: '14 hari', score: 0 },
      { id: 'C', text: '15 hari', score: 0 },
      { id: 'D', text: '16 hari', score: 50 },
      { id: 'E', text: '18 hari', score: 0 }
    ],
    correct: 'D',
  },
  {
    id: 4,
    category: 'TIU',
    text: "Semua hewan mamalia berkembang biak dengan melahirkan. Ikan paus adalah hewan mamalia. Kesimpulan yang tepat adalah...",
    options: [
      { id: 'A', text: 'Ikan paus bertelur', score: 0 },
      { id: 'B', text: 'Ikan paus berkembang biak dengan melahirkan', score: 50 },
      { id: 'C', text: 'Beberapa mamalia tidak melahirkan', score: 0 },
      { id: 'D', text: 'Ikan paus bukan mamalia', score: 0 },
      { id: 'E', text: 'Tidak dapat ditarik kesimpulan', score: 0 }
    ],
    correct: 'B',
  },
  {
    id: 5,
    category: 'TKP',
    text: "Anda sedang mengerjakan tugas penting yang harus selesai hari ini. Tiba-tiba atasan meminta Anda untuk menggantikannya rapat mendadak di luar kantor. Sikap Anda...",
    options: [
      { id: 'A', text: 'Menolak secara halus karena tugas harus selesai hari ini', score: 10 },
      { id: 'B', text: 'Menerima dan mendelegasikan tugas penting tersebut ke rekan kerja yang kompeten', score: 50 },
      { id: 'C', text: 'Menyarankan rekan kerja lain untuk menggantikan rapat', score: 20 },
      { id: 'D', text: 'Menerima lalu mengerjakan tugas tersebut di sela-sela rapat', score: 40 },
      { id: 'E', text: 'Meminta perpanjangan waktu untuk tugas tersebut lalu pergi rapat', score: 30 }
    ],
    correct: 'B', // best answer
  },
  {
    id: 6,
    category: 'TKP',
    text: "Rekan kerja Anda sering datang terlambat dan itu mulai memengaruhi kinerja tim secara keseluruhan. Apa yang akan Anda lakukan?",
    options: [
      { id: 'A', text: 'Melaporkannya langsung ke HRD', score: 20 },
      { id: 'B', text: 'Menegurnya secara pribadi dan menanyakan alasannya serta mengingatkan dampaknya', score: 50 },
      { id: 'C', text: 'Membiarkannya karena itu bukan urusan saya', score: 10 },
      { id: 'D', text: 'Membicarakannya dengan rekan kerja lain', score: 30 },
      { id: 'E', text: 'Menyindirnya saat rapat tim', score: 40 }
    ],
    correct: 'B',
  }
];
