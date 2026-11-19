// Menangani semua halaman publik (di luar /api): HTML dengan SEO per URL, sitemap dinamis, 404/301 yang benar.
import { loadContent } from './_lib/content';
import { fallbackArticle, fallbackCategory, fallbackHome, fallbackStaticPage, injectIntoHtml, llmsTxt, rssXml, sitemapXml } from './_lib/render';
import { articlePathOf, parsePath } from '../src/utils/routes';
import { metaForArticle, metaForCategory, metaForHome, metaForNotFound, metaForPage } from '../src/utils/seoMeta';

const HTML_HEADERS = { 'Content-Type': 'text/html; charset=utf-8' };

export const onRequest = async (ctx: any) => {
  const { request, env } = ctx;
  const url = new URL(request.url);

  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405 });

  // Hilangkan trailing slash (URL kanonik tanpa "/")
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    return Response.redirect(url.origin + url.pathname.replace(/\/+$/, '') + url.search, 301);
  }

  if (url.pathname === '/sitemap.xml') {
    const { articles, categories } = await loadContent(env);
    return new Response(sitemapXml(articles, categories), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  }

  if (url.pathname === '/feed.xml' || url.pathname === '/rss.xml') {
    const { articles, categories } = await loadContent(env);
    return new Response(rssXml(articles, categories), {
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  }

  if (url.pathname === '/llms.txt') {
    const { articles, categories } = await loadContent(env);
    return new Response(llmsTxt(articles, categories), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
    });
  }

  const shellRes = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: request.headers }));
  const shell = await shellRes.text();
  const route = parsePath(url.pathname);

  if (route.type === 'admin') {
    const html = shell.replace(/<meta\s+name="robots"[^>]*>/i, '<meta name="robots" content="noindex, nofollow" />');
    return new Response(html, { headers: { ...HTML_HEADERS, 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' } });
  }

  const { articles, categories, team } = await loadContent(env);
  const beacon = env.CF_BEACON_TOKEN as string | undefined;
  const send = (html: string, status = 200) =>
    new Response(html, { status, headers: { ...HTML_HEADERS, 'Cache-Control': 'public, max-age=0, must-revalidate' } });

  switch (route.type) {
    case 'home':
      return send(injectIntoHtml(shell, metaForHome(), fallbackHome(articles, categories), beacon));

    case 'page': {
      const m = metaForPage(route.page);
      return send(injectIntoHtml(shell, m, fallbackStaticPage(route.page, team, categories), beacon));
    }

    case 'category': {
      const cat = categories.find((c) => c.slug === route.slug);
      if (!cat) break;
      return send(injectIntoHtml(shell, metaForCategory(cat, categories), fallbackCategory(cat, articles, categories), beacon));
    }

    case 'article': {
      const art = articles.find((a) => a.slug === route.slug);
      if (!art) break;
      const canonical = articlePathOf(art, categories);
      // Slug benar tapi kategori di URL salah/lama -> 301 ke URL kanonik
      if (canonical !== url.pathname) return Response.redirect(url.origin + canonical, 301);
      return send(injectIntoHtml(shell, metaForArticle(art, categories), fallbackArticle(art, articles, categories), beacon));
    }
  }

  // 404 sungguhan (status code benar) — frontend menampilkan halaman "tidak ditemukan"
  return send(injectIntoHtml(shell, metaForNotFound(), '<main style="padding:2rem"><h1>404</h1><p>Page not found.</p><a href="/">Home</a></main>'), 404);
};

