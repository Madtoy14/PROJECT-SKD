export interface Option {
  id: string;
  text: string;
  score: number; // Native BKN scores: 5 for TWK/TIU correct, 1-5 for TKP options
}

export interface Soal {
  id: number;
  category: 'TWK' | 'TIU' | 'TKP';
  text: string;
  options: Option[];
  correct: string; // Best option label: A, B, C, D, or E
  explanation: string; // Explanations & theory
  sub_kisi?: string; // Sub-syllabus mapping
}

export const SOAL_TRYOUT: Soal[] = [
  // ==================== TES WAWASAN KEBANGSAAN (TWK) ====================
  {
    id: 1,
    category: 'TWK',
    sub_kisi: 'Nasionalisme',
    text: "Sebagai negara dengan keberagaman suku dan budaya, Indonesia kerap menghadapi tantangan integrasi. Guna mempertahankan identitas nasional serta mewujudkan tujuan bersama tanpa menghilangkan ciri khas kebudayaan lokal, sikap nasionalisme yang paling tepat diwujudkan oleh seorang ASN adalah...",
    options: [
      { id: 'A', text: "Mengutamakan kebudayaan daerah sendiri dalam setiap kegiatan kedinasan nasional", score: 0 },
      { id: 'B', text: "Mengharuskan seluruh rekan kerja dari berbagai suku untuk mengadopsi budaya mayoritas", score: 0 },
      { id: 'C', text: "Mengapresiasi keberagaman budaya nusantara serta mengutamakan kepentingan bangsa di atas kepentingan kelompok", score: 5 },
      { id: 'D', text: "Membatasi interaksi sosial hanya dengan rekan kerja yang memiliki latar belakang budaya seragam", score: 0 },
      { id: 'E', text: "Mengabaikan nilai-nilai kebudayaan lokal demi mencapai modernitas global seutuhnya", score: 0 }
    ],
    correct: 'C',
    explanation: "Sesuai kisi-kisi Nasionalisme Permenpan RB, nasionalisme bertujuan untuk mampu mewujudkan kepentingan nasional melalui cita-cita dan tujuan yang sama dengan tetap mempertahankan identitas nasional. Mengapresiasi keberagaman serta mendahulukan kepentingan bangsa di atas kelompok (Opsi C) merupakan wujud nyata nasionalisme integratif di tengah kemajemukan Indonesia."
  },
  {
    id: 2,
    category: 'TWK',
    sub_kisi: 'Integritas',
    text: "Seorang kepala dinas menolak pemberian gratifikasi berupa paket liburan mewah dari salah satu vendor proyek pembangunan daerah, meskipun proyek tersebut telah selesai dengan hasil yang sangat baik dan tanpa kecurangan. Tindakan kepala dinas tersebut mencerminkan pilar integritas, yaitu...",
    options: [
      { id: 'A', text: "Ketangguhan karena berani menolak hadiah yang tidak memengaruhi kualitas pekerjaan", score: 0 },
      { id: 'B', text: "Komitmen dan konsistensi menjunjung tinggi nilai kejujuran serta aturan kedinasan untuk mencegah benturan kepentingan", score: 5 },
      { id: 'C', text: "Sikap ramah untuk menjaga hubungan kemitraan dengan vendor proyek pembangunan", score: 0 },
      { id: 'D', text: "Keberanian mengambil risiko finansial demi reputasi kedinasan semata", score: 0 },
      { id: 'E', text: "Kepatuhan bersyarat bergantung pada besarnya nilai nominal gratifikasi yang ditawarkan", score: 0 }
    ],
    correct: 'B',
    explanation: "Dalam kisi-kisi Integritas BKN, integritas didefinisikan sebagai kemampuan menjunjung tinggi kejujuran, ketangguhan, komitmen, dan konsistensi sebagai satu kesatuan sikap untuk mencapai tujuan nasional. Menolak gratifikasi (Opsi B) adalah bukti nyata dari komitmen dan konsistensi moral untuk mencegah korupsi dan benturan kepentingan."
  },
  {
    id: 3,
    category: 'TWK',
    sub_kisi: 'Bela Negara',
    text: "Ketika wilayah perbatasan Indonesia mengalami sengketa klaim sepihak oleh negara tetangga, masyarakat sipil di perbatasan secara aktif memberikan informasi pergerakan militer asing kepada TNI serta membantu logistik penjagaan. Tindakan masyarakat tersebut merupakan wujud bela negara yang didasari oleh...",
    options: [
      { id: 'A', text: "Rasa solidaritas kesukuan daerah perbatasan terhadap aparat penegak hukum", score: 0 },
      { id: 'B', text: "Kewajiban ikut serta secara paksa dalam pertahanan militer negara", score: 0 },
      { id: 'C', text: "Upaya mendapatkan kompensasi atau penghargaan materiil khusus dari pemerintah", score: 0 },
      { id: 'D', text: "Peran aktif dalam mempertahankan eksistensi bangsa dan negara berlandaskan cinta tanah air", score: 5 },
      { id: 'E', text: "Kekhawatiran akan hilangnya hak kepemilikan tanah pribadi akibat aneksasi asing", score: 0 }
    ],
    correct: 'D',
    explanation: "Bela negara bertujuan agar warga negara mampu berperan aktif dalam mempertahankan eksistensi bangsa dan negara. Partisipasi sukarela warga perbatasan mendukung pertahanan negara (Opsi D) bersumber dari kesadaran bela negara dan cinta tanah air untuk melindungi kedaulatan NKRI."
  },
  {
    id: 4,
    category: 'TWK',
    sub_kisi: 'Pilar Negara',
    text: "Nilai Pancasila yang terkandung dalam pembentukan Undang-Undang Kesejahteraan Sosial guna menjamin pemenuhan kebutuhan dasar bagi fakir miskin dan anak-anak terlantar oleh negara merupakan implementasi sila...",
    options: [
      { id: 'A', text: "Ketuhanan Yang Maha Esa", score: 0 },
      { id: 'B', text: "Kemanusiaan yang Adil dan Beradab", score: 0 },
      { id: 'C', text: "Persatuan Indonesia", score: 0 },
      { id: 'D', text: "Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan", score: 0 },
      { id: 'E', text: "Keadilan Sosial bagi Seluruh Rakyat Indonesia", score: 5 }
    ],
    correct: 'E',
    explanation: "Jaminan sosial bagi fakir miskin dan pemenuhan keadilan ekonomi-sosial (sesuai Pasal 34 UUD 1945) merupakan perwujudan sila kelima Pancasila (Opsi E) yakni Keadilan Sosial bagi Seluruh Rakyat Indonesia, yang menjadi salah satu pilar negara penting dalam mewujudkan kesejahteraan umum."
  },
  {
    id: 5,
    category: 'TWK',
    sub_kisi: 'Bahasa Negara',
    text: "Dalam rapat koordinasi tingkat kementerian yang dihadiri oleh delegasi dari berbagai dinas provinsi di seluruh Indonesia, penggunaan Bahasa Indonesia yang baik dan benar sangat diutamakan. Hal ini sejalan dengan fungsi Bahasa Indonesia sebagai...",
    options: [
      { id: 'A', text: "Bahasa pengantar dalam pergaulan internasional informal sehari-hari", score: 0 },
      { id: 'B', text: "Bahasa persatuan yang mempersatukan perbedaan suku, budaya, dan daerah dalam komunikasi resmi bernegara", score: 5 },
      { id: 'C', text: "Simbol prestise personal bagi aparatur sipil negara di forum publik", score: 0 },
      { id: 'D', text: "Satu-satunya bahasa yang boleh digunakan di seluruh wilayah kepulauan Indonesia", score: 0 },
      { id: 'E', text: "Bahasa pengganti seluruh kebudayaan dan adat istiadat lokal daerah", score: 0 }
    ],
    correct: 'B',
    explanation: "Berdasarkan kisi-kisi Bahasa Negara, tujuannya adalah mampu menggunakan bahasa Indonesia sebagai bahasa persatuan yang sangat penting kedudukannya dalam kehidupan bermasyarakat, berbangsa, dan bernegara. Menggunakan bahasa Indonesia dalam rapat dinas multietnis (Opsi B) memperkokoh integrasi dan kelancaran komunikasi nasional."
  },

  // ==================== TES INTELIGENSI UMUM (TIU) ====================
  {
    id: 6,
    category: 'TIU',
    sub_kisi: 'Verbal - Analogi',
    text: "BUKU : PERPUSTAKAAN : PUSTAKAWAN = ... : ... : ...",
    options: [
      { id: 'A', text: "Padi : Lumbung : Petani", score: 5 },
      { id: 'B', text: "Ikan : Laut : Nelayan", score: 0 },
      { id: 'C', text: "Uang : Dompet : Pengusaha", score: 0 },
      { id: 'D', text: "Mobil : Garasi : Supir", score: 0 },
      { id: 'E', text: "Daging : Pasar : Jagal", score: 0 }
    ],
    correct: 'A',
    explanation: "Hubungan fungsinya adalah: BUKU disimpan di PERPUSTAKAAN dan dikelola oleh PUSTAKAWAN. Maka padanan yang setara adalah PADI disimpan di LUMBUNG dan dikelola oleh PETANI (Opsi A)."
  },
  {
    id: 7,
    category: 'TIU',
    sub_kisi: 'Verbal - Silogisme',
    text: "Semua ASN memiliki kartu identitas kepegawaian. Sebagian warga komplek Permai bekerja sebagai ASN. Kesimpulan yang paling tepat adalah...",
    options: [
      { id: 'A', text: "Semua warga komplek Permai memiliki kartu identitas kepegawaian", score: 0 },
      { id: 'B', text: "Sebagian warga komplek Permai memiliki kartu identitas kepegawaian", score: 5 },
      { id: 'C', text: "Semua yang memiliki kartu identitas kepegawaian adalah warga komplek Permai", score: 0 },
      { id: 'D', text: "Sebagian ASN bukan merupakan warga komplek Permai", score: 0 },
      { id: 'E', text: "Tidak ada warga komplek Permai yang memiliki kartu identitas kepegawaian", score: 0 }
    ],
    correct: 'B',
    explanation: "Premis Mayor: Semua ASN memiliki kartu identitas kepegawaian (A -> B).\nPremis Minor: Sebagian warga komplek Permai adalah ASN (C -> A).\nKesimpulan: Sebagian warga komplek Permai (yang ASN) pasti memiliki kartu identitas kepegawaian (C -> B). Maka jawaban yang benar adalah Opsi B."
  },
  {
    id: 8,
    category: 'TIU',
    sub_kisi: 'Verbal - Analitis',
    text: "Lima orang mahasiswa (Andi, Budi, Citra, Dedi, dan Elsa) mengantre di depan loket beasiswa. Budi berada tepat di depan Elsa. Citra berada di depan Andi. Dedi berada di urutan terakhir. Jika Andi berada di urutan kedua, siapa yang mengantre di urutan pertama?",
    options: [
      { id: 'A', text: "Andi", score: 0 },
      { id: 'B', text: "Budi", score: 0 },
      { id: 'C', text: "Citra", score: 5 },
      { id: 'D', text: "Dedi", score: 0 },
      { id: 'E', text: "Elsa", score: 0 }
    ],
    correct: 'C',
    explanation: "Analisis Urutan:\n1. Dedi di urutan terakhir (posisi 5).\n2. Andi di urutan kedua (posisi 2).\n3. Citra di depan Andi. Karena Andi di posisi 2, maka Citra harus di posisi 1 (urutan pertama).\n4. Budi berada tepat di depan Elsa, tersisa posisi 3 dan 4. Maka Budi di posisi 3 dan Elsa di posisi 4.\nUrutan lengkap: Citra (1) - Andi (2) - Budi (3) - Elsa (4) - Dedi (5). Maka yang di urutan pertama adalah Citra (Opsi C)."
  },
  {
    id: 9,
    category: 'TIU',
    sub_kisi: 'Numerik - Deret Angka',
    text: "Tentukan angka selanjutnya dari deret berikut: 3, 7, 15, 31, 63, ...",
    options: [
      { id: 'A', text: "125", score: 0 },
      { id: 'B', text: "126", score: 0 },
      { id: 'C', text: "127", score: 5 },
      { id: 'D', text: "128", score: 0 },
      { id: 'E', text: "129", score: 0 }
    ],
    correct: 'C',
    explanation: "Pola deret angka:\n* 3 ke 7: (+4) atau (3 * 2 + 1)\n* 7 ke 15: (+8) atau (7 * 2 + 1)\n* 15 ke 31: (+16) atau (15 * 2 + 1)\n* 31 ke 63: (+32) atau (31 * 2 + 1)\nPola berikutnya: (+64) atau (63 * 2 + 1) = 127. Jadi, angka selanjutnya adalah 127 (Opsi C)."
  },
  {
    id: 10,
    category: 'TIU',
    sub_kisi: 'Numerik - Perbandingan Kuantitatif',
    text: "Sebuah konveksi dapat menyelesaikan 150 potong pakaian dalam waktu 6 hari dengan bantuan 5 orang pekerja. Jika pesanan bertambah menjadi 250 potong pakaian dan batas waktu penyelesaian dipercepat menjadi 5 hari, berapa jumlah pekerja yang dibutuhkan?",
    options: [
      { id: 'A', text: "8 pekerja", score: 0 },
      { id: 'B', text: "9 pekerja", score: 0 },
      { id: 'C', text: "10 pekerja", score: 5 },
      { id: 'D', text: "12 pekerja", score: 0 },
      { id: 'E', text: "15 pekerja", score: 0 }
    ],
    correct: 'C',
    explanation: "Gunakan rumus perbandingan:\nKapasitas 1 pekerja per hari = 150 potong / (6 hari * 5 pekerja) = 5 potong pakaian/hari/pekerja.\nUntuk target baru: 250 potong pakaian dalam 5 hari:\nKapasitas total per hari yang dibutuhkan = 250 potong / 5 hari = 50 potong/hari.\nJumlah pekerja yang dibutuhkan = 50 / 5 = 10 pekerja. Maka dibutuhkan 10 pekerja (Opsi C)."
  },
  {
    id: 11,
    category: 'TIU',
    sub_kisi: 'Figural - Serial',
    text: "Dalam pola gambar serial, jika Gambar 1 memiliki segitiga bersudut 3, Gambar 2 memiliki segi empat bersudut 4, dan Gambar 3 memiliki segi lima bersudut 5. Maka Gambar 4 berikutnya dalam serial tersebut seharusnya berupa...",
    options: [
      { id: 'A', text: "Lingkaran tanpa sudut", score: 0 },
      { id: 'B', text: "Segi enam bersudut 6", score: 5 },
      { id: 'C', text: "Segitiga sama sisi bersudut 3", score: 0 },
      { id: 'D', text: "Bintang bersudut 5", score: 0 },
      { id: 'E', text: "Garis lurus sejajar", score: 0 }
    ],
    correct: 'B',
    explanation: "Pola penalaran figural serial mengandalkan penambahan jumlah elemen/sudut secara berurutan (+1 sudut tiap langkah). Setelah segi lima (5 sudut), gambar selanjutnya harus berupa segi enam (6 sudut). Maka jawaban yang tepat adalah Opsi B."
  },

  // ==================== TES KARAKTERISTIK PRIBADI (TKP) ====================
  {
    id: 12,
    category: 'TKP',
    sub_kisi: 'Pelayanan Publik',
    text: "Anda sedang melayani antrean masyarakat di loket pelayanan administrasi BPN. Tiba-tiba seorang warga paruh baya menyelak antrean dan marah-marah dengan kasar karena merasa sertifikat tanahnya tidak kunjung selesai, sementara jam operasional kantor hampir berakhir. Sikap Anda...",
    options: [
      { id: 'A', text: "Memanggil petugas keamanan untuk mengeluarkannya paksa agar pelayanan kepada warga lain yang antre tidak terganggu.", score: 2 },
      { id: 'B', text: "Menegurnya dengan nada keras di depan publik agar dia menyadari kesalahannya yang tidak menghormati antrean warga lain.", score: 1 },
      { id: 'C', text: "Tetap tenang, menyambutnya dengan ramah, mendengarkan keluhannya secara empati, lalu memeriksa status berkasnya di sistem secara cepat setelah meminta pengertian warga lain.", score: 5 },
      { id: 'D', text: "Menyarankannya untuk pulang dan kembali besok pagi saja karena jam pelayanan kantor sudah hampir selesai.", score: 3 },
      { id: 'E', text: "Meminta bantuan rekan kerja lain untuk melayaninya sementara Anda melanjutkan pelayanan antrean warga yang tertib.", score: 4 }
    ],
    correct: 'C',
    explanation: "Kisi-kisi Pelayanan Publik bertujuan untuk menampilkan perilaku keramahtamahan dalam bekerja yang efektif agar bisa memenuhi kebutuhan dan kepuasan orang lain. Sikap ramah, tenang, empati, serta tanggap menyelesaikan masalah (Opsi C) memberikan nilai kepuasan tertinggi (skor 5)."
  },
  {
    id: 13,
    category: 'TKP',
    sub_kisi: 'Jejaring Kerja',
    text: "Instansi Anda sedang merancang sistem manajemen data baru lintas divisi yang memerlukan integrasi data dari divisi Anda. Namun, beberapa rekan di divisi Anda enggan membagikan data internal karena khawatir terjadi kebocoran informasi kerja. Langkah yang Anda ambil adalah...",
    options: [
      { id: 'A', text: "Membiarkan saja keengganan mereka karena keamanan data internal divisi memang merupakan prioritas utama divisi Anda.", score: 1 },
      { id: 'B', text: "Mengadakan diskusi internal divisi, memaparkan protokol keamanan sistem baru, serta berkoordinasi aktif dengan divisi IT untuk membangun jalur integrasi data yang aman dan kolaboratif.", score: 5 },
      { id: 'C', text: "Melaporkan penolakan rekan sejawat langsung kepada kepala instansi agar mereka diberikan sanksi kedisiplinan kerja.", score: 2 },
      { id: 'D', text: "Membagikan seluruh data divisi Anda secara diam-diam tanpa sepengetahuan rekan divisi guna menghindari konflik internal.", score: 3 },
      { id: 'E', text: "Menyarankan divisi IT untuk mencari sumber data lain dari luar divisi Anda agar pekerjaan divisi Anda tidak terganggu.", score: 4 }
    ],
    correct: 'B',
    explanation: "Jejaring kerja bertujuan membangun hubungan, kerja sama, berbagi informasi, dan berkolaborasi secara efektif. Pendekatan persuasif, mengomunikasikan keamanan, dan bekerja sama mencari solusi integratif (Opsi B) memperoleh poin maksimal (5)."
  },
  {
    id: 14,
    category: 'TKP',
    sub_kisi: 'Sosial Budaya',
    text: "Instansi tempat Anda bekerja menugaskan Anda memimpin tim penyuluhan kesehatan ke daerah pelosok yang mayoritas masyarakatnya memiliki keyakinan adat kuat yang menolak pengobatan modern. Pendekatan terbaik yang akan Anda lakukan adalah...",
    options: [
      { id: 'A', text: "Melaksanakan penyuluhan medis secara tegas dan mengabaikan kepercayaan adat setempat karena pengobatan modern terbukti lebih ilmiah.", score: 2 },
      { id: 'B', text: "Membatalkan tugas penyuluhan tersebut karena menilai program tidak akan efektif akibat adanya penolakan keras dari masyarakat lokal.", score: 1 },
      { id: 'C', text: "Mendekati tokoh adat secara santun, mendengarkan pandangan mereka, lalu menyampaikan manfaat kesehatan modern secara persuasif berkolaborasi dengan kearifan lokal.", score: 5 },
      { id: 'D', text: "Membagikan brosur medis secara acak ke rumah-rumah warga tanpa mengadakan forum tatap muka untuk menghindari ketegangan.", score: 3 },
      { id: 'E', text: "Melakukan koordinasi dengan dinas sosial dan aparat keamanan agar penyuluhan dikawal ketat guna memaksa warga hadir.", score: 4 }
    ],
    correct: 'C',
    explanation: "Dalam Sosial Budaya, ASN dituntut mampu beradaptasi dan bekerja efektif dalam masyarakat majemuk. Menghormati adat setempat dan melakukan pendekatan persuasif kekeluargaan melalui tokoh adat (Opsi C) merupakan tindakan terbaik (skor 5)."
  },
  {
    id: 15,
    category: 'TKP',
    sub_kisi: 'Teknologi Informasi dan Komunikasi',
    text: "Instansi Anda bermigrasi dari sistem pelaporan berbasis dokumen cetak manual ke aplikasi digital cloud terintegrasi. Beberapa staf senior merasa kesulitan beradaptasi dan meminta aplikasi tersebut dibatalkan. Sebagai staf yang menguasai TIK, tindakan Anda...",
    options: [
      { id: 'A', text: "Mengabaikan keluhan mereka karena perubahan sistem merupakan keputusan mutlak pimpinan yang tidak bisa diganggu gugat.", score: 2 },
      { id: 'B', text: "Membantu mengerjakan seluruh laporan staf senior secara terus-menerus agar target kinerja instansi tetap tercapai.", score: 3 },
      { id: 'C', text: "Menginisiasi pelatihan kecil secara berkala bagi staf senior, membuat panduan ringkas aplikasi, serta mendampingi mereka dengan sabar hingga mahir.", score: 5 },
      { id: 'D', text: "Menyarankan pimpinan instansi untuk memutasikan staf senior yang gaptek ke divisi kerja yang tidak membutuhkan keahlian komputer.", score: 1 },
      { id: 'E', text: "Menyarankan pimpinan untuk menyediakan opsi pelaporan manual paralel khusus bagi staf senior agar mereka nyaman.", score: 4 }
    ],
    correct: 'C',
    explanation: "Tujuan TIK adalah mampu memanfaatkan teknologi informasi secara efektif untuk meningkatkan kinerja organisasi. Melatih dan membimbing rekan kerja senior secara mandiri agar melek digital (Opsi C) berdampak jangka panjang dan konstruktif bagi organisasi (skor 5)."
  },
  {
    id: 16,
    category: 'TKP',
    sub_kisi: 'Profesionalisme',
    text: "Anda sedang menghadapi tenggat waktu (deadline) penyusunan laporan keuangan instansi yang harus dikirim ke kementerian malam ini. Namun, anak Anda tiba-tiba sakit demam tinggi dan harus dibawa ke dokter. Tindakan profesional yang Anda lakukan adalah...",
    options: [
      { id: 'A', text: "Meninggalkan pekerjaan kantor sepenuhnya untuk mendampingi anak Anda, dan menyerahkan berkas laporan apa adanya tanpa diperiksa.", score: 2 },
      { id: 'B', text: "Membawa pekerjaan kantor pulang dan menyelesaikannya di sela-sela mengurus anak Anda di rumah sakit secara mandiri.", score: 4 },
      { id: 'C', text: "Meminta bantuan keluarga dekat untuk membawa anak Anda ke dokter terlebih dahulu, sementara Anda menyelesaikan laporan dinas di kantor hingga selesai tepat waktu baru kemudian menyusul ke klinik.", score: 5 },
      { id: 'D', text: "Memalsukan laporan keuangan instansi secara instan agar laporan cepat terkirim dan Anda bisa langsung pulang mendampingi anak.", score: 1 },
      { id: 'E', text: "Mengirim email permohonan maaf ke kementerian untuk menunda pengiriman laporan tanpa koordinasi dengan pimpinan instansi terlebih dahulu.", score: 3 }
    ],
    correct: 'C',
    explanation: "Profesionalisme menuntut ASN melaksanakan tugas dan fungsi sesuai tuntutan jabatan dengan disiplin tinggi. Mendelegasikan pengantaran anak kepada keluarga dekat secara bijak demi menuntaskan laporan kritis negara (Opsi C) menunjukkan integritas profesi yang luar biasa (skor 5)."
  },
  {
    id: 17,
    category: 'TKP',
    sub_kisi: 'Anti-Radikalisme',
    text: "Di grup percakapan media sosial dinas instansi Anda, salah satu rekan kerja menyebarkan artikel provokatif bermuatan ujaran kebencian terhadap suku tertentu serta ajakan untuk menolak kebijakan pemerintah daerah yang sah. Sikap Anda...",
    options: [
      { id: 'A', text: "Ikut membagikan artikel tersebut ke grup pertemanan lain karena menganggapnya sebagai bentuk kebebasan berekspresi warga negara.", score: 1 },
      { id: 'B', text: "Mengabaikan kiriman tersebut dan segera keluar dari grup percakapan dinas agar terhindar dari konflik politik praktis.", score: 3 },
      { id: 'C', text: "Meninggkalkannya secara sopan tapi tegas di percakapan pribadi mengenai kode etik ASN yang harus netral dan anti-SARA, serta melaporkannya ke unit kepatuhan internal jika tidak diindahkan.", score: 5 },
      { id: 'D', text: "Membantah kiriman tersebut di grup secara emosional dengan kata-kata kasar agar dia merasa dipermalukan di depan rekan lain.", score: 2 },
      { id: 'E', text: "Menghubungi rekan kerja lain untuk bersepakat melakukan pengucilan sosial (boikot) terhadap rekan tersebut di lingkungan kantor.", score: 4 }
    ],
    correct: 'C',
    explanation: "Anti-radikalisme bertujuan menjaring informasi tentang kecenderungan bersikap konstruktif menolak radikalisme/SARA dan menanggapi stimulus secara bijak. Menegur dengan sopan berlandaskan kode etik profesi dan meneruskannya ke pengawas kepatuhan ASN (Opsi C) adalah langkah sistematis terbaik (skor 5)."
  }
];
