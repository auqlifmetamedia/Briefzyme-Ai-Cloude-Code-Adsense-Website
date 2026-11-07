# Deploy Briefzy ke Cloudflare Pages via GitHub

Frontend (React) = file statis di `dist/`. Backend `/api/*`, halaman ber-SEO, dan sitemap dijalankan oleh satu Cloudflare Worker (`worker/index.ts`, memakai kode di `functions/_lib/`).
Artikel, kategori, dan tim disimpan di **Cloudflare KV**, jadi artikel yang Anda terbitkan di dashboard langsung tampil untuk semua pengunjung dan Google.

## Format URL
- Artikel: `https://briefzy.me/{slug-kategori}/{slug-artikel}` (contoh `/technology/autonomous-ai-agents-enterprise-adoption-2026`)
- Kategori: `https://briefzy.me/{slug-kategori}`
- Halaman: `/about-us`, `/contact-us`, `/privacy-policy`, `/terms-of-service`, `/dmca`
- Sitemap otomatis: `https://briefzy.me/sitemap.xml` (selalu mengikuti artikel terbaru)
- Slug kategori tidak boleh: `admin`, `api`, `about-us`, dan nama halaman di atas.

## 1. Push ke GitHub
1. Buat repo **private** kosong di github.com.
2. **Gunakan perintah git di bawah, jangan upload lewat drag-and-drop di web GitHub** (cara itu sering melewatkan folder seperti `functions/` dan `scripts/`, dan build akan gagal atau API tidak aktif). Di folder proyek:
   ```bash
   git init
   git add .
   git commit -m "Briefzy: siap Cloudflare Pages"
   git branch -M main
   git remote add origin https://github.com/USERNAME/briefzy.git
   git push -u origin main
   ```

## 2. Hubungkan repo ke Cloudflare (Workers & Pages)
1. dash.cloudflare.com -> **Workers & Pages** -> **Create** -> **Import a repository** (Connect to Git) -> pilih repo.
2. Isi pengaturan build:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy` (bawaan, jangan diubah)
3. **Nama proyek/Worker harus sama dengan baris `name = "..."` di `wrangler.toml`** (bawaan: `briefzy`). Jika nama Worker Anda berbeda, edit baris `name` di `wrangler.toml` agar sama, lalu commit.
4. **Save and Deploy**. Situs aktif di `namaworker.akun.workers.dev`.

Penyimpanan artikel (KV `BRIEFZY_KV`) dibuat otomatis oleh Wrangler saat deploy pertama. Jika muncul error soal KV, buat manual: **Storage & Databases -> KV -> Create**, salin ID-nya, lalu tambahkan baris `id = "ID_ANDA"` di bawah `binding = "BRIEFZY_KV"` pada `wrangler.toml`.

## 3. Pasang secret (WAJIB)
Worker -> **Settings** -> **Variables and Secrets** -> **Add** (type **Secret**):

| Name | Isi |
|---|---|
| `ADMIN_TOKEN` | Kata sandi admin buatan Anda, minimal 24 karakter acak. Simpan di password manager |
| `CF_BEACON_TOKEN` | Token Cloudflare Web Analytics (opsional, lihat bagian Analytics di bawah) |
| `GEMINI_API_KEY` | Key dari https://aistudio.google.com/apikey (opsional; tanpa ini fitur AI pakai template bawaan) |

Tanpa `ADMIN_TOKEN`, semua fitur admin sengaja **ditolak** (aman secara default). Secret langsung berlaku tanpa deploy ulang.

## 4. Pasang domain
Worker -> **Settings** -> **Domains & Routes** -> **Add** -> **Custom domain** -> `briefzy.me` (dan `www.briefzy.me` bila perlu). Domain harus memakai DNS Cloudflare.

## 6. Cek setelah live
- `https://briefzy.me/` dan salah satu URL artikel terbuka
- `https://briefzy.me/api/health` -> `geminiEnabled` sesuai harapan
- `https://briefzy.me/sitemap.xml` berisi URL `/kategori/slug-artikel`
- `https://briefzy.me/ads.txt` dan `/robots.txt` terbuka
- URL yang tidak ada (mis. `/technology/ngawur`) menghasilkan 404 sungguhan
- Buka `https://briefzy.me/admin` -> masukkan `ADMIN_TOKEN` -> dashboard terbuka

## Cara menerbitkan artikel
**Otomatis (AI):** Dashboard -> pilih keyword/judul -> Auto Generate -> periksa -> **Publish**.

**Manual (copy-paste dari Claude):**
1. Minta Claude menulis artikel, lalu salin hasilnya.
2. Dashboard -> form artikel: isi **Judul**, **Kategori**, **Meta description** (140-160 karakter), **Slug**, **Gambar** (URL https) + teks alt, **Key takeaways** (1 per baris).
3. Tempel isi artikel di kolom **Content**. Format **HTML atau Markdown** keduanya bisa; Markdown (judul `##`, daftar, tabel, **tebal**) otomatis diubah ke HTML saat Publish, dan judul `#` diturunkan jadi H2 karena judul artikel sudah jadi H1.
4. FAQ (opsional) format:
   ```
   Q: Pertanyaan pertama?
   A: Jawaban pertama.

   Q: Pertanyaan kedua?
   A: Jawaban kedua.
   ```
5. Klik **Publish**. Indikator "Tersimpan di server" muncul di kiri bawah; artikel langsung punya URL `briefzy.me/kategori/slug`.

Slug dibuat dari judul bila dikosongkan, dan otomatis diberi akhiran `-2`, `-3` bila kembar.

## Hal yang perlu diketahui
- **Login pertama:** konten bawaan (15+ artikel) dan draf yang ada di browser Anda otomatis disalin ke server. Setelah itu server menjadi sumber utama, jadi menghapus artikel di dashboard benar-benar menghapusnya dari situs.
- **Sebelum login pertama,** situs menampilkan konten bawaan.
- **Penundaan kecil:** KV bersifat eventually consistent; perubahan bisa butuh hingga ~60 detik untuk terlihat di semua wilayah.
- **Gambar:** pakai URL https (mis. dari Unsplash atau hosting sendiri). Gambar AI berbentuk data-URI membuat data artikel besar dan tidak dipakai sebagai og:image.
- **Ubah slug artikel lama** akan mengubah URL-nya; URL lama menjadi 404. Hindari setelah artikel terindeks.
- `functions/_lib/api.ts` dihasilkan dari `server.ts` dan ikut di-commit. Bila Anda mengubah `server.ts`, jalankan `npm run sync-api` sebelum commit.
- Pengembangan lokal: `npm run dev` (tanpa `ADMIN_TOKEN`, admin terbuka; data tersimpan di `.data/`). Uji ala Cloudflare: `npx wrangler dev` (setelah `npm run build`) dengan file `.dev.vars` berisi `ADMIN_TOKEN=...` (jangan di-commit).
- Setelan AdSense dari dashboard tidak permanen; ubah `public/ads.txt` langsung.

## Cloudflare Web Analytics (gratis, tanpa cookie)
1. Dashboard Cloudflare -> **Analytics & Logs** -> **Web Analytics** -> **Add a site** -> masukkan `briefzy.me`.
2. Pilih **manual/JS snippet**; dari kode yang tampil, salin nilai `token` (deretan huruf dan angka di `data-cf-beacon`).
3. Tambahkan secret `CF_BEACON_TOKEN` berisi token itu, lalu **Retry deployment**.
4. Situs otomatis menyertakan skrip analytics (termasuk pindah halaman antar-artikel). Data muncul di dashboard dalam beberapa menit.

## Isi situs saat ini (fokus Tier-1, Inggris)
Kategori: Productivity & AI Tools, Online Security, Tech How-To, Remote Work.
Dua puluh tiga artikel awal sudah ada (rata-rata sekitar 1.000 kata). Target sebelum mendaftar AdSense: **25-30 artikel orisinal**, idealnya 1.200+ kata, ditambah pengalaman, tangkapan layar, dan temuan Anda sendiri.
Data palsu (iklan tiruan, penulis berpendidikan fiktif, alamat dan badan hukum karangan, jumlah pembaca, newsletter palsu) sudah dihapus. Ganti "Briefzy Editorial Team" dengan nama penulis asli bila ingin, tanpa gelar yang tidak benar.
Sebelum login admin pertama, hapus data situs lama di browser (localStorage) agar artikel demo lama tidak ikut tersalin ke server.
Pastikan email `editorial@briefzy.me`, `privacy@briefzy.me`, dan `dmca@briefzy.me` benar-benar aktif (Cloudflare Email Routing gratis).

## Jika build atau deploy gagal di Cloudflare
- Error `Missing entry-point to Worker script`: pastikan `wrangler.toml` di repo berisi baris `main = "worker/index.ts"` dan folder `worker/` ada.
- Error soal nama Worker: samakan `name` di `wrangler.toml` dengan nama Worker di dashboard.
- Periksa di GitHub bahwa repo berisi folder `functions/`, `scripts/`, `src/`, `public/`, serta file `wrangler.toml`, `package.json`, `package-lock.json`, `.node-version`. Bila ada yang tidak ada, push ulang dengan perintah git di langkah 1.
- Bila `functions/` tidak ada, situs tampil tetapi `/api`, sitemap, dan login admin tidak berfungsi.
