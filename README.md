# Putra Digital Labs

Website jasa pembuatan website: halaman publik dua bahasa (Indonesia/Inggris), formulir brief dengan kode tiket, pelacakan status proyek, dan dashboard admin untuk mengelola brief, layanan, paket, portofolio, dan artikel.

Susunan proyek:

- `client/` — React 18 + Vite, CSS biasa dengan token desain, ikon Lucide (SVG, tanpa emoji)
- `server/` — Node.js + Express, validasi Zod, akses Firebase Realtime Database lewat `firebase-admin`
- `database.rules.json` — aturan Realtime Database, menutup akses langsung dari browser

## Prasyarat

- Node.js 20 atau lebih baru
- Proyek Firebase dengan Realtime Database aktif
- Service account Firebase (kunci JSON) — hanya untuk server

## 1. Pasang dependensi

```
npm run install:all
```

## 2. Siapkan Firebase

1. Buka Firebase Console → **Build → Realtime Database**, buat database bila belum ada.
2. Salin URL database (bentuknya `https://<project>-default-rtdb.<region>.firebasedatabase.app`).
3. Buka **Project settings → Service accounts → Generate new private key**. Simpan file JSON-nya di luar repositori, misalnya `D:\kunci\serviceAccountKey.json`.
4. Di tab **Rules**, tempel isi `database.rules.json` lalu publikasikan.

Aturan itu menolak semua baca dan tulis dari browser. Datanya hanya bisa diakses server memakai service account, sehingga alamat brief dan nomor telepon pelanggan tidak bisa diambil orang lain meski konfigurasi web Firebase bocor.

## 3. Isi `server/.env`

```
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
FIREBASE_DATABASE_URL=https://<project>-default-rtdb.<region>.firebasedatabase.app
GOOGLE_APPLICATION_CREDENTIALS=D:\kunci\serviceAccountKey.json
ADMIN_EMAIL=email@anda.com
ADMIN_PASSWORD=sandi-panel-yang-kuat
JWT_SECRET=<string-acak-panjang>
```

- `FIREBASE_SERVICE_ACCOUNT_JSON` bisa dipakai sebagai ganti `GOOGLE_APPLICATION_CREDENTIALS` bila ingin menempelkan isi JSON-nya langsung. Pilih salah satu.
- Buat `JWT_SECRET` dengan `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- Jangan pernah commit file `.env` atau kunci service account. `.gitignore` sudah menutup keduanya.

Untuk sandi yang tersimpan sebagai hash, jalankan:

```
node -e "console.log(require('bcryptjs').hashSync('sandi-anda', 10))"
```

lalu isi hasilnya ke `ADMIN_PASSWORD_HASH` dan kosongkan `ADMIN_PASSWORD`.

## 4. Isi data awal

```
npm run seed
```

Perintah itu menulis enam layanan dan tiga paket beserta versi Bahasa Indonesia dan Inggrisnya. Harga paket sengaja dibiarkan kosong; isi dari dashboard agar halaman paket menampilkan angka. Selama dikosongkan, halaman menampilkan ajakan minta penawaran.

Untuk menimpa data yang sudah ada tambahkan `--force`, dan untuk menambah satu contoh portofolio tambahkan `--with-sample`:

```
npm --prefix server run seed -- --force --with-sample
```

Contoh portofolio itu tersimpan sebagai draf dan wajib diganti dengan proyek nyata sebelum website dipublikasikan.

## 5. Jalankan

Dua terminal:

```
npm run dev:server
npm run dev:client
```

- API: http://localhost:4000
- Website: http://localhost:5173
- Dashboard: http://localhost:5173/admin

Vite meneruskan permintaan `/api` ke port 4000, jadi saat pengembangan tidak ada setelan CORS tambahan.

## Perintah lain

```
npm run build          # build frontend ke client/dist
npm start              # jalankan server tanpa watch
```

## Kontak di footer

Footer membaca `client/.env.example` yang disalin menjadi `client/.env.local`. Isi bagian yang relevan:

```
VITE_CONTACT_EMAIL=
VITE_CONTACT_PHONE=
VITE_WHATSAPP=
VITE_ADDRESS=
```

Bagian yang kosong tidak ditampilkan, jadi footer tidak pernah memuat nomor atau alamat karangan.

## Menayangkan ke produksi

1. `npm run build`
2. Isi `CLIENT_DIST=../client/dist` pada `server/.env` supaya Express melayani berkas hasil build sekaligus API-nya.
3. Jalankan `npm start` di balik reverse proxy (Nginx, Caddy) yang menangani HTTPS.

Header keamanan diatur oleh `helmet` di `server/src/index.js`, termasuk Content Security Policy yang mengizinkan Google Fonts dan menolak penyematan di iframe.

## Alur data

```
public/services          layanan (dua bahasa)
public/packages          paket dan harga
public/portfolio         studi kasus
public/articles          artikel
leads/<id>               brief masuk beserta riwayat status
tickets/<KODE>           indeks kode tiket ke id lead
```

Kode tiket dibuat di server (`server/src/ticket.js`) memakai alfabet tanpa karakter mudah tertukar, lalu dicari ulang lewat indeks `tickets/` sehingga pelacakan tidak perlu memindai seluruh lead.

## Endpoint

Publik:

- `GET /api/public/services`, `/packages`, `/portfolio`, `/portfolio/:slug`, `/articles`, `/articles/:slug`
- `POST /api/public/leads` — dibatasi 8 pengiriman per 15 menit per IP
- `GET /api/public/track/:code` — hanya mengembalikan status, jenis proyek, dan riwayat; data pribadi tidak ikut
- `GET /api/health`

Admin (butuh `Authorization: Bearer <token>`):

- `POST /api/admin/login` — dibatasi 10 percobaan per 15 menit
- `GET /api/admin/session`, `/overview`, `/leads`, `/leads/:id`
- `PATCH /api/admin/leads/:id` — ubah status, catatan internal, dan catatan riwayat
- `GET|POST|PATCH|DELETE /api/admin/content/:collection` dengan `collection` salah satu dari `services`, `packages`, `portfolio`, `articles`

## Yang belum dikerjakan

- Notifikasi email saat brief masuk. Server belum punya kredensial SMTP; kirim lewat penyedia seperti Resend atau SMTP Google bila diperlukan.
- Unggah berkas untuk gambar portofolio dan artikel. Saat ini `coverImage` diisi URL gambar.
- Uji otomatis. Belum ada test runner di proyek ini.
