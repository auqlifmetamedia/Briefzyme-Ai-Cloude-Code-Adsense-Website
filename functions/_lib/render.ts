// Render HTML di edge: menyisipkan meta SEO + konten yang bisa dibaca crawler tanpa JavaScript.
import type { Article, CategoryItem } from '../../src/types';
import { SITE_URL, PAGE_SLUGS, articlePathOf, categoryPathOf, type PageKey } from '../../src/utils/routes';
import type { PageMeta } from '../../src/utils/seoMeta';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stripScripts = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/ on\w+="[^"]*"/gi, '');
const isHttp = (s?: string) => !!s && (/^https?:\/\//i.test(s) || s.startsWith('/img/'));

const WRAP = 'style="max-width:48rem;margin:0 auto;padding:1.5rem;font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.7"';
// Shown only until the app loads (and to crawlers that do not run JavaScript): Briefzy link colour + basic structure.
const FALLBACK_CSS = '<style>main a{color:#4f46e5;font-weight:600;text-decoration:underline;text-decoration-color:#22d3ee;text-underline-offset:3px}main a:hover{color:#0891b2}main h2{margin-top:2em}main img{max-width:100%;height:auto;border-radius:12px}main table{border-collapse:collapse;width:100%}main td,main th{border:1px solid #e2e8f0;padding:.5em}main blockquote{border-left:4px solid #4f46e5;margin:1.5em 0;padding:.5em 1em;background:#f8fafc}</style>';
const isoDate = (s?: string) => (s && !isNaN(Date.parse(s)) ? new Date(s).toISOString() : '');

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
  const pub = isoDate(a.publishDate);
  const mod = isoDate(a.updatedAt);
  return `${FALLBACK_CSS}<main ${WRAP}>
<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link(categoryPathOf(a.category, cats), a.category)} › ${esc(a.title)}</nav>
<article>
<h1>${esc(a.title)}</h1>
<p><em>${esc(a.author?.name || '')} · ${pub ? `<time datetime="${pub}">${esc(a.publishDate)}</time>` : esc(a.publishDate || '')}${mod && mod.slice(0, 10) !== pub.slice(0, 10) ? ` · Updated <time datetime="${mod}">${esc(mod.slice(0, 10))}</time>` : ''} · ${esc(a.readingTime || '')}</em></p>
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
  const key = title.toLowerCase().replace(/\s*\|\s*briefzy$/i, '').trim();
  const sections: Record<string, string> = {
    'about us': '<h2>What we publish</h2><p>Briefzy publishes practical guides about AI tools, online security, everyday technology, and remote work. Our aim is to explain useful tasks in clear language and help readers make informed decisions.</p><h2>Editorial approach</h2><p>We aim to use primary sources, official product documentation, and reputable references. Articles should distinguish verified facts from opinion, explain important limitations, and be updated when material information changes. AI tools may assist with drafting or research, but editorial review and fact-checking remain necessary.</p><h2>Corrections</h2><p>If you find an error or outdated instruction, contact editorial@briefzy.me with the article URL and the correction you believe is needed.</p>',
    'contact us': '<h2>Editorial and corrections</h2><p><a href="mailto:editorial@briefzy.me">editorial@briefzy.me</a></p><p>For corrections, include the article URL and details of the issue. The website contact form opens your email application; it does not submit messages to a server form.</p>',
    'privacy policy': '<h2>Information and website storage</h2><p>Briefzy may receive standard technical information through its hosting and security infrastructure when pages are requested. The site also uses browser storage for basic site preferences. Do not send sensitive personal information through ordinary email.</p><h2>Advertising</h2><p>Briefzy has applied to Google AdSense and is awaiting site review. Ad-serving code is not currently enabled. If advertising is enabled in the future, Google and its partners may use cookies or similar technologies to provide, measure, and personalise ads as permitted by applicable settings and law. We will update this notice and provide required consent choices before enabling advertising where required.</p><h2>Contact</h2><p>For privacy questions, email <a href="mailto:privacy@briefzy.me">privacy@briefzy.me</a>.</p>',
    'terms of service': '<h2>Use of this website</h2><p>Briefzy provides general information and practical guides. You may read and link to our pages. Do not misuse the website, attempt unauthorised access, interfere with its operation, or republish substantial portions of our work without permission.</p><h2>Accuracy and advice</h2><p>We work to keep information useful and accurate, but products, software, prices, and procedures change. Content is general information, not professional legal, financial, medical, or cybersecurity advice. Verify important decisions with qualified sources.</p><h2>Copyright and contact</h2><p>Unless stated otherwise, original Briefzy text and branding are protected by applicable intellectual property laws. For permissions or concerns, contact editorial@briefzy.me.</p>',
    'dmca & copyright policy': '<h2>Copyright concerns</h2><p>Briefzy respects intellectual property rights. If you believe material on this site infringes your copyright, email <a href="mailto:dmca@briefzy.me">dmca@briefzy.me</a> with the page URL, identification of the copyrighted work, your contact details, and a description of the concern. Include any statements or supporting information required by the law applicable to your claim.</p><p>We will review complete notices and take appropriate action where warranted.</p>'
  };
  return `${FALLBACK_CSS}<main ${WRAP}><h1>${esc(title)}</h1><p>${esc(description)}</p>${sections[key] || ''}${footerNav(cats)}</main>`;
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
    `<meta property="og:site_name" content="Briefzy" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="alternate" type="application/rss+xml" title="Briefzy" href="${SITE_URL}/feed.xml" />`,
    ...(m.type === 'article'
      ? [
          ...(m.published ? [`<meta property="article:published_time" content="${esc(m.published)}" />`] : []),
          ...(m.modified ? [`<meta property="article:modified_time" content="${esc(m.modified)}" />`] : []),
          ...(m.section ? [`<meta property="article:section" content="${esc(m.section)}" />`] : []),
          ...(m.tags || []).map((t) => `<meta property="article:tag" content="${esc(t)}" />`),
        ]
      : []),
    ...(m.image && m.type === 'article' ? [`<link rel="preload" as="image" href="${esc(m.image)}" fetchpriority="high" />`] : []),
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    ...(m.image ? [`<meta property="og:image" content="${esc(m.image)}" />`, `<meta name="twitter:image" content="${esc(m.image)}" />`] : []),
    // Analytics scripts are not injected until consent controls are implemented.
    ...(m.jsonLd?.length
      ? [`<script type="application/ld+json" id="page-jsonld">${JSON.stringify(m.jsonLd).replace(/</g, '\\u003c')}</script>`]
      : []),
  ].join('\n    ');

  return out.replace('</head>', `    ${tags}\n  </head>`).replace('<div id="root"></div>', `<div id="root">${fallback}</div>`);
}

const absImg = (s?: string) => (s && /^https?:\/\//i.test(s) ? s : s && s.startsWith('/img/') ? SITE_URL + s : '');
const ymd = (s?: string) => (s && !isNaN(Date.parse(s)) ? new Date(s).toISOString().slice(0, 10) : '');

export function sitemapXml(all: Article[], cats: CategoryItem[]): string {
  const day = new Date().toISOString().slice(0, 10);
  const newest = (list: Article[]) => list.map((a) => ymd(a.updatedAt) || ymd(a.publishDate)).filter(Boolean).sort().pop() || day;
  const url = (loc: string, lastmod: string, extra = '') =>
    `  <url>\n    <loc>${esc(SITE_URL + loc)}</loc>\n    <lastmod>${lastmod}</lastmod>${extra}\n  </url>`;
  // lastmod = the real last edit (Google uses it to decide when to re-crawl; fake "today" dates make it ignore the field)
  const articleUrl = (a: Article) => {
    const img = absImg(a.featuredImage);
    const extra = img ? `\n    <image:image>\n      <image:loc>${esc(img)}</image:loc>${a.imageAlt ? `\n      <image:title>${esc(a.imageAlt)}</image:title>` : ''}\n    </image:image>` : '';
    return url(articlePathOf(a, cats), ymd(a.updatedAt) || ymd(a.publishDate) || day, extra);
  };
  const parts = [
    url('/', newest(all)),
    ...cats.map((c) => url('/' + c.slug, newest(all.filter((a) => a.category === c.name)))),
    ...all.map(articleUrl),
    ...(Object.keys(PAGE_SLUGS) as PageKey[]).map((k) => url('/' + PAGE_SLUGS[k], '2026-01-01')),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${parts.join('\n')}\n</urlset>\n`;
}

const rfc822 = (s?: string) => (s && !isNaN(Date.parse(s)) ? new Date(s).toUTCString() : new Date().toUTCString());

/** RSS 2.0 feed: lets feed readers, aggregators and crawlers discover new articles within minutes. */
export function rssXml(all: Article[], cats: CategoryItem[]): string {
  const items = [...all]
    .sort((a, b) => Date.parse(b.publishDate) - Date.parse(a.publishDate))
    .slice(0, 50)
    .map((a) => {
      const u = SITE_URL + articlePathOf(a, cats);
      const img = absImg(a.featuredImage);
      return `    <item>\n      <title>${esc(a.title)}</title>\n      <link>${esc(u)}</link>\n      <guid isPermaLink="true">${esc(u)}</guid>\n      <pubDate>${rfc822(a.publishDate)}</pubDate>\n      <category>${esc(a.category)}</category>\n      <description>${esc(a.metaDescription || '')}</description>${img ? `\n      <enclosure url="${esc(img)}" type="image/${/\.png/i.test(img) ? 'png' : /\.webp/i.test(img) ? 'webp' : 'jpeg'}" length="0" />` : ''}\n    </item>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>Briefzy</title>\n    <link>${SITE_URL}/</link>\n    <description>Practical, plain-English guides on AI tools, online security, everyday tech, and remote work.</description>\n    <language>en-us</language>\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />\n${items.join('\n')}\n  </channel>\n</rss>\n`;
}

/** llms.txt: a plain-language map of the site for AI assistants and LLM crawlers (llmstxt.org convention). */
export function llmsTxt(all: Article[], cats: CategoryItem[]): string {
  const bycat = cats
    .map((c) => {
      const list = all.filter((a) => a.category === c.name).slice(0, 30);
      if (!list.length) return '';
      return `## ${c.name}\n${c.description ? c.description + '\n' : ''}\n${list.map((a) => `- [${a.title}](${SITE_URL + articlePathOf(a, cats)}): ${(a.metaDescription || '').replace(/\s+/g, ' ')}`).join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n');
  return `# Briefzy\n\n> Briefzy publishes practical, plain-English guides on AI tools, online privacy and security, everyday tech, and remote work. Articles are written and edited by a named editorial team; each one lists its author, publication date and last update.\n\n- Site: ${SITE_URL}/\n- Sitemap: ${SITE_URL}/sitemap.xml\n- RSS: ${SITE_URL}/feed.xml\n- About the editorial team: ${SITE_URL}/about-us\n- Contact and corrections: ${SITE_URL}/contact-us\n\n${bycat}\n`;
}
