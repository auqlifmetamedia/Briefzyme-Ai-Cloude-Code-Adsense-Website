// Entry point Cloudflare Worker (dipakai oleh `npx wrangler deploy`).
// Menggabungkan: API (/api/*), halaman ber-SEO + sitemap, dan file statis dari folder dist.
import { handle as handleApi } from '../functions/_lib/api';
import { onRequest as handlePage } from '../functions/[[path]]';
import { indexNowKey, syncIndexNow } from '../functions/_lib/indexnow';

// Gambar unggahan: diambil dari KV, di-cache lama di edge Cloudflare.
async function serveImage(request: Request, env: any, ctx?: any): Promise<Response> {
  const id = url_id(request);
  if (!id || !env.BRIEFZY_KV) return new Response('Not found', { status: 404 });
  const cache = (globalThis as any).caches?.default;
  const cached = cache ? await cache.match(request) : null;
  if (cached) return cached;
  const raw = await env.BRIEFZY_KV.get('briefzy:img:' + id);
  if (!raw) return new Response('Not found', { status: 404 });
  const { t, d } = JSON.parse(raw);
  const bin = atob(d);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const res = new Response(bytes, {
    headers: {
      'Content-Type': t,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
  if (cache && ctx?.waitUntil) ctx.waitUntil(cache.put(request, res.clone()));
  return res;
}

function url_id(request: Request): string | null {
  const name = new URL(request.url).pathname.slice('/img/'.length).split('.')[0];
  return /^[a-f0-9]{16}$/.test(name) ? name : null;
}

export default {
  async fetch(request: Request, env: any, ctx?: any): Promise<Response> {
    const url = new URL(request.url);

    // IndexNow ownership file: https://briefzy.me/<key>.txt contains the key itself
    const key = indexNowKey(env);
    if (url.pathname === `/${key}.txt`) {
      return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }

    if (url.pathname.startsWith('/img/')) {
      return serveImage(request, env, ctx);
    }

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    // File statis (js, css, gambar, ads.txt, robots.txt, dll). Slug halaman tidak pernah memakai titik.
    const isFile = /\.[a-zA-Z0-9]+$/.test(url.pathname) && !['/sitemap.xml', '/feed.xml', '/rss.xml', '/llms.txt'].includes(url.pathname);
    if (url.pathname.startsWith('/assets/') || isFile) {
      return env.ASSETS.fetch(request);
    }

    return handlePage({ request, env });
  },

  // Cron trigger (see wrangler.toml): pings IndexNow for new, edited or just-published scheduled articles.
  async scheduled(_event: any, env: any, ctx: any) {
    ctx.waitUntil(syncIndexNow(env).catch((e) => console.error('IndexNow sync failed:', e)));
  },
};
