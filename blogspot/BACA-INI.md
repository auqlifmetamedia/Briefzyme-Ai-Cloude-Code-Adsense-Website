# Tema Blogspot “Briefzy” — Panduan Pasang & Atur

Tema ini meniru tampilan **briefzy.me**: font *Space Grotesk* + *Plus Jakarta Sans*, palet slate/indigo/cyan
dengan aksen amber, hero besar, kartu artikel bersudut 24px, sidebar “Popular Stories” bernomor, dark mode,
progress bar bacaan, dan tipografi artikel yang sama (judul dengan garis gradasi, link indigo, callout, tabel).

File tema: **`briefzy-theme.xml`**

---

## 1. Pasang tema (2 menit)

1. Buka **Blogger → Tema** (Theme).
2. Klik ikon **⋮ (titik tiga)** di samping tema aktif → **Cadangkan / Backup** dulu (wajib, agar bisa kembali).
3. Klik **⋮ → Pulihkan / Restore** → **Unggah / Upload** → pilih `briefzy-theme.xml`.
4. Setelah terpasang, klik **Pratinjau (Preview)** → **Lihat blog** untuk mengecek.
5. Jika tampilan berantakan, klik **⋮ → Pulihkan** dan unggah file backup tadi. Tidak ada data yang hilang.

Tema ini **responsif** (desktop, tablet, HP) dan sudah mendukung **dark mode** otomatis mengikuti setelan
sistem/perangkat pembaca, plus tombol ganti tema di header.

---

## 2. Atur menu kategori (penting)

Menu di header memakai widget **LinkList** (“Menu Kategori”). Bawaannya berisi contoh:

| Label | URL |
| --- | --- |
| All | `/` |
| Productivity & AI Tools | `/search/label/Productivity%20%26%20AI%20Tools` |
| Online Security | `/search/label/Online%20Security` |
| Tech How-To | `/search/label/Tech%20How-To` |
| Remote Work | `/search/label/Remote%20Work` |

Cara mengubah: **Tata Letak (Layout)** → bagian header, klik widget **Menu Kategori** → ganti teks & tautan.
URL label harus sama persis dengan label post Anda (spasi jadi `%20`, `&` jadi `%26`).
Tombol pertama otomatis bergaya gradasi (dianggap “All”). Hapus/geser jika ingin kategori lain di depan.

---

## 3. Tata letak & widget

Struktur section (bisa ditambah/diubah dari **Tata Letak**):

- **header** — logo & wordmark Briefzy (Header widget, terkunci).
- **nav** — Menu Kategori (LinkList, maks 2 widget).
- **ad-top** — iklan header (HTML, 1 widget).
- **main** — daftar artikel / halaman artikel (Blog widget, terkunci).
- **sidebar** — iklan sidebar, Popular Stories, Focus Topics (Label), dan kartu newsletter.
- **ad-bottom** — iklan bawah artikel.
- **footer-attribution** — atribusi Blogger (boleh dibiarkan).

Cara menambah iklan/newsletter: **Tata Letak → Tambahkan Gadget (Add a Gadget) → HTML/JavaScript**,
lalu tempel kode dari AdSense/penyedia lain. Tema sudah menata tampilannya otomatis.

### Popular Stories
Widget **PopularPosts** dibuat khusus: bernomor 01–05 dengan lencana emas untuk peringkat 1.
Atur jumlahnya di widget → *Number of posts to show* (bawaan 5) dan rentang waktu (bawaan *All time*).

---

## 4. Halaman wajib untuk AdSense

Buat 5 halaman statis di **Halaman (Pages) → Halaman baru**, lalu sesuaikan tautan footer
(bagian *Governance*) bila URL-nya berbeda:

| Halaman | URL bawaan tema |
| --- | --- |
| About Us | `/p/about-us.html` |
| Contact Us | `/p/contact-us.html` |
| Privacy Policy | `/p/privacy-policy.html` |
| Terms of Service | `/p/terms-of-service.html` |
| DMCA | `/p/dmca.html` |

Isi minimal: siapa Anda, cara menghubungi, kebijakan privasi yang menyebut **cookie & Google AdSense**,
syarat penggunaan, dan kebijakan hak cipta. Tanpa halaman ini pengajuan AdSense hampir pasti ditolak.

---

## 5. AdSense di Blogspot

1. **Monetize/Earnings → hubungkan akun AdSense** di Blogger (paling stabil untuk blogspot.com).
2. Setelah disetujui, aktifkan **iklan otomatis (Auto ads)** dari dasbor AdSense, atau
   tempel unit iklan manual di gadget **ad-top / sidebar / ad-bottom**.
3. Untuk **custom domain**, unggah `ads.txt` lewat **Setelan → Monetisasi → ads.txt kustom**:
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
4. Jangan menaruh lebih dari ±3 unit iklan per halaman; jaga jarak iklan dari judul dan tombol.
5. Jangan menempel iklan di dalam body post secara berulang (melanggar kebijakan). Gunakan gadget di atas.

Catatan: untuk blog `*.blogspot.com`, AdSense milik akun Blogger yang sama biasanya sudah terhubung otomatis.

---

## 6. SEO yang sudah aktif

- `<b:include data='blog' name='all-head-content'/>` → title, meta description, canonical, dan feed Blogger.
- Open Graph (`og:title`, `og:description`, `og:url`) + `twitter:card`.
- Judul artikel `h1`, subjudul konten `h2/h3`, breadcrumb Home / Label / Post.
- Gambar unggulan sebagai hero (lazy/eager sesuai halaman) dengan `alt` dari judul.
- Tautan label (`rel='tag'`), pencarian bawaan Blogger (`/search?q=`), dan pager Newer/Older.
- **Isi Search Description tiap post** (sidebar post → *Search description*) karena Blogger mengabaikannya
  kalau kosong; tema hanya menampilkan ringkasan otomatis.

Yang **tidak** sama dengan briefzy.me (karena keterbatasan platform Blogger): AI companion pembaca,
terjemahan multi-bahasa otomatis, newsletter server-side, dan komentar kustom. Semuanya opsional untuk AdSense.

---

## 7. Kustomisasi cepat (warna, font, lebar)

Buka **Tema → ⋮ → Edit HTML**, cari blok `<b:skin>` lalu ubah variabel di bagian `:root`:

```css
--bz-brand:#4f46e5;      /* indigo utama  */
--bz-cyan:#06b6d4;       /* cyan aksen    */
--bz-amber:#f59e0b;      /* amber highlight */
--bz-bg:#f8fafc;         /* latar terang  */
--bz-radius:24px;        /* sudut kartu   */
--bz-wrap:1240px;        /* lebar maksimum */
```

Mode gelap memakai blok `html.dark{...}` tepat di bawahnya. Font bisa diganti pada `--bz-font-body`
dan `--bz-font-head` (sertakan link Google Fonts di `<head>`).

**Jangan** mengubah bagian `<b:section>`, `<b:widget>`, atau tag `<b:...>` lain kecuali Anda paham XML Blogger.

---

## 8. Untuk 10+ blog

- Unggah `briefzy-theme.xml` yang sama ke setiap blog, lalu sesuaikan **Menu Kategori** dan **footer**
  (halaman statis tiap blog punya URL sendiri).
- Simpan satu blog sebagai “master” untuk eksperimen desain; setelah puas, unduh temanya
  (**Tema → ⋮ → Cadangkan**) dan unggah ke blog lain.
- Jangan menaruh kode AdSense milik akun berbeda di satu blog tanpa hak akses; setiap blog harus terhubung
  ke akun AdSense yang sah.
- Artikel bisa dikirim dari **Briefzy Studio → Blogspot Publisher**, lalu dirapikan di Blogger.

---

## 9. Troubleshooting

| Gejala | Solusi |
| --- | --- |
| Unggah tema gagal / “We’re sorry…” | Pastikan tidak ada karakter `&` mentah di HTML. Unggah ulang file apa adanya (jangan diedit di Word). |
| Tampilan tanpa CSS | Widget `<b:skin>` terhapus saat edit. Pulihkan dari backup, edit hanya di dalam `<b:skin>`. |
| Menu tidak muncul | Widget LinkList kosong atau dihapus. Tambahkan **Link List** di section `nav`. |
| Popular Stories kosong | Widget butuh data kunjungan; tunggu beberapa hari atau isi manual lewat HTML. |
| Gambar hero tidak tampil | Post belum punya gambar, atau gambar di-host dengan hotlink protection. Gunakan gambar dari Blogger sendiri. |
| Dark mode “nyangkut” | Hapus localStorage browser, atau klik tombol tema dua kali. |
| Iklan tidak muncul | AdSense belum disetujui, atau unit iklan belum ditempel di gadget. Cek juga AdBlock. |
