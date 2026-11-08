import type { Article } from '../types.ts';

type Publishable = Pick<Article, 'draft' | 'scheduledAt'>;

// Artikel tampil untuk publik bila bukan draf dan waktu terbitnya sudah lewat.
export function isLive(a: Publishable, now: number = Date.now()): boolean {
  if (a.draft) return false;
  if (!a.scheduledAt) return true;
  const t = Date.parse(a.scheduledAt);
  return isNaN(t) ? true : t <= now;
}

export type PublishStatus = 'live' | 'scheduled' | 'draft';

export function publishStatus(a: Publishable, now: number = Date.now()): PublishStatus {
  if (a.draft) return 'draft';
  return isLive(a, now) ? 'live' : 'scheduled';
}
