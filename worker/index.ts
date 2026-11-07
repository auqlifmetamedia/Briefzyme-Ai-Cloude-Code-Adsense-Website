// Entry point Cloudflare Worker (dipakai oleh `npx wrangler deploy`).
// Menggabungkan: API (/api/*), halaman ber-SEO + sitemap, dan file statis dari folder dist.
import { handle as handleApi } from '../functions/_lib/api';
import { onRequest as handlePage } from '../functions/[[path]]';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    // File statis (js, css, gambar, ads.txt, robots.txt, dll). Slug halaman tidak pernah memakai titik.
    const isFile = /\.[a-zA-Z0-9]+$/.test(url.pathname) && url.pathname !== '/sitemap.xml';
    if (url.pathname.startsWith('/assets/') || isFile) {
      return env.ASSETS.fetch(request);
    }

    return handlePage({ request, env });
  },
};
