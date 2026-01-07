📍 SalesMap — Monitoring Kunjungan Sales

Aplikasi web ringan untuk memantau kunjungan sales berbasis Google Form + Google Sheets + Leaflet.js, lengkap dengan filter, statistik, grafik, dan export PDF profesional.

🚀 Fitur Utama

🗺️ Peta kunjungan sales (Leaflet + OpenStreetMap)

📍 Marker otomatis dari Google Sheets

🎨 Warna marker unik per sales

☑️ Filter sales (checkbox)

📆 Filter tanggal (harian / range)

📊 Statistik & grafik per sales

📄 Export laporan PDF:

Logo header

Watermark transparan

Tabel profesional

Grafik

Timestamp cetak

📂 Struktur Project
salesaura_map/
│
├─ index.html
├─ style.css
├─ script.js
└─ README.md


❗ Tidak memerlukan backend / database / build tools

🛠️ Prasyarat

Pastikan di komputer sudah tersedia:

Python 3.x

Browser modern (Chrome / Edge / Firefox)

Cek Python:

python --version

▶️ Menjalankan Aplikasi (Localhost)
1️⃣ Masuk ke folder project
cd C:\salesaura_map

2️⃣ Jalankan HTTP server
python -m http.server 8000


Jika berhasil, akan muncul:

Serving HTTP on :: port 8000 (http://[::]:8000/) ...

3️⃣ Buka di browser
http://localhost:8000


Aplikasi HARUS dijalankan via HTTP server
❌ Tidak bisa dibuka dengan klik index.html langsung

🔗 Integrasi Data (Google Sheets)
Alur Data
Google Form
   ↓
Google Sheets (Form Responses)
   ↓
Sheet data_map
   ↓
Publish to Web (CSV)
   ↓
Leaflet Map

Contoh CSV publik
https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=XXXX&single=true&output=csv


URL CSV diatur di file:

const sheetCSV = "PASTE_URL_DISINI";

🖼️ Logo Laporan PDF

Logo laporan disarankan disimpan di static asset hosting:

Contoh (Supabase Storage):

const logoURL = "https://xxxx.supabase.co/storage/v1/object/public/logo.png";


❌ Jangan gunakan Google Drive / GitHub blob
✅ Gunakan URL gambar langsung (PNG/JPG)

🧾 Export Laporan PDF

Klik tombol Export PDF untuk menghasilkan:

Header logo (proporsional)

Ringkasan statistik

Grafik kunjungan

Tabel detail (multi halaman)

Watermark logo

Footer timestamp & nomor halaman

File akan otomatis terunduh:

laporan_kunjungan_sales.pdf

🧠 Catatan Penting

Tidak membutuhkan internet kecuali:

Google Sheets (CSV)

Asset logo

Aman untuk:

≤ 20 sales

Penggunaan internal

Mudah dipindahkan ke komputer lain

🧪 Menjalankan di Komputer Lain

Cukup lakukan:

Copy folder salesaura_map

Pastikan Python terinstall

Jalankan:

python -m http.server 8000


Tidak ada:

install dependency

build step

konfigurasi server

📌 Roadmap (Opsional)

Export PDF per sales (batch)

Ranking top / low performer

Snapshot peta ke PDF

Deploy hook ke GitHub Pages / intranet

🧑‍💻 Author

SalesAura — Internal Sales Monitoring
Developed for internal operational analytics.
