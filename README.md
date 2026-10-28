# FAST — Ruang Gerak Alumni

Prototipe pendataan alumni dan monitoring dukungan untuk pemilihan presiden FAST. UI bahasa Indonesia, responsif, tanpa dependensi runtime, siap di-deploy ke Vercel.

## Jalankan

Memerlukan Node.js 20 atau lebih baru. Tidak perlu `npm install`.

```sh
npm run dev
# http://127.0.0.1:3000
npm test
npm run build
```

## Deploy Vercel

Import repository ini melalui **Vercel → Add New → Project → Import Git Repository**. Pilih preset **Other**, build command `npm run build`, output directory `dist`. Tidak ada environment variable. Konfigurasi tersedia pada `vercel.json`.

Alternatif CLI dari root repo: `npx vercel --prod` (memerlukan login Vercel).

## Fitur

- Ringkasan total alumni, fix voters, target dukungan, progres konfirmasi, dan sebaran kota.
- Tambah/edit alumni, pencarian dan filter status, PIC, wilayah.
- WhatsApp dinormalisasi ke 62; nomor dan ID alumni/NIM unik.
- Satu PIC per alumni; maksimal 20 alumni/PIC. Target minimum kerja 10 alumni terlihat di kartu PIC.
- Fix voter / sudah memilih membutuhkan persetujuan dan tanggal konfirmasi langsung. Total fix voters sudah mencakup yang memilih, tanpa hitung ganda.
- Database perusahaan dan komunitas dengan kontak penghubung dan jumlah alumni terhubung.
- Status masuk grup, catatan tindak lanjut, log aktivitas lokal.
- Ekspor CSV yang menetralkan formula spreadsheet, cadangan JSON, impor cadangan tervalidasi, pengaturan target, reset simulasi.

## Batas versi contoh

**Data disimpan hanya di localStorage browser yang sedang digunakan**, bukan di server Vercel. Browser/perangkat lain mempunyai data sendiri. Menghapus penyimpanan browser akan menghapus perubahan. Data awal seluruhnya fiktif; nomor berawalan 62800000 adalah placeholder demonstrasi.

Repo publik berisi kode dan data simulasi, tanpa database alumni asli. Jangan commit ekspor/cadangan data pribadi ke repo publik. Demo tidak memiliki autentikasi, kontrol akses, sinkronisasi tim, atau audit server; log lokal dapat diubah pengguna browser.

## Tahap operasional bersama

Sebelum dipakai dengan data asli: tambahkan database bersama (misalnya Postgres), login, peran admin/koordinator/PIC, izin akses per PIC, validasi dan unique constraint di server, pencatatan persetujuan, log audit, serta backup otomatis. Vercel menjadi hosting aplikasi; penyimpanan browser bukan database bersama.

Struktur tabel yang disarankan: `coordinators`, `pics`, `alumni`, `organizations`, `alumni_organizations`, `support_confirmations`, `activity_logs`. Pasang unique constraint pada nomor WhatsApp ternormalisasi dan ID alumni. Penetapan kapasitas PIC perlu transaksi server untuk mencegah perebutan slot saat input bersamaan.

## Alur demo

1. Lihat ringkasan dari 24 alumni fiktif dan 4 PIC.
2. Tambah alumni, isi ID alumni/NIM dan WhatsApp baru, pilih PIC.
3. Coba nomor yang sama dengan format +62/08: sistem menolak duplikasi.
4. Edit status menjadi Fix voter, centang persetujuan dan isi tanggal konfirmasi.
5. Periksa progres dashboard, data per PIC, perusahaan/komunitas, dan log aktivitas.
6. Unduh cadangan JSON sebelum memindahkan data ke browser lain.
