// Menerapkan PageMeta ke <head> di browser (untuk crawler yang menjalankan JavaScript & tab browser).
import { SITE_URL } from './routes.ts';
import type { PageMeta } from './seoMeta.ts';

function upsert(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) { el = create(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}
const meta = (key: 'name' | 'property', val: string, content: string) =>
  upsert(`meta[${key}="${val}"]`, () => { const m = document.createElement('meta'); m.setAttribute(key, val); return m; }, 'content', content);

export function applySeo(m: PageMeta) {
  const url = SITE_URL + (m.path === '/' ? '' : m.path);
  document.title = m.title;
  meta('name', 'description', m.description);
  meta('property', 'og:title', m.title);
  meta('property', 'og:description', m.description);
  meta('property', 'og:url', url);
  meta('property', 'og:type', m.type);
  meta('name', 'twitter:title', m.title);
  meta('name', 'twitter:description', m.description);
  if (m.image) { meta('property', 'og:image', m.image); meta('name', 'twitter:image', m.image); }
  upsert('link[rel="canonical"]', () => { const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l; }, 'href', url);
  const noindex = m.noindex || window.location.pathname.toLowerCase().startsWith('/admin');
  meta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

  let ld = document.getElementById('page-jsonld') as HTMLScriptElement | null;
  if (m.jsonLd && m.jsonLd.length) {
    if (!ld) { ld = document.createElement('script'); ld.id = 'page-jsonld'; ld.type = 'application/ld+json'; document.head.appendChild(ld); }
    ld.textContent = JSON.stringify(m.jsonLd);
  } else if (ld) {
    ld.remove();
  }
}
