# Briefzy Studio — Aplikasi Desktop Windows + Publisher Blogspot

Panduan ini menjelaskan cara meng-install **Briefzy Studio** di komputer Windows Anda, menghubungkannya
ke akun Google/Blogger, lalu memublikasikan artikel SEO hasil Article Builder ke **banyak blog Blogspot
sekaligus** (10, 20, 50+ blog) untuk dimonetisasi dengan Google AdSense.

---

## 1. Apa yang Anda dapatkan

| Bagian | Fungsi |
| --- | --- |
| **AI SEO Article Builder** | Menyusun artikel panjang (3.000+ kata), judul, meta description, FAQ, LSI keyword, skor SEO. |
| **Keyword Rank Explorer** | Analisis volume, kesulitan, CPC, dan peluang keyword Tier-1. |
| **Image Optimizer & AI Image Studio** | Kompres/optimalkan gambar dan buat gambar unggulan. |
| **AdSense Hub & Readiness Audit** | Checklist kesiapan AdSense, publisher ID, `ads.txt`, unit iklan. |
| **Blogspot Publisher (baru)** | Satu akun Google → semua blog terdeteksi → kirim artikel ke banyak blog sebagai draft, langsung tayang, atau terjadwal. Pengaturan label & sisipan HTML iklan per blog. |
| Data lokal | Artikel, konfigurasi, dan token Google disimpan di komputer Anda sendiri. |

Aplikasi berjalan **offline-first**: server kecil (localhost) ikut berjalan di dalam aplikasi. Internet hanya
dibutuhkan untuk fitur AI (Gemini) dan publikasi ke Blogspot.

---

## 2. Prasyarat

1. Windows 10/11 64-bit.
2. **Node.js LTS** (versi 20 atau lebih baru) — [nodejs.org](https://nodejs.org) atau:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
   Tutup lalu buka ulang PowerShell setelah install.
3. Koneksi internet (untuk memasang dependensi dan membangun installer, sekali saja).

---

## 3. Membuat installer `.exe` (sekali saja, ±5–10 menit)

Buka **PowerShell** di folder proyek ini, lalu:

```powershell
powershell -ExecutionPolicy Bypass -File desktop\windows\build-installer.ps1
```

Atau manual:

```powershell
npm ci
npm run dist:win
```

Hasilnya ada di folder **`release/`**:

- `Briefzy-Studio-Setup-1.0.0.exe` → installer (shortcut Desktop + Start Menu, bisa pilih folder install).
- `Briefzy-Studio-Portable-1.0.0.exe` → versi portable, langsung jalan tanpa install (bisa dari flashdisk).

Klik dua kali file Setup untuk meng-install. Buka **Briefzy Studio** dari Desktop/Start Menu.

> Catatan: build installer Windows **harus dijalankan di Windows** (butuh `wine` bila di Linux/macOS).
> Repo ini menyertakan konfigurasi `electron-builder` lengkap, jadi perintah di atas langsung menghasilkan `.exe`.

### Menjalankan tanpa membuat installer

Klik dua kali `desktop\windows\run-from-source.cmd`, atau:

```powershell
npm ci
npm run desktop
```

---

## 4. Menyiapkan Google OAuth untuk Blogspot (sekali saja)

Publisher Blogspot memakai **Blogger API v3** resmi Google dengan akun Anda sendiri, jadi tidak ada
password yang disimpan di aplikasi — hanya token OAuth yang bisa Anda cabut kapan saja.

1. Buka <https://console.cloud.google.com> → buat project baru (mis. `Briefzy Studio`).
2. **APIs & Services → Library** → cari **Blogger API v3** → **Enable**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create.
   - Isi App name, email, lalu Save. Pada tahap *Test users*, tambahkan **email Google yang memiliki
     semua blog Blogspot Anda** (selama aplikasi masih berstatus *Testing*, hanya email ini yang bisa login).
   - Untuk pemakaian jangka panjang: **Publish app** (status *In production*). Scope `blogger` adalah scope
     sensitif; Google mungkin meminta verifikasi. Selama masih *Testing*, token tetap berfungsi normal.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Desktop app** → Create. (Tipe ini otomatis mengizinkan loopback `127.0.0.1`.)
   - Jika Anda memilih **Web application**, tambahkan **Authorized redirect URI**:
     ```
     http://127.0.0.1:3000/api/blogger/auth/callback
     ```
     (URI persis ini ditampilkan di dalam aplikasi; jika aplikasi terpaksa memakai port lain karena 3000
     sedang dipakai, salin URI yang tertera di aplikasi.)
5. Salin **Client ID** dan **Client Secret**.
6. (Opsional) Simpan ke `.env` agar tidak perlu mengetik ulang:
   ```
   BLOGGER_CLIENT_ID=...
   BLOGGER_CLIENT_SECRET=...
   ```

---

## 5. Menghubungkan akun & memublikasikan artikel

1. Buka aplikasi → menu **Admin / Studio** → tab **Blogspot Publisher (Multi-Blog)**.
2. Tempel **Client ID** + **Client Secret** → **Simpan kredensial**.
3. Klik **Connect Google** → pilih akun Google → izinkan akses Blogger.
   Browser akan membuka halaman konfirmasi; setelah selesai tutup tab dan kembali ke aplikasi.
4. Semua blog pada akun itu muncul otomatis (nama, URL, jumlah post, ID blog).
   - **Tujuan default**: blog yang otomatis tercentang saat publish.
   - **SEO & iklan**: label tambahan khusus blog tersebut + HTML sebelum/sesudah artikel
     (tempat unit iklan AdSense in-article atau disclosure).
5. Di panel **3. Kirim artikel ke Blogspot**, pilih artikel, pilih mode:
   - **Draft Blogspot** (disarankan) → cek tampilan di Blogspot, baru tayangkan.
   - **Langsung tayang**.
   - **Jadwalkan** → status post menjadi `SCHEDULED` pada waktu yang dipilih.
6. Pilih blog tujuan (bisa banyak sekaligus) → **Kirim**. Hasil per blog (berhasil/gagal + tautan post) tampil
   di bawah, dan tercatat di **Riwayat publikasi**.

Yang ikut terkirim otomatis: judul, isi HTML (rapi dengan box *Key takeaways* dan blok FAQ), label dari
kategori/tag, gambar unggulan (jika berupa URL publik), dan meta description (best-effort; lihat bagian 7).

---

## 6. Antrean publikasi batch (banyak artikel × banyak blog)

Di panel **4. Antrean publikasi batch** Anda bisa menjadwalkan puluhan artikel ke banyak blog sekaligus:

1. Centang **artikel** (bisa “Pilih semua artikel”) dan **blog tujuan**.
2. Tentukan **waktu mulai** dan **jeda (menit)** antar pekerjaan. Contoh: 10 artikel × 3 blog = 30 pekerjaan dengan
   jeda 15 menit → selesai sekitar 7 jam kemudian, tersebar bertahap dan aman terhadap kuota Google.
3. Pilih mode **Draft** atau **Langsung tayang**, lalu **Tambahkan ke antrean**.

Antrean lalu diproses otomatis oleh worker di aplikasi (maksimal 5 pekerjaan per putaran, putaran tiap 20 detik):

- **Status per pekerjaan**: menunggu, diproses, selesai, gagal — lengkap dengan waktu jadwal, jumlah percobaan, dan pesan error dari Google.
- **Jeda antrean** menghentikan sementara pemrosesan tanpa menghapus pekerjaan; **Lanjutkan** meneruskannya.
- **Jalankan sekarang** (▶) memproses satu pekerjaan segera tanpa menunggu jadwal, **Ulangi** (↺) mengirim ulang yang gagal, dan ikon tempat sampah menghapus pekerjaan.
- **Bersihkan yang selesai/gagal** merapikan riwayat antrean.

Catatan penting:

- Antrean **disimpan di komputer** (`blogger-queue.json` di folder data), jadi tidak hilang saat aplikasi ditutup.
  Jika aplikasi tertutup, jadwal yang terlewat akan dikirim saat aplikasi dibuka kembali (satu per satu).
- Antrean **hanya diproses jika akun Google terhubung**. Jika belum/token dicabut, pekerjaan tetap menunggu dan
  pesan error ditampilkan, bukan hilang.
- Batas: 500 pekerjaan aktif, maksimal 100 artikel dan 100 blog per batch. Jeda 0–1440 menit.
- Isi artikel **disimpan sebagai snapshot** saat masuk antrean. Jika Anda mengedit artikel setelahnya, edit ulang
  pekerjaan di antrean (hapus lalu tambahkan lagi) agar versi terbaru yang terkirim.

## 7. Alur kerja yang disarankan untuk 10+ blog & AdSense

1. **Satu niche per blog.** Google menilai relevansi per domain; blog campur-campur sulit mendapat CPC tinggi.
2. **Buat artikel di Article Builder**, cek skor SEO + Readiness Audit, lalu kirim sebagai **draft**.
3. **Cek di Blogspot**: tema, kecepatan, gambar, dan penempatan iklan. Baru klik *Publish*.
4. **Jangan kirim artikel identik ke banyak blog sekaligus tanpa pembeda.** Itu duplikasi konten dan bisa
   menurunkan peringkat serta memicu penolakan AdSense. Pilih salah satu:
   - fokus 1 blog utama per artikel, atau
   - variasikan judul/angle/beberapa paragraf pembuka per blog, atau
   - gunakan mode draft pada blog sekunder sebagai stok, terbitkan setelah diedit.
5. **AdSense dipasang di level tema Blogspot**, bukan per post:
   Blogger → **Earnings/Monetize** → hubungkan akun AdSense → aktifkan unit iklan otomatis.
   Untuk custom domain, unggah `ads.txt` lewat **Settings → Monetization → Custom ads.txt**
   (`google.com, pub-XXXXXXXX, DIRECT, f08c47fec0942fa0`).
6. Gunakan **HTML sebelum/sesudah artikel** per blog hanya untuk unit iklan yang memang harus di dalam body.
7. Jaga konsistensi: minimal 20–30 artikel berkualitas per blog, halaman About/Contact/Privacy, lalu ajukan AdSense.

---

## 8. Catatan teknis & batasan yang perlu diketahui

- **Meta description Blogspot**: Blogger menyimpan *Search Description* pada field `customMetaData` yang kini
  berstatus **deprecated** di API v3. Aplikasi mengirimkannya lebih dulu dan otomatis mengulang tanpa field itu
  bila Google menolak. Jika deskripsi tidak muncul di Blogspot, isi manual di panel post (Post settings →
  Search description). Isi artikel tetap SEO-friendly.
- **Kuota API**: Blogger API v3 punya kuota harian per project Google Cloud. Aplikasi mengirim berurutan dengan
  jeda kecil dan menampilkan pesan error dari Google apa adanya jika kuota habis.
- **Gambar lokal** (`/img/...` dari Briefzy atau data-URL) tidak bisa dipakai Blogspot. Pakai URL publik
  agar gambar ikut terkirim; aplikasi menampilkan peringatan bila gambar bukan URL publik.
- **Label**: maksimal 20 per post (batas Blogger). Label berlebih otomatis dipotong.
- **Token disimpan lokal** di `%APPDATA%\Briefzy Studio\data\blogger.json` dengan permission terbatas.
  Jangan bagikan file itu. Untuk memutus akses: tombol **Disconnect** di aplikasi atau cabut di
  <https://myaccount.google.com/permissions>.
- Data artikel/studio ada di `%APPDATA%\Briefzy Studio\data\content.json`. Backup folder `data` secara berkala.
- **Port**: aplikasi memakai `http://127.0.0.1:3000`. Jika port itu terpakai program lain, aplikasi otomatis
  pindah ke port berikutnya dan menampilkan redirect URI yang benar — daftarkan URI tersebut di Google Console.

---

## 9. Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| `redirect_uri_mismatch` | URI di Google Console tidak sama persis. Salin dari aplikasi (termasuk port). Untuk OAuth client tipe Web application, tambahkan URI tersebut. |
| `Access blocked: app has not completed verification` | Tambahkan email Anda sebagai **Test user** di OAuth consent screen, atau Publish app. |
| `invalid_grant` | Token dicabut/kedaluwarsa → klik **Disconnect** lalu **Connect Google** lagi. |
| Daftar blog kosong | Pastikan akun Google yang dipilih adalah pemilik blog (bukan hanya pembaca), lalu **Refresh**. |
| `403` saat publish | Blogger API v3 belum diaktifkan, atau akun bukan admin blog tersebut. |
| Build installer gagal di Windows | Pastikan Node.js ≥ 20 dan `npm ci` selesai tanpa error. Jalankan PowerShell sebagai user biasa (bukan admin) di folder proyek. Antivirus kadang memblokir `electron-builder`; tambahkan folder proyek ke pengecualian. |
| Aplikasi blank/putih | Jalankan `npm run build:desktop` lalu buka lagi. Untuk diagnosa: menu **Tampilan → Developer Tools**. |

---

## 11. Build installer otomatis di GitHub (tanpa Node.js di komputer Anda)

Repo ini punya workflow **Build Windows installer** (`.github/workflows/build-windows.yml`). Cocok jika Anda tidak ingin
memasang Node.js atau menjalankan build di komputer sendiri.

**Cara manual (paling mudah):**

1. Buka repo di GitHub → tab **Actions** → pilih **Build Windows installer** → **Run workflow**.
2. (Opsional) isi kolom `release_tag`, mis. `v1.0.0`, agar installer langsung diunggah ke **Releases**.
3. Tunggu ±5–10 menit. Setelah hijau, unduh installer dari:
   - **Artifacts** di halaman run → `Briefzy-Studio-1.0.0-Windows-x64` (berisi Setup + Portable), atau
   - tab **Releases** bila Anda mengisi `release_tag`.

**Cara otomatis lewat tag rilis:**

```bash
git tag v1.0.0
git push origin v1.0.0
```

Workflow langsung membuat `Briefzy-Studio-Setup-1.0.0.exe` dan `Briefzy-Studio-Portable-1.0.0.exe`, lalu
menerbitkannya sebagai GitHub Release. Naikkan versi di `package.json` sebelum membuat tag berikutnya.

Catatan: artifact disimpan 30 hari. Installer ini belum ditandatangani secara digital, jadi Windows SmartScreen
tetap bisa menampilkan peringatan (More info → Run anyway). Untuk menghilangkannya, tambahkan sertifikat code
signing sebagai secret dan aktifkan signing di konfigurasi `build.win`.

## 10. Perintah penting

```bash
npm run dev            # mode pengembangan di browser (http://localhost:3000)
npm run build:desktop  # build frontend + bundel server untuk desktop
npm run desktop        # jalankan aplikasi Electron dari source
npm run dist:win       # buat installer + portable .exe Windows
npm run lint           # typecheck TypeScript
```
