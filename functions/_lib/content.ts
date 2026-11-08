// Memuat konten untuk render di edge: dari KV bila sudah ada, kalau belum pakai data bawaan.
import { initialArticles } from '../../src/data/mockArticles';
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
  return { articles: (articles ?? initialArticles).filter((a) => isLive(a, now)), categories: categories ?? initialCategories };
}
