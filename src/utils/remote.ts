// Klien untuk penyimpanan konten di Cloudflare (KV) + token admin.
import type { Article, CategoryItem, TeamMember } from '../types.ts';

export interface RemoteContent {
  articles: Article[] | null;
  categories: CategoryItem[] | null;
  team: TeamMember[] | null;
}

const TOKEN_KEY = 'briefzy_admin_token';
export const getAdminToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const setAdminToken = (t: string) => { try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* abaikan */ } };
export const clearAdminToken = () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* abaikan */ } };

export function getAdminHeaders(extraHeaders?: HeadersInit): HeadersInit {
  const token = getAdminToken();
  const headers = new Headers(extraHeaders);
  if (token && !headers.has('x-admin-token')) {
    headers.set('x-admin-token', token);
  }
  return headers;
}

export function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = getAdminHeaders(init?.headers || (input instanceof Request ? input.headers : undefined));
  return fetch(input, { ...init, headers });
}

// Menambahkan header x-admin-token ke semua request /api/* selama sesi admin aktif.
// Aman jika window.fetch bersifat read-only di lingkungan iframe/browser tertentu.
export function installAdminFetch() {
  try {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    const orig = window.fetch.bind(window);
    const patchedFetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const token = getAdminToken();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : (input as Request).url;
      if (token && url && url.startsWith('/api/')) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has('x-admin-token')) headers.set('x-admin-token', token);
        return orig(input, { ...init, headers });
      }
      return orig(input, init);
    };

    try {
      Object.defineProperty(window, 'fetch', {
        value: patchedFetch,
        writable: true,
        configurable: true,
      });
    } catch {
      try {
        (window as any).fetch = patchedFetch;
      } catch {
        // window.fetch memiliki getter-only di beberapa sandbox iframe; ditangani dengan aman
      }
    }
  } catch (err) {
    // Hindari crash pada startup aplikasi
    console.warn('installAdminFetch skipped:', err);
  }
}

export async function fetchRemoteContent(timeoutMs = 3500): Promise<RemoteContent | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/api/content', { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return { articles: data.articles ?? null, categories: data.categories ?? null, team: data.team ?? null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface LoginResult { ok: boolean; error?: string; notConfigured?: boolean }

export async function adminLogin(token: string): Promise<LoginResult> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-admin-token': token } : {}) },
      body: '{}',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true };
    return { ok: false, error: data.error || 'Login failed', notConfigured: !!data.adminNotConfigured };
  } catch {
    return { ok: false, error: 'Cannot connect to server' };
  }
}

export async function fetchAdminContent(): Promise<RemoteContent | null> {
  try {
    const res = await adminFetch('/api/admin/content');
    if (!res.ok) return null;
    const d = await res.json();
    return { articles: d.articles ?? null, categories: d.categories ?? null, team: d.team ?? null };
  } catch {
    return null;
  }
}

export async function saveAdminContent(
  partial: Partial<{ articles: Article[]; categories: CategoryItem[]; team: TeamMember[] }>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await adminFetch('/api/admin/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: data.error || `HTTP ${res.status}` };
  } catch {
    return { ok: false, error: 'Cannot connect to server' };
  }
}
