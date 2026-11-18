// Memuat konten untuk render di edge: dari KV bila sudah ada, kalau belum pakai data bawaan.
import { initialArticles } from '../../src/data/mockArticles';
import { editorialUpdates } from '../../src/data/editorialUpdates';
import { initialCategories } from '../../src/data/mockCategories';
import type { Article, CategoryItem } from '../../src/types';
import { isLive } from '../../src/utils/publishState';

async function readJson<T>(env: any, key: string): Promise<T[] | null> {
  try {
    const raw = env?.BRIEFZY_KV ? await env.BRIEFZY_KV.get(key) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function loadContent(env: any): Promise<{ articles: Article[]; categories: CategoryItem[] }> {
  const [articles, categories] = await Promise.all([
    readJson<Article>(env, 'briefzy:articles'),
    readJson<CategoryItem>(env, 'briefzy:categories'),
  ]);
  const now = Date.now();
  const sourceArticles = articles ?? initialArticles;
  const updatedArticles = sourceArticles.map((article) => editorialUpdates[article.id] ? ({ ...article, ...editorialUpdates[article.id], author: {
  name: 'Briefzy',
  role: 'Publisher byline',
  avatar: '',
  bio: "Published by Briefzy. This guide links to primary sources so readers can check important information.",
  verified: false,
}, updatedAt: '2026-11-18T00:00:00.000Z' }) : article);
  return { articles: updatedArticles.filter((a) => isLive(a, now)), categories: categories ?? initialCategories };
}
