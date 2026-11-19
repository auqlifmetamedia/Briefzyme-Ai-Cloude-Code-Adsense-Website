// Memuat konten untuk render di edge: dari KV bila sudah ada, kalau belum pakai data bawaan.
import { initialArticles } from '../../src/data/mockArticles';
import { initialCategories } from '../../src/data/mockCategories';
import { initialTeamMembers } from '../../src/data/mockTeam';
import type { Article, CategoryItem, TeamMember } from '../../src/types';
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

// team ditambahkan supaya halaman About Us bisa menampilkan byline/penulis asli ke crawler
// (bukan cuma ke user yang JS-nya jalan) — ini bagian dari sinyal transparansi penulis.
export async function loadContent(env: any): Promise<{ articles: Article[]; categories: CategoryItem[]; team: TeamMember[] }> {
  const [articles, categories, team] = await Promise.all([
    readJson<Article>(env, 'briefzy:articles'),
    readJson<CategoryItem>(env, 'briefzy:categories'),
    readJson<TeamMember>(env, 'briefzy:team'),
  ]);
  const now = Date.now();
  return {
    articles: (articles ?? initialArticles).filter((a) => isLive(a, now)),
    categories: categories ?? initialCategories,
    team: team ?? initialTeamMembers,
  };
}
