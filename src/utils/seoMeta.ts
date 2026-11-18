// Pembuat metadata SEO (title, description, canonical, JSON-LD) — dipakai frontend & Cloudflare Functions.
import type { Article, CategoryItem } from '../types.ts';
import { SITE_URL, articlePathOf, categoryPathOf, pagePath, type PageKey } from './routes.ts';

export interface PageMeta {
  title: string;
  description: string;
  path: string;
  type: 'website' | 'article';
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
  /** Article-only Open Graph fields */
  published?: string;
  modified?: string;
  section?: string;
  tags?: string[];
}

const SITE_NAME = 'Briefzy';
const HOME_TITLE = 'Briefzy – Practical Guides on AI Tools, Online Security & Remote Work';
const HOME_DESC =
  'Briefzy publishes practical, plain-English guides on AI tools, online privacy and security, everyday tech, and remote work.';

const PAGE_META: Record<PageKey, { title: string; description: string }> = {
  about: { title: 'About Us', description: 'Learn about the Briefzy editorial team, our standards, and how we research and publish our analysis.' },
  contact: { title: 'Contact Us', description: 'Get in touch with the Briefzy editorial and business teams for feedback, corrections, and partnerships.' },
  privacy: { title: 'Privacy Policy', description: 'How Briefzy collects, uses, and protects your data, including cookies and Google AdSense advertising.' },
  terms: { title: 'Terms of Service', description: 'The terms that govern your use of the Briefzy website and its content.' },
  dmca: { title: 'DMCA & Copyright Policy', description: 'Briefzy copyright policy and the process for submitting a DMCA takedown notice.' },
};

const isHttp = (s?: string) => !!s && /^https?:\/\//i.test(s);
const hostedImage = (s?: string): string | undefined =>
  isHttp(s) ? s : s && s.startsWith('/img/') ? SITE_URL + s : undefined;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export function metaForHome(): PageMeta {
  return {
    title: HOME_TITLE,
    description: HOME_DESC,
    path: '/',
    type: 'website',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL + '/',
        description: HOME_DESC,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL + '/',
        logo: { '@type': 'ImageObject', url: SITE_URL + '/logo.svg' },
      },
    ],
  };
}

export function metaForPage(page: PageKey): PageMeta {
  const m = PAGE_META[page];
  return { title: `${m.title} | ${SITE_NAME}`, description: m.description, path: pagePath(page), type: 'website' };
}

export function metaForCategory(cat: CategoryItem, cats: CategoryItem[]): PageMeta {
  const path = categoryPathOf(cat.name, cats);
  return {
    title: `${cat.name} – Analysis & Insights | ${SITE_NAME}`,
    description: clip(cat.description || `Latest ${cat.name} articles and analysis from Briefzy.`, 160),
    path,
    type: 'website',
    jsonLd: [{
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: cat.name, item: SITE_URL + path },
      ],
    }],
  };
}

export function metaForNotFound(): PageMeta {
  return { title: `Page not found | ${SITE_NAME}`, description: 'The page you are looking for could not be found.', path: '/', type: 'website', noindex: true };
}

const plainWords = (html: string) => (html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

export function metaForArticle(a: Article, cats: CategoryItem[]): PageMeta {
  const path = articlePathOf(a, cats);
  const url = SITE_URL + path;
  const published = a.publishDate && !isNaN(Date.parse(a.publishDate)) ? new Date(a.publishDate).toISOString() : undefined;
  const modified = a.updatedAt && !isNaN(Date.parse(a.updatedAt)) ? new Date(a.updatedAt).toISOString() : published;
  const catPath = categoryPathOf(a.category, cats);
  const words = plainWords(a.content);
  const minutes = Math.max(1, Math.ceil(words / 200));
  const thing = (name: string) => ({ '@type': 'Thing', name });
  const keywords = [a.primaryKeyword, ...(a.secondaryKeywords || []), ...(a.lsiKeywords || [])].filter(Boolean);
  return {
    title: `${a.title} | ${SITE_NAME}`,
    description: clip(a.metaDescription || a.title, 160),
    path,
    type: 'article',
    image: hostedImage(a.featuredImage),
    published,
    modified,
    section: a.category,
    tags: keywords.slice(0, 8),
    jsonLd: [
      {
        '@context': 'https://schema.org', '@type': 'Article',
        headline: clip(a.title, 110),
        description: a.metaDescription,
        inLanguage: 'en',
        isAccessibleForFree: true,
        wordCount: words,
        timeRequired: `PT${minutes}M`,
        ...(hostedImage(a.featuredImage) ? { image: [hostedImage(a.featuredImage)] } : {}),
        ...(published ? { datePublished: published, dateModified: modified || published } : {}),
        author: {
          '@type': 'Person',
          name: a.author?.name || SITE_NAME,
          ...(a.author?.role ? { jobTitle: a.author.role } : {}),
          url: SITE_URL + '/about-us',
          ...(keywords.length ? { knowsAbout: keywords.slice(0, 5) } : {}),
        },
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL, logo: { '@type': 'ImageObject', url: SITE_URL + '/logo.svg' } },
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL + '/' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        articleSection: a.category,
        keywords: keywords.join(', '),
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['.article-headline', '.article-tldr', '.article-key-takeaways'],
        },
        // Entities: helps search engines and AI systems understand what the page is about
        ...(a.primaryKeyword ? { about: thing(a.primaryKeyword) } : {}),
        ...((a.lsiKeywords || []).length ? { mentions: (a.lsiKeywords || []).slice(0, 8).map(thing) } : {}),
      },
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' },
          { '@type': 'ListItem', position: 2, name: a.category, item: SITE_URL + catPath },
          { '@type': 'ListItem', position: 3, name: a.title, item: url },
        ],
      },
      ...(a.faqs && a.faqs.length
        ? [{
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: a.faqs.map((f) => ({
              '@type': 'Question', name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          }]
        : []),
    ],
  };
}
