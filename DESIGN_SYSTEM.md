# Sistem Desain (Design System) & Panduan Implementasi

Dokumen ini berisi daftar token warna, komponen primitif utama, serta panduan resiliensi (ketahanan aplikasi) untuk pengembangan lebih lanjut. Seluruh UI harus mengacu pada token dan komponen ini.

## 1. Token Warna (Semantic Tokens)
Gunakan *utility classes* berikut dari Tailwind (yang mengambil nilai dari src/index.css) alih-alih hardcoded hex color (misal: #0F0E17).

### Surfaces (Latar Komponen)
- g-bg: Latar belakang utama aplikasi (Slate 50).
- g-surface: Latar Card, Panel utama, dan Modal (Putih).
- g-surface-subtle: Latar section tambahan/input (Slate 100).
- g-surface-tinted: Latar area highlight/opsi yang dipilih (Blue 50).

### Text (Tipografi)
- 	ext-fg: Teks utama, judul, heading (Slate 900).
- 	ext-fg-secondary: Deskripsi, paragraf sekunder (Slate 700).
- 	ext-fg-muted: Metadata, teks pendukung berukuran kecil (Slate 500).

### Borders (Garis Batas)
- order-border: Garis pinggir standar untuk pembatas (Slate 200).
- order-border-strong: Garis tepi pada form input (Slate 300).

### Warna Semantik (Feedback & Aksi)
- **Primary** (g-primary, 	ext-primary, 	ext-primary-fg): Aksi utama, tombol Submit.
- **Success** (g-success, 	ext-success): Berhasil, nilai positif, jawaban benar.
- **Warning / Coin** (g-warning, 	ext-coin): Risiko, saldo koin, item berbayar.
- **Danger** (g-danger, 	ext-danger): Error, kegagalan, jawaban salah.
- **Info** (g-info, 	ext-info): Notifikasi netral, fitur tambahan.
- **Premium** (g-premium, 	ext-premium): Fitur premium/Toko, highlight eksklusif.

---

## 2. Shared Primitives

Hindari menulis komponen dengan *raw HTML element* bila primitif UI sudah tersedia.

### Penggunaan Button (src/components/ui/Button.tsx)
Mendukung prop varian warna dan ukuran. Mendukung disabled dan loading.
`	sx
import { Button } from '../components/ui/Button';

// Contoh penggunaan:
<Button variant="primary" size="md" onClick={handleClick} loading={isSubmitting}>
  Simpan Perubahan
</Button>
`
**Varian:** primary, secondary, outline, ghost, danger, premium, info.
**Ukuran:** sm, md, lg.

### Penggunaan Badge (src/components/ui/Badge.tsx)
`	sx
import { Badge } from '../components/ui/Badge';

<Badge variant="success">Jawaban Benar</Badge>
`
**Varian:** default, success, warning, danger, info, coin, premium, xp, energy.

### Penggunaan Card (src/components/ui/Card.tsx)
`	sx
import { Card } from '../components/ui/Card';

<Card className="p-4" hoverable>
  Isi Card...
</Card>
`

---

## 3. Resiliensi: Error Boundary

Setiap area fungsional baru (seperti modul statistik, mode mini-game, dll.) **WAJIB** dibungkus dengan Error Boundary secara individual. Tujuannya adalah memastikan *crash* pada satu widget tidak menyebabkan seluruh layar aplikasi ikut blank.

### Cara Membungkus Komponen Baru:
Gunakan komponen ErrorBoundary dengan ariant="local" untuk komponen spesifik.

`	sx
import { ErrorBoundary } from '../components/ErrorBoundary';

function MyFeatureDashboard() {
  return (
    <div>
      {/* Jika KomponenIniRentanError mengalami crash, 
          hanya bagian ini yang akan menampilkan fallback message */}
      <ErrorBoundary variant="local" fallbackMessage="Gagal memuat fitur ini.">
        <KomponenIniRentanError />
      </ErrorBoundary>
    </div>
  );
}
`
Pesan fallback akan secara otomatis memiliki warna senada (abu-abu *muted* atau warning) tanpa merusak layout luar.
