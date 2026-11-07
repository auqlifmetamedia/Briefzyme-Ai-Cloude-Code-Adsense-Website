// Routing & URL helpers — dipakai bersama oleh frontend dan Cloudflare Functions (tanpa DOM).
// Format URL:  /{slug-kategori}/{slug-artikel}   |   /{slug-kategori}   |   /about-us, dst.
import type { Article, CategoryItem } from '../types.ts';

export const SITE_URL = 'https://briefzy.me';

export type PageKey = 'about' | 'contact' | 'privacy' | 'terms' | 'dmca';

export const PAGE_SLUGS: Record<PageKey, string> = {
  about: 'about-us',
  contact: 'contact-us',
  privacy: 'privacy-policy',
  terms: 'terms-of-service',
  dmca: 'dmca',
};

const SLUG_TO_PAGE: Record<string, PageKey> = Object.fromEntries(
  (Object.keys(PAGE_SLUGS) as PageKey[]).map((k) => [PAGE_SLUGS[k], k])
) as Record<string, PageKey>;

// Slug yang tidak boleh dipakai sebagai slug kategori.
export const RESERVED_SLUGS = new Set<string>([
  ...Object.values(PAGE_SLUGS),
  'admin', 'administrator', 'api', 'assets', 'sitemap.xml', 'robots.txt', 'ads.txt', 'favicon.ico',
]);

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/, '');
}

export function uniqueSlug(base: string, existing: string[]): string {
  const root = slugify(base) || 'artikel';
  const taken = new Set(existing);
  if (!taken.has(root)) return root;
  let i = 2;
  while (taken.has(`${root}-${i}`)) i++;
  return `${root}-${i}`;
}

type CatLike = Pick<CategoryItem, 'name' | 'slug'>;

export function categorySlugOf(categoryName: string, cats: CatLike[]): string {
  return cats.find((c) => c.name === categoryName)?.slug || slugify(categoryName) || 'uncategorized';
}

export const articlePathOf = (a: Pick<Article, 'slug' | 'category'>, cats: CatLike[]) =>
  `/${categorySlugOf(a.category, cats)}/${a.slug}`;

export const categoryPathOf = (categoryName: string, cats: CatLike[]) =>
  `/${categorySlugOf(categoryName, cats)}`;

export const pagePath = (p: PageKey) => `/${PAGE_SLUGS[p]}`;

// Registry global agar komponen yang hanya menerima `article` tetap bisa membuat URL kanonik.
let registry: CatLike[] = [];
export const setCategoryRegistry = (cats: CatLike[]) => { registry = cats; };
export const articleUrl = (a: Pick<Article, 'slug' | 'category'>) => SITE_URL + articlePathOf(a, registry);

export type Route =
  | { type: 'home' }
  | { type: 'admin' }
  | { type: 'page'; page: PageKey }
  | { type: 'category'; slug: string }
  | { type: 'article'; categorySlug: string; slug: string }
  | { type: 'notfound' };

export function parsePath(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean).map((p) => {
    try { return decodeURIComponent(p).toLowerCase(); } catch { return p.toLowerCase(); }
  });
  if (parts.length === 0) return { type: 'home' };
  const first = parts[0];
  if (first === 'admin' || first === 'administrator') return { type: 'admin' };
  if (parts.length === 1) {
    if (SLUG_TO_PAGE[first]) return { type: 'page', page: SLUG_TO_PAGE[first] };
    if (RESERVED_SLUGS.has(first)) return { type: 'notfound' };
    return { type: 'category', slug: first };
  }
  if (parts.length === 2 && !RESERVED_SLUGS.has(first)) {
    return { type: 'article', categorySlug: first, slug: parts[1] };
  }
  return { type: 'notfound' };
}

export interface ResolvedRoute {
  article: Article | null;
  category: string; // nama kategori, atau 'All'
  page: 'home' | PageKey;
  notFound: boolean;
  canonicalPath?: string; // diisi bila URL perlu dikoreksi (mis. kategori artikel berubah)
}

export function resolveRoute(pathname: string, articles: Article[], cats: CategoryItem[]): ResolvedRoute {
  const route = parsePath(pathname);
  const base: ResolvedRoute = { article: null, category: 'All', page: 'home', notFound: false };
  switch (route.type) {
    case 'home':
    case 'admin':
      return base;
    case 'page':
      return { ...base, page: route.page };
    case 'category': {
      const cat = cats.find((c) => c.slug === route.slug);
      return cat ? { ...base, category: cat.name } : { ...base, notFound: true };
    }
    case 'article': {
      const art = articles.find((a) => a.slug === route.slug);
      if (!art) return { ...base, notFound: true };
      const canonical = articlePathOf(art, cats);
      return {
        ...base,
        article: art,
        category: 'All',
        canonicalPath: canonical !== pathname.replace(/\/+$/, '') ? canonical : undefined,
      };
    }
    default:
      return { ...base, notFound: true };
  }
}
