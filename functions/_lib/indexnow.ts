// IndexNow: tells Bing, Yandex, Naver, Seznam (and other participating engines) about new/changed URLs within minutes.
// Google does not take part in IndexNow; for Google rely on sitemap.xml (accurate lastmod), internal links and Search Console.
import { articlePathOf, SITE_URL } from '../../src/utils/routes';
import { loadContent } from './content';

// The key is public by design (it is served at /<key>.txt so engines can verify ownership).
// Override with the INDEXNOW_KEY variable in Cloudflare if you prefer your own.
export const DEFAULT_INDEXNOW_KEY = 'be6a51650ffdfd523b0962f7c8a284af';

export function indexNowKey(env: any): string {
  const k = env?.INDEXNOW_KEY;
  return typeof k === 'string' && /^[a-zA-Z0-9-]{8,128}$/.test(k) ? k : DEFAULT_INDEXNOW_KEY;
}

export async function submitIndexNow(env: any, urls: string[]): Promise<{ ok: boolean; status: number }> {
  const list = Array.from(new Set(urls)).filter((u) => u.startsWith(SITE_URL + '/') || u === SITE_URL).slice(0, 500);
  if (!list.length) return { ok: true, status: 0 };
  const key = indexNowKey(env);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE_URL).host, key, keyLocation: `${SITE_URL}/${key}.txt`, urlList: list }),
  });
  return { ok: res.status === 200 || res.status === 202, status: res.status };
}

/**
 * Runs from the Worker's cron trigger. Compares live articles with what was already submitted (stored in KV)
 * and notifies search engines about new or edited ones, including articles whose scheduled time has just arrived.
 */
export async function syncIndexNow(env: any): Promise<{ submitted: number; status: number }> {
  if (!env?.BRIEFZY_KV) return { submitted: 0, status: 0 };
  const { articles, categories } = await loadContent(env);
  let sent: Record<string, string> = {};
  try { sent = JSON.parse((await env.BRIEFZY_KV.get('briefzy:indexnow:sent')) || '{}') || {}; } catch { sent = {}; }

  const changed: string[] = [];
  const next: Record<string, string> = {};
  for (const a of articles) {
    const u = SITE_URL + articlePathOf(a, categories);
    const stamp = a.updatedAt || a.publishDate || '1';
    next[u] = stamp;
    if (sent[u] !== stamp) changed.push(u);
  }
  if (!changed.length) return { submitted: 0, status: 0 };
  const urls = [...changed, SITE_URL + '/', SITE_URL + '/feed.xml'];
  const r = await submitIndexNow(env, urls);
  if (r.ok) await env.BRIEFZY_KV.put('briefzy:indexnow:sent', JSON.stringify(next));
  return { submitted: r.ok ? changed.length : 0, status: r.status };
}
