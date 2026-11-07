// Render HTML di edge: menyisipkan meta SEO + konten yang bisa dibaca crawler tanpa JavaScript.
import type { Article, CategoryItem } from '../../src/types';
import { SITE_URL, PAGE_SLUGS, articlePathOf, categoryPathOf, type PageKey } from '../../src/utils/routes';
import type { PageMeta } from '../../src/utils/seoMeta';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stripScripts = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/ on\w+="[^"]*"/gi, '');
const isHttp = (s?: string) => !!s && /^https?:\/\//i.test(s);

const WRAP = 'style="max-width:48rem;margin:0 auto;padding:1.5rem;font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.65"';

const link = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`;

function articleList(list: Article[], cats: CategoryItem[]) {
  return `<ul>${list
    .map((a) => `<li>${link(articlePathOf(a, cats), a.title)} — ${esc(a.metaDescription || '')}</li>`)
    .join('')}</ul>`;
}

function footerNav(cats: CategoryItem[]) {
  const pages = (Object.keys(PAGE_SLUGS) as PageKey[]).map((k) => link('/' + PAGE_SLUGS[k], PAGE_SLUGS[k].replace(/-/g, ' ')));
  return `<nav aria-label="Site">${link('/', 'Home')} · ${cats.map((c) => link('/' + c.slug, c.name)).join(' · ')} · ${pages.join(' · ')}</nav>`;
}

export function fallbackArticle(a: Article, all: Article[], cats: CategoryItem[]): string {
  const related = all.filter((x) => x.id !== a.id && x.category === a.category).slice(0, 5);
  const faqs = (a.faqs || []).map((f) => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join('');
  return `<main ${WRAP}>
<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link(categoryPathOf(a.category, cats), a.category)} › ${esc(a.title)}</nav>
<article>
<h1>${esc(a.title)}</h1>
<p><em>${esc(a.author?.name || '')} · ${esc(a.publishDate || '')} · ${esc(a.readingTime || '')}</em></p>
${isHttp(a.featuredImage) ? `<img src="${esc(a.featuredImage)}" alt="${esc(a.imageAlt || a.title)}" style="max-width:100%;height:auto">` : ''}
${a.keyTakeaways?.length ? `<h2>Key takeaways</h2><ul>${a.keyTakeaways.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}
${stripScripts(a.content || '')}
${faqs ? `<h2>FAQ</h2>${faqs}` : ''}
</article>
${related.length ? `<h2>Related articles</h2>${articleList(related, cats)}` : ''}
${footerNav(cats)}
</main>`;
}

export function fallbackHome(all: Article[], cats: CategoryItem[]): string {
  return `<main ${WRAP}>
<h1>Briefzy – Practical Guides on AI Tools, Online Security &amp; Remote Work</h1>
<p>Practical, plain-English guides on AI tools, online privacy and security, everyday tech, and remote work.</p>
<h2>Latest articles</h2>${articleList(all.slice(0, 30), cats)}
${footerNav(cats)}
</main>`;
}

export function fallbackCategory(cat: CategoryItem, all: Article[], cats: CategoryItem[]): string {
  const list = all.filter((a) => a.category === cat.name);
  return `<main ${WRAP}>
<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${esc(cat.name)}</nav>
<h1>${esc(cat.name)}</h1><p>${esc(cat.description || '')}</p>
${list.length ? articleList(list, cats) : '<p>No articles yet.</p>'}
${footerNav(cats)}
</main>`;
}

export function fallbackPage(title: string, description: string, cats: CategoryItem[]): string {
  return `<main ${WRAP}><h1>${esc(title)}</h1><p>${esc(description)}</p>${footerNav(cats)}</main>`;
}

// Mengganti tag meta di index.html dengan versi spesifik halaman.
export function injectIntoHtml(html: string, m: PageMeta, fallback: string, beaconToken?: string): string {
  const url = SITE_URL + (m.path === '/' ? '' : m.path);
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/i, '')
    .replace(/<meta\s+property="og:(?:title|description|url|type)"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:(?:title|description)"[^>]*>/gi, '');
  if (m.noindex) out = out.replace(/<meta\s+name="robots"[^>]*>/i, '<meta name="robots" content="noindex, nofollow" />');

  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:type" content="${m.type}" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    ...(m.image ? [`<meta property="og:image" content="${esc(m.image)}" />`, `<meta name="twitter:image" content="${esc(m.image)}" />`] : []),
    // Cloudflare Web Analytics (aktif bila secret CF_BEACON_TOKEN diisi). spa:true agar pindah halaman tercatat.
    ...(beaconToken && /^[a-zA-Z0-9]{16,64}$/.test(beaconToken)
      ? [`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${beaconToken}","spa":true}'></script>`]
      : []),
    ...(m.jsonLd?.length
      ? [`<script type="application/ld+json" id="page-jsonld">${JSON.stringify(m.jsonLd).replace(/</g, '\\u003c')}</script>`]
      : []),
  ].join('\n    ');

  return out.replace('</head>', `    ${tags}\n  </head>`).replace('<div id="root"></div>', `<div id="root">${fallback}</div>`);
}

export function sitemapXml(all: Article[], cats: CategoryItem[]): string {
  const day = new Date().toISOString().slice(0, 10);
  const url = (loc: string, freq: string, prio: string, lastmod = day) =>
    `  <url>\n    <loc>${esc(SITE_URL + loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>`;
  const lastmodOf = (a: Article) => (a.publishDate && !isNaN(Date.parse(a.publishDate)) ? new Date(a.publishDate).toISOString().slice(0, 10) : day);
  const parts = [
    url('/', 'daily', '1.0'),
    ...cats.map((c) => url('/' + c.slug, 'daily', '0.8')),
    ...all.map((a) => url(articlePathOf(a, cats), 'weekly', '0.9', lastmodOf(a))),
    ...(Object.keys(PAGE_SLUGS) as PageKey[]).map((k) => url('/' + PAGE_SLUGS[k], 'monthly', '0.5')),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts.join('\n')}\n</urlset>\n`;
}
