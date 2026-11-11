<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Briefzy Studio — Desktop (Windows) + Blogspot Publisher

Aplikasi ini bisa dipasang sebagai aplikasi desktop Windows dan memublikasikan artikel SEO langsung ke
banyak blog Blogspot. Panduan lengkap: **[DESKTOP-WINDOWS.md](DESKTOP-WINDOWS.md)**.

```powershell
npm ci
npm run dist:win   # menghasilkan installer .exe di folder release/
```

Tanpa Node.js di komputer: buka tab **Actions** di repo GitHub, jalankan workflow **Build Windows installer**,
lalu unduh installer dari artifact/release. Detail: bagian 11 di panduan.

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ff784c24-8896-487f-9d29-2994071e9015

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
