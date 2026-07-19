/**
 * Batch append TWK UUD 1945 questions (20 soal)
 * Format sesuai existing: id, category, sub, text, options, correct, explanation, xp_reward, coin_reward
 */

const fs = require('fs');
const path = require('path');

const NEW_QUESTIONS = [
  {
    "id": "TWK-056",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pembukaan UUD 1945 terdiri dari empat alinea. Alinea keempat memuat hal-hal fundamental bagi negara Indonesia. Berikut ini yang TIDAK tercantum dalam alinea keempat Pembukaan UUD 1945 adalah...",
    "options": [
      { "id": "A", "text": "Tujuan negara Indonesia", "score": 1 },
      { "id": "B", "text": "Bentuk negara kesatuan republik", "score": 2 },
      { "id": "C", "text": "Dasar negara Pancasila", "score": 3 },
      { "id": "D", "text": "Proklamasi kemerdekaan Indonesia", "score": 5 },
      { "id": "E", "text": "Ketentuan diadakan UUD", "score": 4 }
    ],
    "correct": "D",
    "explanation": "Alinea keempat Pembukaan UUD 1945 berisi: tujuan negara, ketentuan diadakannya UUD, bentuk negara (kesatuan republik), dan dasar negara Pancasila. Proklamasi kemerdekaan termuat dalam alinea ketiga, bukan keempat.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-057",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 1 Ayat (2) UUD 1945 setelah amandemen menyatakan bahwa kedaulatan berada di tangan rakyat dan dilaksanakan menurut Undang-Undang Dasar. Perubahan ini merupakan pergeseran dari sistem kedaulatan sebelumnya, yaitu...",
    "options": [
      { "id": "A", "text": "Kedaulatan di tangan MPR sebagai lembaga tertinggi negara", "score": 5 },
      { "id": "B", "text": "Kedaulatan di tangan presiden sebagai mandataris MPR", "score": 4 },
      { "id": "C", "text": "Kedaulatan di tangan DPR sebagai wakil rakyat", "score": 2 },
      { "id": "D", "text": "Kedaulatan di tangan partai politik pemenang pemilu", "score": 1 },
      { "id": "E", "text": "Kedaulatan di tangan lembaga tinggi negara", "score": 3 }
    ],
    "correct": "A",
    "explanation": "Sebelum amandemen, UUD 1945 menganut sistem kedaulatan MPR — MPR adalah lembaga tertinggi negara dan presiden bertanggung jawab kepada MPR. Setelah amandemen, kedaulatan berada di tangan rakyat dan langsung dilaksanakan melalui pemilu (presiden, DPR, DPD, DPRD).",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-058",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Amandemen UUD 1945 dilakukan sebanyak empat kali dalam kurun waktu 1999-2002. Salah satu perubahan paling mendasar adalah ketentuan mengenai masa jabatan presiden. Berdasarkan Pasal 7 UUD 1945 setelah amandemen, presiden dan wakil presiden memegang jabatan selama...",
    "options": [
      { "id": "A", "text": "4 tahun dan dapat dipilih kembali untuk 2 periode berikutnya", "score": 1 },
      { "id": "B", "text": "5 tahun dan hanya dapat dipilih kembali untuk 1 kali masa jabatan", "score": 5 },
      { "id": "C", "text": "6 tahun dan dapat dipilih kembali tanpa batas", "score": 3 },
      { "id": "D", "text": "5 tahun dan dapat dipilih kembali untuk 2 kali masa jabatan", "score": 4 },
      { "id": "E", "text": "4 tahun dan hanya dapat dipilih kembali untuk 1 kali masa jabatan", "score": 2 }
    ],
    "correct": "B",
    "explanation": "Pasal 7 UUD 1945 (amandemen) menyatakan: 'Presiden dan Wakil Presiden memegang jabatan selama lima tahun, dan sesudahnya dapat dipilih kembali dalam jabatan yang sama hanya untuk satu kali masa jabatan.' Sebelum amandemen, presiden dapat dipilih kembali tanpa batas.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-059",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Setelah amandemen UUD 1945, struktur ketatanegaraan Indonesia mengalami perubahan signifikan. Salah satunya adalah pembentukan Mahkamah Konstitusi (MK) yang diatur dalam Pasal 24C. MK memiliki beberapa kewenangan, kecuali...",
    "options": [
      { "id": "A", "text": "Menguji undang-undang terhadap Undang-Undang Dasar", "score": 2 },
      { "id": "B", "text": "Memutus sengketa kewenangan lembaga negara", "score": 3 },
      { "id": "C", "text": "Memutus pembubaran partai politik", "score": 4 },
      { "id": "D", "text": "Menguji peraturan pemerintah terhadap undang-undang", "score": 5 },
      { "id": "E", "text": "Memutus perselisihan hasil pemilihan umum", "score": 1 }
    ],
    "correct": "D",
    "explanation": "MK berwenang: (1) menguji UU terhadap UUD, (2) memutus sengketa kewenangan lembaga negara, (3) memutus pembubaran partai politik, (4) memutus perselisihan hasil pemilu. Menguji peraturan pemerintah terhadap UU adalah kewenangan MA, bukan MK.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-060",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 28A sampai 28J UUD 1945 mengatur tentang hak asasi manusia. Pasal 28J ayat (2) menegaskan bahwa dalam menjalankan hak dan kebebasannya, setiap orang wajib tunduk kepada pembatasan yang ditetapkan dengan undang-undang. Prinsip ini dikenal sebagai...",
    "options": [
      { "id": "A", "text": "Hak asasi bersifat mutlak tanpa pengecualian", "score": 1 },
      { "id": "B", "text": "Pembatasan HAM demi kepentingan umum dan keamanan negara", "score": 5 },
      { "id": "C", "text": "HAM hanya berlaku bagi warga negara Indonesia", "score": 3 },
      { "id": "D", "text": "Pembatasan HAM dapat dilakukan oleh presiden kapan saja", "score": 2 },
      { "id": "E", "text": "HAM dapat dibatasi berdasarkan keputusan partai politik", "score": 4 }
    ],
    "correct": "B",
    "explanation": "Pasal 28J ayat (2) UUD 1945 menyatakan bahwa hak asasi manusia dapat dibatasi dengan undang-undang semata-mata untuk menjamin pengakuan dan penghormatan atas hak kebebasan orang lain serta untuk memenuhi tuntutan yang adil sesuai dengan pertimbangan moral, nilai agama, keamanan, dan ketertiban umum.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-061",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 31 UUD 1945 mengatur tentang hak warga negara di bidang pendidikan. Berdasarkan pasal tersebut, setiap warga negara berhak mendapat pendidikan. Pemerintah wajib membiayai pendidikan dasar bagi warga negara. Jenis pendidikan yang dimaksud adalah...",
    "options": [
      { "id": "A", "text": "Pendidikan tinggi gratis untuk semua warga negara", "score": 1 },
      { "id": "B", "text": "Pendidikan menengah atas gratis", "score": 2 },
      { "id": "C", "text": "Pendidikan dasar (SD dan SMP) tanpa dipungut biaya", "score": 5 },
      { "id": "D", "text": "Pendidikan anak usia dini gratis", "score": 3 },
      { "id": "E", "text": "Pendidikan vokasi gratis", "score": 4 }
    ],
    "correct": "C",
    "explanation": "Pasal 31 ayat (2) UUD 1945 menyatakan: 'Setiap warga negara wajib mengikuti pendidikan dasar dan pemerintah wajib membiayainya.' Pasal 31 ayat (1) menyatakan: 'Setiap warga negara berhak mendapat pendidikan.' Pendidikan dasar meliputi SD (6 tahun) dan SMP (3 tahun).",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-062",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Salah satu amandemen penting dalam UUD 1945 adalah penghapusan Dewan Pertimbangan Agung (DPA) dan pembentukan lembaga baru sebagai penggantinya. Lembaga yang dimaksud adalah...",
    "options": [
      { "id": "A", "text": "Majelis Permusyawaratan Rakyat", "score": 2 },
      { "id": "B", "text": "Dewan Perwakilan Daerah", "score": 4 },
      { "id": "C", "text": "Badan Pemeriksa Keuangan", "score": 1 },
      { "id": "D", "text": "Dewan Perwakilan Rakyat", "score": 3 },
      { "id": "E", "text": "Dewan Pertimbangan Presiden (Wantimpres)", "score": 5 }
    ],
    "correct": "E",
    "explanation": "DPA dihapus melalui Amandemen Keempat UUD 1945 (2002) dan digantikan dengan Dewan Pertimbangan Presiden (Wantimpres) yang dibentuk berdasarkan Pasal 16 UUD 1945. Wantimpres bertugas memberikan nasihat dan pertimbangan kepada presiden, berbeda dengan DPA yang merupakan lembaga tinggi negara setingkat menteri.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-063",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 33 UUD 1945 merupakan pasal yang mengatur tentang perekonomian nasional. Berdasarkan pasal tersebut, cabang-cabang produksi yang penting bagi negara dan menguasai hajat hidup orang banyak dikuasai oleh negara. Prinsip ekonomi yang dianut adalah...",
    "options": [
      { "id": "A", "text": "Ekonomi pasar bebas tanpa campur tangan negara", "score": 1 },
      { "id": "B", "text": "Ekonomi kerakyatan dengan asas kekeluargaan", "score": 5 },
      { "id": "C", "text": "Ekonomi terpusat yang dikelola swasta", "score": 2 },
      { "id": "D", "text": "Ekonomi kapitalis dengan dominasi asing", "score": 3 },
      { "id": "E", "text": "Ekonomi campuran 50:50 negara-swasta", "score": 4 }
    ],
    "correct": "B",
    "explanation": "Pasal 33 UUD 1945 menganut asas kekeluargaan dalam perekonomian. Ayat (1) menyatakan perekonomian disusun sebagai usaha bersama berdasar atas asas kekeluargaan. Ayat (4) menegaskan perekonomian nasional diselenggarakan berdasar atas demokrasi ekonomi dengan prinsip kebersamaan, efisiensi berkeadilan, dan berkelanjutan.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-064",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 29 UUD 1945 mengatur tentang agama. Ayat (1) menyatakan bahwa negara berdasarkan Ketuhanan Yang Maha Esa. Ayat (2) menjamin kemerdekaan tiap-tiap penduduk untuk memeluk agamanya masing-masing dan beribadat menurut agamanya. Implementasi pasal ini dalam kehidupan bernegara adalah...",
    "options": [
      { "id": "A", "text": "Indonesia adalah negara teokrasi dengan satu agama resmi", "score": 1 },
      { "id": "B", "text": "Negara menjamin kebebasan beragama tanpa batas sama sekali", "score": 3 },
      { "id": "C", "text": "Negara melindungi setiap pemeluk agama dalam menjalankan ibadah sesuai kepercayaannya", "score": 5 },
      { "id": "D", "text": "Agama tertentu mendapat fasilitas lebih dari negara", "score": 2 },
      { "id": "E", "text": "Semua warga negara wajib memeluk agama yang diakui negara", "score": 4 }
    ],
    "correct": "C",
    "explanation": "Pasal 29 UUD 1945 menegaskan Indonesia bukan negara teokrasi maupun negara sekuler, melainkan negara yang berdasarkan Ketuhanan Yang Maha Esa. Negara melindungi setiap warga negara untuk memeluk agama dan beribadah sesuai agamanya, tanpa diskriminasi. Pembatasan kebebasan beragama diatur dalam undang-undang untuk menjaga ketertiban umum.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-065",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 22E UUD 1945 mengatur tentang pemilihan umum. Pemilu diselenggarakan untuk memilih anggota DPR, DPD, DPRD, Presiden dan Wakil Presiden. Penyelenggara pemilu nasional yang bersifat tetap, mandiri, dan tidak memihak adalah...",
    "options": [
      { "id": "A", "text": "Badan Pengawas Pemilu (Bawaslu)", "score": 2 },
      { "id": "B", "text": "Komisi Pemilihan Umum (KPU)", "score": 5 },
      { "id": "C", "text": "Dewan Kehormatan Penyelenggara Pemilu (DKPP)", "score": 3 },
      { "id": "D", "text": "Kementerian Dalam Negeri", "score": 1 },
      { "id": "E", "text": "Mahkamah Konstitusi", "score": 4 }
    ],
    "correct": "B",
    "explanation": "Pasal 22E ayat (5) UUD 1945 menyatakan: 'Pemilihan umum diselenggarakan oleh suatu komisi pemilihan umum yang bersifat nasional, tetap, dan mandiri.' KPU adalah lembaga penyelenggara pemilu. Bawaslu adalah pengawas, MK mengadili sengketa hasil pemilu, dan DKPP mengawasi etika penyelenggara pemilu.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-066",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Berdasarkan Pasal 23E UUD 1945, Badan Pemeriksa Keuangan (BPK) bertugas memeriksa pengelolaan dan tanggung jawab keuangan negara. BPK berkedudukan sebagai lembaga yang...",
    "options": [
      { "id": "A", "text": "Bawahan presiden dan bertanggung jawab kepada presiden", "score": 2 },
      { "id": "B", "text": "Bagian dari Kementerian Keuangan", "score": 1 },
      { "id": "C", "text": "Bawahan MPR dan melapor ke MPR setiap tahun", "score": 4 },
      { "id": "D", "text": "Lembaga yang bebas dan mandiri dengan hasil pemeriksaan diserahkan ke DPR, DPD, dan DPRD", "score": 5 },
      { "id": "E", "text": "Lembaga yang bekerja di bawah MA", "score": 3 }
    ],
    "correct": "D",
    "explanation": "Pasal 23E UUD 1945 menegaskan BPK adalah lembaga yang bebas dan mandiri (independent). Hasil pemeriksaan BPK diserahkan kepada DPR (pusat), DPD (terkait keuangan daerah), dan DPRD (daerah). BPK berkedudukan setara dengan lembaga negara lainnya seperti MK, MA, dan MPR.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-067",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Sistem pemerintahan Indonesia berdasarkan UUD 1945 adalah presidensial. Ciri utama sistem presidensial yang dianut Indonesia setelah amandemen adalah...",
    "options": [
      { "id": "A", "text": "Presiden dipilih oleh MPR dan dapat dijatuhkan oleh MPR setiap saat", "score": 1 },
      { "id": "B", "text": "Presiden dipilih langsung oleh rakyat dan tidak bertanggung jawab kepada DPR", "score": 5 },
      { "id": "C", "text": "Presiden adalah kepala negara tetapi kepala pemerintahan dipegang perdana menteri", "score": 2 },
      { "id": "D", "text": "Presiden dan DPR bersama-sama menjalankan pemerintahan secara kolektif", "score": 3 },
      { "id": "E", "text": "Presiden bertanggung jawab kepada MPR dan DPR secara bersama", "score": 4 }
    ],
    "correct": "B",
    "explanation": "Ciri utama sistem presidensial pasca-amandemen: (1) presiden dipilih langsung oleh rakyat (Pasal 6A), (2) presiden tidak bertanggung jawab kepada DPR (sebelumnya bertanggung jawab kepada MPR), (3) presiden tidak dapat dibubarkan oleh DPR, (4) DPR tidak dapat dijatuhkan oleh presiden.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-068",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 18 UUD 1945 mengatur tentang pemerintahan daerah. Provinsi, kabupaten, dan kota mengatur dan mengurus sendiri urusan pemerintahan menurut asas otonomi dan tugas pembantuan. Kepala daerah dipilih secara...",
    "options": [
      { "id": "A", "text": "Ditunjuk oleh presiden berdasarkan usulan DPRD", "score": 1 },
      { "id": "B", "text": "Dipilih oleh DPRD dari kader partai", "score": 3 },
      { "id": "C", "text": "Dipilih langsung oleh rakyat melalui pemilihan kepala daerah", "score": 5 },
      { "id": "D", "text": "Diangkat oleh Menteri Dalam Negeri", "score": 2 },
      { "id": "E", "text": "Dipilih oleh MPR dari calon yang diusulkan presiden", "score": 4 }
    ],
    "correct": "C",
    "explanation": "Pasal 18 ayat (4) UUD 1945 menyatakan: 'Gubernur, Bupati, dan Walikota masing-masing sebagai kepala pemerintah daerah provinsi, kabupaten, dan kota dipilih secara demokratis.' Sejak 2005, kepala daerah dipilih langsung oleh rakyat melalui Pilkada.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-069",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Sebelum amandemen, MPR merupakan lembaga tertinggi negara dengan kekuasaan tak terbatas (superpowers). Setelah amandemen, kedudukan MPR berubah menjadi...",
    "options": [
      { "id": "A", "text": "Lembaga yang masih tertinggi namun kekuasaannya dibatasi", "score": 2 },
      { "id": "B", "text": "Lembaga yang sejajar dengan lembaga negara lainnya", "score": 5 },
      { "id": "C", "text": "Lembaga yang dibubarkan dan diganti DPR", "score": 1 },
      { "id": "D", "text": "Lembaga yang hanya bersidang 5 tahun sekali", "score": 3 },
      { "id": "E", "text": "Lembaga pengawas presiden setara BPK", "score": 4 }
    ],
    "correct": "B",
    "explanation": "Amandemen UUD 1945 menghapus supremasi MPR. Setelah amandemen, MPR berkedudukan sejajar dengan lembaga negara lainnya (DPR, DPD, Presiden, MK, MA, BPK, KY). Tugas MPR terbatas pada mengubah dan menetapkan UUD, melantik presiden/wakil presiden, dan memberhentikan presiden dalam proses impeachment.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-070",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 1 Ayat (3) UUD 1945 menyatakan bahwa Negara Indonesia adalah negara hukum. Konsekuensi dari prinsip negara hukum (rechtsstaat) adalah...",
    "options": [
      { "id": "A", "text": "Presiden berhak mengeluarkan peraturan tanpa persetujuan DPR", "score": 1 },
      { "id": "B", "text": "Segala tindakan pemerintahan harus berdasarkan hukum yang berlaku", "score": 5 },
      { "id": "C", "text": "Hukum hanya berlaku bagi warga negara biasa, tidak bagi pejabat", "score": 2 },
      { "id": "D", "text": "Hukum dapat diabaikan dalam keadaan darurat", "score": 3 },
      { "id": "E", "text": "Hukum dibuat oleh pemerintah tanpa partisipasi DPR", "score": 4 }
    ],
    "correct": "B",
    "explanation": "Negara hukum (rechtsstaat) berarti semua penyelenggaraan negara harus didasarkan pada hukum (wetmatigheid van bestuur). Konsekuensinya: (1) supremasi hukum, (2) pembagian kekuasaan, (3) perlindungan HAM, (4) peradilan bebas dan tidak memihak, (5) asas legalitas dalam tindakan pemerintah.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-071",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 6A UUD 1945 mengatur tentang tata cara pemilihan presiden dan wakil presiden. Apabila dalam pemilu tidak ada pasangan calon yang memperoleh suara lebih dari 50% dengan sebaran 20% lebih di setiap provinsi, maka...",
    "options": [
      { "id": "A", "text": "Pemilu diulang dari awal", "score": 2 },
      { "id": "B", "text": "DPR yang memilih presiden", "score": 3 },
      { "id": "C", "text": "Diadakan pemilihan putaran kedua oleh MPR", "score": 5 },
      { "id": "D", "text": "Presiden ditunjuk oleh partai pemenang pemilu", "score": 1 },
      { "id": "E", "text": "KPU menetapkan pasangan dengan suara terbanyak mutlak", "score": 4 }
    ],
    "correct": "C",
    "explanation": "Pasal 6A ayat (3) dan (4) UUD 1945: Pasangan calon presiden dan wakil presiden yang mendapatkan suara lebih dari 50% dengan sebaran di lebih dari setengah provinsi dilantik. Jika tidak ada, pasangan dengan suara terbanyak pertama dan kedua mengikuti pemilihan putaran kedua yang diselenggarakan MPR.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-072",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 30 UUD 1945 mengatur tentang pertahanan dan keamanan negara. Setiap warga negara berhak dan wajib ikut serta dalam usaha pertahanan dan keamanan negara. Komponen utama sistem pertahanan negara adalah...",
    "options": [
      { "id": "A", "text": "Polisi Republik Indonesia", "score": 2 },
      { "id": "B", "text": "Tentara Nasional Indonesia dan Polri", "score": 4 },
      { "id": "C", "text": "Tentara Nasional Indonesia (TNI)", "score": 5 },
      { "id": "D", "text": "Rakyat terlatih dan satuan pengamanan swakarsa", "score": 3 },
      { "id": "E", "text": "Kementerian Pertahanan", "score": 1 }
    ],
    "correct": "C",
    "explanation": "Pasal 30 ayat (2) UUD 1945 menyatakan: 'Usaha pertahanan dan keamanan negara dilaksanakan melalui sistem pertahanan dan keamanan rakyat semesta dengan Tentara Nasional Indonesia sebagai komponen utama dan kepolisian sebagai komponen utama pengaman.' TNI adalah komponen utama pertahanan, Polri adalah komponen utama keamanan.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-073",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 26 UUD 1945 mengatur tentang warga negara. Yang menjadi warga negara Indonesia adalah orang-orang bangsa Indonesia asli dan orang-orang bangsa lain yang disahkan dengan undang-undang sebagai warga negara. Syarat-syarat memperoleh kewarganegaraan diatur dalam...",
    "options": [
      { "id": "A", "text": "Peraturan presiden", "score": 2 },
      { "id": "B", "text": "Keputusan Menteri Hukum dan HAM", "score": 3 },
      { "id": "C", "text": "Undang-undang", "score": 5 },
      { "id": "D", "text": "Peraturan pemerintah", "score": 4 },
      { "id": "E", "text": "Putusan Mahkamah Konstitusi", "score": 1 }
    ],
    "correct": "C",
    "explanation": "Pasal 26 ayat (2) UUD 1945 menyatakan: 'Penduduk ialah warga negara Indonesia dan orang asing yang bertempat tinggal di Indonesia.' Ayat (3): 'Hal-hal mengenai warga negara dan penduduk diatur dengan undang-undang.' Saat ini diatur dalam UU No. 12 Tahun 2006 tentang Kewarganegaraan RI.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-074",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 24B UUD 1945 mengatur tentang Komisi Yudisial (KY). KY adalah komisi yang bersifat mandiri yang berwenang mengusulkan pengangkatan hakim agung dan menjaga kehormatan, keluhuran martabat, serta perilaku hakim. Anggota KY diangkat dan diberhentikan oleh...",
    "options": [
      { "id": "A", "text": "Presiden dengan persetujuan MPR", "score": 2 },
      { "id": "B", "text": "Mahkamah Agung", "score": 3 },
      { "id": "C", "text": "Presiden dengan persetujuan DPR", "score": 5 },
      { "id": "D", "text": "DPR melalui mekanisme fit and proper test", "score": 4 },
      { "id": "E", "text": "Ketua Mahkamah Agung dengan persetujuan MPR", "score": 1 }
    ],
    "correct": "C",
    "explanation": "Pasal 24B ayat (3) UUD 1945 menyatakan: 'Anggota Komisi Yudisial diangkat dan diberhentikan oleh Presiden dengan persetujuan Dewan Perwakilan Rakyat.' KY beranggotakan 7 orang yang merupakan mantan hakim, akademisi, dan praktisi hukum dengan masa jabatan 5 tahun.",
    "xp_reward": 10,
    "coin_reward": 5
  },
  {
    "id": "TWK-075",
    "category": "TWK",
    "sub": "UUD 1945",
    "text": "Pasal 34 UUD 1945 mengatur tentang fakir miskin dan anak-anak terlantar. Berdasarkan pasal tersebut, siapa yang bertanggung jawab memelihara fakir miskin dan anak-anak terlantar?",
    "options": [
      { "id": "A", "text": "Keluarga dan kerabat dekat", "score": 3 },
      { "id": "B", "text": "Pemerintah daerah setempat", "score": 4 },
      { "id": "C", "text": "Negara", "score": 5 },
      { "id": "D", "text": "Organisasi sosial dan keagamaan", "score": 2 },
      { "id": "E", "text": "Masyarakat melalui donasi sukarela", "score": 1 }
    ],
    "correct": "C",
    "explanation": "Pasal 34 UUD 1945 menyatakan: (1) Fakir miskin dan anak-anak terlantar dipelihara oleh negara, (2) Negara mengembangkan sistem jaminan sosial bagi seluruh rakyat, (3) Negara bertanggung jawab atas penyediaan fasilitas pelayanan kesehatan dan fasilitas pelayanan umum yang layak. Ini menunjukkan komitmen negara kesejahteraan (welfare state).",
    "xp_reward": 10,
    "coin_reward": 5
  }
];

// Read existing, append, write
const filePath = path.join(__dirname, '..', 'src', 'data', 'questions', 'twk.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const before = data.length;
data.push(...NEW_QUESTIONS);
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`TWK: ${before} → ${data.length} (${NEW_QUESTIONS.length} baru)`);

// Verify UUD 1945 count
const uud = data.filter(q => q.sub === 'UUD 1945');
console.log(`UUD 1945 sekarang: ${uud.length} soal (dari ${uud.length - NEW_QUESTIONS.length})`);