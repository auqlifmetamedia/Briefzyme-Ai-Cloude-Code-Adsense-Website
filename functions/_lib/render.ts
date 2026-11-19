// Render HTML di edge: menyisipkan meta SEO + konten yang bisa dibaca crawler tanpa JavaScript.
import type { Article, CategoryItem, TeamMember } from '../../src/types.ts';
import { SITE_URL, PAGE_SLUGS, articlePathOf, categoryPathOf, type PageKey } from '../../src/utils/routes.ts';
import type { PageMeta } from '../../src/utils/seoMeta.ts';

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

// Fallback generik dipakai hanya untuk PageKey yang belum punya konten khusus di bawah.
export function fallbackPage(title: string, description: string, cats: CategoryItem[]): string {
  return `<main ${WRAP}><h1>${esc(title)}</h1><p>${esc(description)}</p>${footerNav(cats)}</main>`;
}

function teamCards(team: TeamMember[]): string {
  if (!team.length) return '';
  return `<div>${team
    .map(
      (m) =>
        `<div style="margin-bottom:1em"><strong>${esc(m.name)}</strong>${m.verified ? ' ✓' : ''} — ${esc(m.title || m.role || '')}<br><span>${esc(m.bio || '')}</span>${
          m.specialty?.length ? `<br><em>${m.specialty.slice(0, 4).map(esc).join(', ')}</em>` : ''
        }</div>`
    )
    .join('')}</div>`;
}

// Konten lengkap halaman statis — sama dengan isi komponen React-nya (AboutUsPage.tsx dkk.),
// supaya crawler/bot yang tidak menjalankan JavaScript tetap melihat halaman seutuhnya,
// bukan cuma judul + meta description seperti fallbackPage() lama.
export function fallbackStaticPage(page: PageKey, team: TeamMember[], cats: CategoryItem[]): string {
  switch (page) {
    case 'about':
      return `<main ${WRAP}>
<h1>About Briefzy</h1>
<p>Briefzy publishes practical, plain-English guides on AI tools, online privacy and security, everyday tech, and remote work. Our goal is simple: help you get something done, or avoid a costly mistake, without wading through jargon or filler.</p>
<h2>What we cover</h2>
<ul>
<li><strong>Productivity &amp; AI Tools:</strong> how to use AI assistants and work habits that save time.</li>
<li><strong>Online Privacy &amp; Security:</strong> clear steps to protect your accounts, devices, and data.</li>
<li><strong>Tech How-To:</strong> step-by-step help for everyday computer and phone tasks.</li>
<li><strong>Remote Work &amp; Careers:</strong> setting up and running a productive work-from-home life.</li>
</ul>
<h2>How we work</h2>
<ul>
<li>Guides are researched from official documentation and well-established best practices, then reviewed before publication.</li>
<li>Some drafts are prepared with AI-assisted writing tools and are edited by the Briefzy editorial team before they go live.</li>
<li>We do not invent statistics, quotes, or credentials. If a claim cannot be supported, we leave it out.</li>
<li>Our articles are general information, not professional legal, financial, medical, or security-engineering advice.</li>
<li>Advertising, including Google AdSense, may appear on the site. Ads never decide what we write.</li>
</ul>
<h2>Briefzy Authors &amp; Editorial Desk (${team.length})</h2>
<p>Every guide on Briefzy is written and reviewed by hands-on practitioners dedicated to real-world testing of AI tools, online security practices, everyday hardware, and remote team workflows — without exaggerated titles or honorary credentials.</p>
${teamCards(team)}
<h2>Corrections</h2>
<p>Found a mistake or an outdated step? Tell us and we will review it and update the article.</p>
<h2>Contact</h2>
<p>Editorial and corrections: ${link('mailto:editorial@briefzy.me', 'editorial@briefzy.me')}<br>Privacy questions: ${link('mailto:privacy@briefzy.me', 'privacy@briefzy.me')}</p>
${footerNav(cats)}
</main>`;

    case 'contact':
      return `<main ${WRAP}>
<h1>Contact Briefzy</h1>
<p>Reach our editorial desk, advertising/partnerships contact, or copyright (DMCA) contact by email below.</p>
<h2>Official channels</h2>
<ul>
<li><strong>Editorial Board:</strong> ${link('mailto:editorial@briefzy.me', 'editorial@briefzy.me')} — story pitches, corrections, general editorial inquiries.</li>
<li><strong>AdSense &amp; Partnerships:</strong> ${link('mailto:partners@briefzy.me', 'partners@briefzy.me')} — advertising and brand partnership inquiries.</li>
<li><strong>Copyright (DMCA):</strong> ${link('mailto:dmca@briefzy.me', 'dmca@briefzy.me')} — see our <a href="/dmca">DMCA policy</a> for what to include.</li>
<li><strong>Privacy questions:</strong> ${link('mailto:privacy@briefzy.me', 'privacy@briefzy.me')}</li>
</ul>
<p>We aim to reply to verified inquiries within a few business days. Briefzy is published online; please reach us by email rather than postal mail.</p>
<p>Sending a message opens your own email app addressed to the right inbox above — the message travels over the same HTTPS/TLS connection as the rest of this site, like any normal email.</p>
${footerNav(cats)}
</main>`;

    case 'privacy':
      return `${FALLBACK_CSS}<main ${WRAP}>
<h1>Privacy Policy</h1>
<p><em>Last updated: October 13, 2026</em></p>
<p><strong>Summary:</strong> Briefzy (briefzy.me) complies with the EU General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and Google AdSense Publisher Policies.</p>
<h2>1. Google AdSense &amp; third-party advertising</h2>
<p>Briefzy displays ads served by Google AdSense and authorized third-party ad networks.</p>
<ul>
<li><strong>Third-party vendor cookies:</strong> Google and other vendors use cookies to serve ads based on a user's prior visits to briefzy.me or other sites.</li>
<li><strong>Opt-out:</strong> You may opt out of personalized advertising via <a href="https://adssettings.google.com" rel="noreferrer">Google Ads Settings</a> or <a href="https://www.aboutads.info" rel="noreferrer">www.aboutads.info</a>.</li>
</ul>
<h2>2. Information we collect</h2>
<ul>
<li><strong>Log files:</strong> standard web server logs — IP address, browser type, ISP, timestamps, referring/exit pages. Not linked to your identity.</li>
<li><strong>Voluntarily provided data:</strong> name and email address if you contact our editorial board or subscribe to updates.</li>
</ul>
<h2>3. How your data travels</h2>
<p>This site is served entirely over HTTPS (TLS), so traffic between your browser and our servers is encrypted in transit, the same as any modern website. The contact page simply opens a message in your own email app addressed to us; from that point on it travels and is stored the same way any email you send is.</p>
<h2>4. GDPR rights (EEA residents)</h2>
<ul>
<li>Access and receive a copy of your personal data.</li>
<li>Rectify inaccurate or incomplete records.</li>
<li>Request erasure ("right to be forgotten").</li>
<li>Restrict or object to automated processing.</li>
<li>Data portability in a machine-readable format.</li>
</ul>
<p>To exercise these rights, email <a href="mailto:dpo@briefzy.me">dpo@briefzy.me</a>.</p>
<h2>5. CCPA notice (California residents)</h2>
<p>You may request disclosure of the categories of personal information we hold and request deletion. Briefzy does not sell your personal data to third-party data brokers.</p>
<h2>6. Children's privacy (COPPA)</h2>
<p>Briefzy does not knowingly collect personal information from children under 13. If you believe a child provided such information, contact us immediately.</p>
<h2>Data controller</h2>
<p>Briefzy (briefzy.me) — Attn: Privacy — <a href="mailto:privacy@briefzy.me">privacy@briefzy.me</a></p>
${footerNav(cats)}
</main>`;

    case 'terms':
      return `<main ${WRAP}>
<h1>Terms of Service</h1>
<p><em>Last revised: October 13, 2026 — applies to briefzy.me and its syndication feeds.</em></p>
<h2>1. Acceptance of terms</h2>
<p>By reading content on Briefzy (briefzy.me), you agree to these Terms of Service. If you disagree, please discontinue use of the site.</p>
<h2>2. Intellectual property &amp; syndication</h2>
<p>Original articles, charts, infographics and branding on Briefzy belong to Briefzy and its contributors.</p>
<ul>
<li><strong>Fair use/quotation:</strong> you may quote up to 100 words with clear attribution and a link back to the original article.</li>
<li><strong>No unauthorized scraping:</strong> automated scraping, bulk re-publishing, or feeding our content into third-party commercial systems without written consent is not permitted.</li>
</ul>
<h2>3. Not financial or legal advice</h2>
<p>Briefzy's content is educational and informational. It does not constitute financial, investment, or legal advice. Do your own research before making decisions based on anything you read here.</p>
<h2>4. Comment moderation</h2>
<p>Briefzy may moderate, edit, or remove reader comments that contain hate speech, defamation, spam, or privacy violations.</p>
<h2>5. Governing law</h2>
<p>These Terms are governed by the laws of the jurisdiction where the site publisher is established.</p>
${footerNav(cats)}
</main>`;

    case 'dmca':
      return `<main ${WRAP}>
<h1>DMCA Copyright Notice</h1>
<p>Digital Millennium Copyright Act (17 U.S.C. § 512) notification procedure.</p>
<p>Briefzy (briefzy.me) respects the intellectual property rights of creators and content owners and responds to valid notices of alleged infringement.</p>
<h2>Filing a notice of copyright infringement</h2>
<p>If you believe content on Briefzy infringes your copyright, send a notice containing:</p>
<ol>
<li>A physical or electronic signature of the copyright owner or their authorized agent.</li>
<li>Identification of the copyrighted work claimed to be infringed.</li>
<li>Identification of the material claimed to be infringing, including the exact URL on briefzy.me.</li>
<li>Your contact information: name, address, phone number, and email.</li>
<li>A statement of good-faith belief that the use is not authorized by the copyright owner, its agent, or the law.</li>
<li>A statement, made under penalty of perjury, that the information in the notice is accurate.</li>
</ol>
<h2>Designated DMCA agent</h2>
<p>Attn: Copyright — Briefzy (briefzy.me)<br>Email: <a href="mailto:dmca@briefzy.me">dmca@briefzy.me</a></p>
<p>We review valid takedown notices and act on them as soon as we reasonably can.</p>
${footerNav(cats)}
</main>`;
  }
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
