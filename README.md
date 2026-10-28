# FAST — Ruang Gerak Alumni

Aplikasi pendataan dan monitoring dukungan pemilihan Presiden FAST. Dashboard responsif untuk HP, formulir publik terpisah, database Neon Postgres bersama, dan API Vercel.

## Tautan

- Formulir publik: `/daftar`, tanpa login, satu halaman.
- Formulir per timses: `/daftar?ref=ID_TIMSES`. Angkatan, jurusan, dan timses terisi dari struktur server.
- Dashboard pengelola: `/`, memerlukan login `/login`.
- Simulasi UI dengan data fiktif: `/?demo=1`. Perubahan pada simulasi hanya disimpan di browser dan tidak masuk database bersama.

## Menjalankan

Node.js >=20.

```sh
npm ci
npm run dev
npm test
npm run build
```

Preview lokal: `http://127.0.0.1:3000/?demo=1`. Untuk API lokal, sediakan `DATABASE_URL` dan `ADMIN_PASSWORD` melalui environment proses atau `node --env-file=.env.local server.mjs`. Jangan commit `.env.local`.

## Konfigurasi Vercel

Preset **Other**, build `npm run build`, output `dist`. API berada di `api/workspace.js`. Konfigurasi routing dan header tersedia di `vercel.json`.

Hubungkan Neon Postgres di **Storage**, pilih paket Free sesuai persetujuan pemilik. Tambahkan variabel koneksi sebagai **Sensitive**, khusus Production. Driver membaca `DATABASE_URL` atau `POSTGRES_URL`. Development dan Preview tidak diberi akses otomatis ke database Production.

Pemilik memasukkan **ADMIN_PASSWORD** secara privat di Vercel Environment Variables, minimum 16 karakter. Kata sandi tidak dikirim melalui chat, tidak ditulis ke repo, dan tidak dimasukkan ke JavaScript publik. Mengganti password membatalkan sesi lama. Redeploy setelah mengubah environment.

## Alur operasional

1. Login dashboard dan susun Ketua PIC Angkatan, PIC jurusan, serta timses. Database bersama mulai kosong; data demo browser tidak otomatis diunggah.
2. Hierarki: **Jendral Pemenangan → Ketua PIC Angkatan → PIC Jurusan pada angkatan tersebut → timses → alumni**. Maksimal 50 timses/PIC jurusan dan 10 alumni/timses.
3. Bagikan formulir umum dari Pengaturan, atau **Bagikan form** pada timses untuk tautan yang sudah terisi.
4. Alumni mengisi nama, WhatsApp, NIM/ID alumni, angkatan, jurusan, kota, serta persetujuan dukungan dan pendataan secara mandiri. Penghubung opsional pada formulir umum.
5. Server menyimpan pendaftaran sebagai pending, dengan nomor tanda terima. Pendaftaran tidak langsung menambah hitungan fix voter.
6. Pengelola membuka **Pendaftaran**, memilih timses yang sesuai angkatan dan jurusan, lalu memverifikasi. Pendaftaran ganda, angkatan/jurusan tidak sesuai, serta kapasitas penuh ditolak server.
7. Data terverifikasi masuk dashboard dan rekap angkatan/jurusan/PIC. Halaman pengelola memperbarui data setiap 30 detik ketika tidak sedang mengedit. Perubahan yang bertabrakan ditolak dengan pesan untuk memuat ulang.

## Penyimpanan dan akses

- fast_workspace: struktur organisasi, alumni terverifikasi, perusahaan/komunitas, target dan log; JSONB dengan revision untuk mencegah perubahan tertimpa.
- fast_registrations: isian publik, status pending/approved/rejected, unique constraint WhatsApp ternormalisasi dan ID alumni huruf kecil.
- fast_rate_limits: pembatasan percobaan login dan pengiriman formulir per jam; alamat IP diubah menjadi HMAC, tidak disimpan mentah. Honeypot dan durasi minimum turut menyaring pengiriman otomatis sederhana.
- Tabel dibuat secara idempoten saat API pertama terhubung; query memakai parameter Neon. Verifikasi memakai kunci baris dan perubahan atomik agar status pendaftaran konsisten dengan workspace.
- Cookie sesi admin ditandatangani, HttpOnly, Secure pada HTTPS, SameSite Strict, berlaku 8 jam. Mutasi memerlukan JSON dan Origin aplikasi sendiri.
- Katalog publik hanya berisi nama penghubung, angkatan dan jurusan; tidak mengirim daftar alumni, NIM, kontak, atau catatan pengelola.
- Akses pengelola MVP memakai satu kata sandi bersama. Hierarki jabatan dipakai untuk plotting dan laporan; belum merupakan izin terpisah per akun. Jangan bagikan kata sandi pengelola kepada pengisi formulir.

## Cadangan dan batas

CSV mengekspor alumni terverifikasi (atau hasil filter) dan menetralkan formula spreadsheet. Cadangan JSON memuat workspace serta salinan pendaftaran yang tampil, maksimal 2.000 terbaru. Impor workspace tervalidasi **tidak memulihkan atau menggantikan** tabel pendaftaran. Lakukan backup database terpisah untuk pemulihan lengkap.

Antrean menampilkan maksimal 2.000 pendaftaran terbaru. Untuk skala lebih besar tambahkan pagination dan backup terjadwal. Tidak ada OTP WhatsApp; pengelola tetap perlu memeriksa kebenaran identitas dan dukungan. Pembatasan spam sederhana tidak menggantikan layanan anti-abuse bila formulir ramai diserang.

Jangan commit database, ekspor/cadangan berisi data asli, atau kredensial ke repo publik. .gitignore mengecualikan file environment dan direktori deployment lokal.

Referensi API: [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver), [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js).
