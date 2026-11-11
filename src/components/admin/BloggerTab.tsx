import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminFetch } from '../../utils/remote.ts';
import type { Article } from '../../types.ts';
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  Clock,
  KeyRound,
  ListChecks,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

interface BloggerPrefs {
  enabled: boolean;
  labels: string;
  beforeHtml: string;
  afterHtml: string;
}

interface BlogRow {
  id: string;
  name: string;
  url: string;
  posts: number;
  updated?: string | null;
  prefs: BloggerPrefs;
}

interface HistoryRow {
  id: string;
  articleId?: string;
  articleTitle: string;
  blogName: string;
  url: string;
  mode: string;
  at: string;
}

interface StatusPayload {
  configured: boolean;
  connected: boolean;
  clientId: string;
  hasSecret: boolean;
  redirectUri: string;
  tokenExpiresAt: string | null;
  history: HistoryRow[];
  prefs: Record<string, BloggerPrefs>;
  storageFile: string;
}

interface PublishResult {
  blogId: string;
  blogName: string;
  ok: boolean;
  postId?: string;
  url?: string;
  error?: string;
  mode?: string;
}

interface QueueItemRow {
  id: string;
  articleId: string;
  articleTitle: string;
  blogId: string;
  blogName: string;
  mode: 'draft' | 'live';
  scheduledAt: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  attempts: number;
  lastError?: string;
  postId?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

interface QueuePayload {
  paused: boolean;
  counts: {
    total: number;
    queued: number;
    running: number;
    done: number;
    failed: number;
    nextAt: string | null;
  };
  items: QueueItemRow[];
}

const queuePostOf = (a: Article) => ({
  articleId: a.id,
  title: a.title,
  content: a.content,
  description: a.metaDescription,
  labels: [...(a.tags || []), a.category].filter(Boolean),
  imageUrl: /^https?:\/\//i.test(a.featuredImage || '') ? a.featuredImage : undefined,
  imageAlt: a.imageAlt,
  keyTakeaways: a.keyTakeaways,
  faqs: a.faqs,
});

const defaultQueueStart = () => {
  const d = new Date(Date.now() + 5 * 60_000);
  d.setSeconds(0, 0);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const statusStyle = (s: string) =>
  s === 'done'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
    : s === 'failed'
    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
    : s === 'running'
    ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

const statusLabel = (s: string) =>
  s === 'done' ? 'selesai' : s === 'failed' ? 'gagal' : s === 'running' ? 'diproses' : 'menunggu';

const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1';
const input =
  'w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white';

const LOCALE = 'id-ID';
const fmtDate = (iso: string) => {
  const t = Date.parse(iso);
  return isNaN(t) ? iso : new Date(t).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
};

export const BloggerTab: React.FC<{ articles: Article[] }> = ({ articles }) => {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [copied, setCopied] = useState(false);

  const [selectedBlogIds, setSelectedBlogIds] = useState<string[]>([]);
  const [articleId, setArticleId] = useState('');
  const [mode, setMode] = useState<'draft' | 'live' | 'schedule'>('draft');
  const [scheduledAt, setScheduledAt] = useState('');
  const [results, setResults] = useState<PublishResult[] | null>(null);
  const [openPrefs, setOpenPrefs] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // Antrean batch
  const [queue, setQueue] = useState<QueuePayload | null>(null);
  const [queueArticleIds, setQueueArticleIds] = useState<string[]>([]);
  const [queueBlogIds, setQueueBlogIds] = useState<string[]>([]);
  const [queueStartAt, setQueueStartAt] = useState(defaultQueueStart);
  const [queueInterval, setQueueInterval] = useState(15);
  const [queueMode, setQueueMode] = useState<'draft' | 'live'>('draft');
  const [queueBusy, setQueueBusy] = useState('');

  const call = useCallback(async (path: string, init?: RequestInit) => {
    const res = await adminFetch(path, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const data: StatusPayload = await call('/api/blogger/status');
      setStatus(data);
      if (data.clientId) setClientId(data.clientId);
    } catch (err: any) {
      setError(err?.message || 'Tidak bisa membaca status Blogger.');
    } finally {
      setLoadingStatus(false);
    }
  }, [call]);

  const loadBlogs = useCallback(async () => {
    setLoadingBlogs(true);
    setError('');
    try {
      const data = await call('/api/blogger/blogs');
      const rows: BlogRow[] = data.blogs || [];
      setBlogs(rows);
      setSelectedBlogIds((prev) => {
        if (prev.length) return prev.filter((id) => rows.some((b) => b.id === id));
        return rows.filter((b) => b.prefs?.enabled !== false).map((b) => b.id);
      });
      setQueueBlogIds((prev) => {
        if (prev.length) return prev.filter((id) => rows.some((b) => b.id === id));
        return rows.filter((b) => b.prefs?.enabled !== false).map((b) => b.id);
      });
    } catch (err: any) {
      setError(err?.message || 'Gagal mengambil daftar blog.');
      setBlogs([]);
    } finally {
      setLoadingBlogs(false);
    }
  }, [call]);

  const loadQueue = useCallback(async () => {
    try {
      const data: QueuePayload = await call('/api/blogger/queue');
      setQueue(data);
    } catch {
      /* polling: abaikan error sementara */
    }
  }, [call]);

  useEffect(() => {
    loadStatus();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [loadStatus]);

  useEffect(() => {
    if (status?.connected) loadBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected]);

  // Pantau antrean selama Studio terbuka (worker di server berjalan tiap 20 detik).
  // Antrean tetap ditampilkan walau akun Google sedang tidak terhubung, agar status tidak tersembunyi.
  useEffect(() => {
    loadQueue();
    const timer = window.setInterval(loadQueue, 8000);
    return () => window.clearInterval(timer);
  }, [loadQueue]);

  useEffect(() => {
    if (!articleId && articles.length) setArticleId(articles[0].id);
  }, [articles, articleId]);

  const selectedArticle = useMemo(() => articles.find((a) => a.id === articleId) || null, [articles, articleId]);

  const imageWarning = useMemo(() => {
    const image = selectedArticle?.featuredImage || '';
    if (!image) return '';
    if (/^https?:\/\//i.test(image)) return '';
    return 'Gambar unggulan artikel ini tersimpan lokal (bukan URL publik). Blogspot tidak bisa menampilkannya — pakai URL gambar publik agar gambar ikut terkirim.';
  }, [selectedArticle]);

  const saveConfig = async () => {
    if (!clientId.trim()) {
      setError('Client ID OAuth Google wajib diisi.');
      return;
    }
    setBusy('config');
    setError('');
    setNotice('');
    try {
      await call('/api/blogger/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });
      setClientSecret('');
      setNotice('Kredensial Google disimpan di komputer ini.');
      await loadStatus();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan kredensial.');
    } finally {
      setBusy('');
    }
  };

  const connect = async () => {
    setBusy('connect');
    setError('');
    setNotice('');
    try {
      const data = await call('/api/blogger/auth/start');
      const popup = window.open(data.url, '_blank', 'noopener,noreferrer');
      if (!popup) setNotice('Popup diblokir. Buka tautan otorisasi dari tombol di bawah ini.');
      if (pollRef.current) window.clearInterval(pollRef.current);
      let tries = 0;
      pollRef.current = window.setInterval(async () => {
        tries += 1;
        try {
          const st: StatusPayload = await call('/api/blogger/status');
          if (st.connected) {
            window.clearInterval(pollRef.current!);
            pollRef.current = null;
            setStatus(st);
            setNotice('Akun Google terhubung. Daftar blog dimuat otomatis.');
            await loadBlogs();
          }
        } catch {
          /* diamkan, coba lagi */
        }
        if (tries > 90 && pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Gagal memulai koneksi Google.');
    } finally {
      setBusy('');
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Putuskan akun Google? Artikel yang sudah terbit di Blogspot tetap ada.')) return;
    setBusy('disconnect');
    try {
      await call('/api/blogger/disconnect', { method: 'POST' });
      setBlogs([]);
      setResults(null);
      setNotice('Akun Google diputuskan.');
      await loadStatus();
    } catch (err: any) {
      setError(err?.message || 'Gagal memutuskan akun.');
    } finally {
      setBusy('');
    }
  };

  const savePrefs = async (blog: BlogRow, patch: Partial<BloggerPrefs>) => {
    const next = { ...blog.prefs, ...patch };
    setBlogs((prev) => prev.map((b) => (b.id === blog.id ? { ...b, prefs: next } : b)));
    try {
      await call('/api/blogger/blogs/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId: blog.id, ...next }),
      });
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan pengaturan blog.');
    }
  };

  const toggleTarget = (id: string) =>
    setSelectedBlogIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const publish = async () => {
    if (!selectedArticle) {
      setError('Pilih artikel yang mau dipublikasikan.');
      return;
    }
    if (!selectedBlogIds.length) {
      setError('Pilih minimal satu blog tujuan.');
      return;
    }
    if (mode === 'schedule' && !scheduledAt) {
      setError('Isi tanggal & jam publikasi terjadwal.');
      return;
    }
    setBusy('publish');
    setError('');
    setNotice('');
    setResults(null);
    try {
      const imageUrl = selectedArticle.featuredImage || '';
      const data = await call('/api/blogger/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: selectedArticle.id,
          blogIds: selectedBlogIds,
          mode,
          scheduledAt: mode === 'schedule' ? new Date(scheduledAt).toISOString() : undefined,
          post: {
            title: selectedArticle.title,
            content: selectedArticle.content,
            description: selectedArticle.metaDescription,
            labels: [...(selectedArticle.tags || []), selectedArticle.category].filter(Boolean),
            imageUrl: /^https?:\/\//i.test(imageUrl) ? imageUrl : undefined,
            imageAlt: selectedArticle.imageAlt,
            keyTakeaways: selectedArticle.keyTakeaways,
            faqs: selectedArticle.faqs,
          },
        }),
      });
      setResults(data.results || []);
      setNotice(
        data.failed
          ? `${data.published} blog berhasil, ${data.failed} gagal. Lihat detail di bawah.`
          : `Artikel terkirim ke ${data.published} blog.`
      );
      await loadStatus();
    } catch (err: any) {
      setError(err?.message || 'Publikasi ke Blogspot gagal.');
    } finally {
      setBusy('');
    }
  };

  // ----------------------------------------------------------------
  // Antrean batch
  // ----------------------------------------------------------------
  const queueAction = async (path: string, body: any, label: string) => {
    setQueueBusy(label);
    setError('');
    try {
      const data = await call(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (data?.queue) setQueue(data.queue as QueuePayload);
      else await loadQueue();
    } catch (err: any) {
      setError(err?.message || 'Aksi antrean gagal.');
    } finally {
      setQueueBusy('');
    }
  };

  const createQueue = async () => {
    const picked = articles.filter((a) => queueArticleIds.includes(a.id));
    if (!picked.length) {
      setError('Pilih minimal satu artikel untuk antrean.');
      return;
    }
    if (!queueBlogIds.length) {
      setError('Pilih minimal satu blog tujuan antrean.');
      return;
    }
    if (!queueStartAt || isNaN(Date.parse(queueStartAt))) {
      setError('Isi waktu mulai antrean.');
      return;
    }
    setQueueBusy('create');
    setError('');
    setNotice('');
    try {
      const data = await call('/api/blogger/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: picked.map(queuePostOf),
          blogIds: queueBlogIds,
          startAt: new Date(queueStartAt).toISOString(),
          intervalMinutes: queueInterval,
          mode: queueMode,
        }),
      });
      setQueue(data.queue as QueuePayload);
      setNotice(`${data.created} pekerjaan masuk antrean. Worker akan mengirimkannya sesuai jadwal selama aplikasi terbuka.`);
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat antrean.');
    } finally {
      setQueueBusy('');
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const enabledCount = blogs.filter((b) => b.prefs?.enabled !== false).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-amber-500" /> Blogspot Publisher
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hubungkan satu akun Google, kelola banyak blog, lalu kirim artikel SEO langsung ke Blogspot sebagai draft atau tayang.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadStatus(); if (status?.connected) loadBlogs(); }}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBlogs ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {status?.connected && (
            <button
              onClick={disconnect}
              disabled={busy === 'disconnect'}
              className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Disconnect
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> <span>{notice}</span>
        </div>
      )}

      {/* Langkah 1: kredensial OAuth */}
      <div className={`${card} p-5 space-y-4`}>
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-500" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">1. Kredensial Google OAuth (sekali saja)</h4>
          {status?.configured && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              tersimpan
            </span>
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className={label}>Client ID</label>
            <input className={input} value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="1234567890-xxxx.apps.googleusercontent.com" />
          </div>
          <div>
            <label className={label}>Client Secret</label>
            <input
              className={input}
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={status?.hasSecret ? 'Tersimpan — isi hanya jika ingin mengganti' : 'GOCSPX-…'}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={saveConfig}
            disabled={busy === 'config'}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy === 'config' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings2 className="w-3.5 h-3.5" />} Simpan kredensial
          </button>
          <button
            onClick={connect}
            disabled={!status?.configured || busy === 'connect'}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy === 'connect' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />} Connect Google
          </button>
          {status?.connected && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Terhubung
              {status.tokenExpiresAt ? ` · token aktif s/d ${fmtDate(status.tokenExpiresAt)}` : ''}
            </span>
          )}
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Redirect URI yang harus didaftarkan di Google Cloud Console</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] font-mono px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 break-all">
              {status?.redirectUri || 'http://127.0.0.1:3000/api/blogger/auth/callback'}
            </code>
            <button
              onClick={() => copyText(status?.redirectUri || 'http://127.0.0.1:3000/api/blogger/auth/callback')}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <ol className="text-[11px] text-slate-600 dark:text-slate-400 list-decimal pl-4 space-y-0.5">
            <li>Buka console.cloud.google.com → buat project (atau pilih yang ada).</li>
            <li>APIs &amp; Services → Library → aktifkan <b>Blogger API v3</b>.</li>
            <li>OAuth consent screen → tipe <b>External</b> → tambahkan email Anda sebagai Test User.</li>
            <li>Credentials → Create credentials → OAuth client ID → tipe <b>Desktop app</b> (atau Web application dengan Redirect URI di atas).</li>
            <li>Salin Client ID &amp; Client Secret ke kolom di atas, simpan, lalu Connect Google.</li>
          </ol>
        </div>
      </div>

      {/* Langkah 2: blog */}
      <div className={`${card} p-5 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-amber-500" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              2. Blog terdeteksi {blogs.length ? `(${blogs.length})` : ''}
            </h4>
          </div>
          {blogs.length > 0 && (
            <span className="text-[11px] text-slate-500">{enabledCount} blog aktif sebagai tujuan default</span>
          )}
        </div>

        {loadingStatus || loadingBlogs ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat daftar blog…
          </div>
        ) : blogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">
            {status?.connected
              ? 'Belum ada blog di akun Google ini. Buat blog dulu di blogger.com, lalu tekan Refresh.'
              : 'Hubungkan akun Google untuk membaca semua blog Anda (10, 20, atau lebih).'}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {blogs.map((blog) => (
              <div key={blog.id} className="py-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{blog.name}</div>
                    <a
                      href={blog.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                    >
                      {blog.url}
                    </a>
                    <div className="text-[10px] text-slate-400">
                      ID {blog.id} · {blog.posts.toLocaleString(LOCALE)} post
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={blog.prefs?.enabled !== false}
                        onChange={(e) => savePrefs(blog, { enabled: e.target.checked })}
                      />
                      Tujuan default
                    </label>
                    <button
                      onClick={() => setOpenPrefs(openPrefs === blog.id ? null : blog.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                    >
                      <Settings2 className="w-3 h-3" /> SEO &amp; iklan
                    </button>
                  </div>
                </div>

                {openPrefs === blog.id && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div>
                      <label className={label}>Label tambahan (koma)</label>
                      <input
                        className={input}
                        defaultValue={blog.prefs?.labels || ''}
                        placeholder="mis. Technology, How-to"
                        onBlur={(e) => savePrefs(blog, { labels: e.target.value })}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Label artikel + kategori dari Briefzy otomatis ikut; ini hanya tambahan khusus blog ini.
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className={label}>HTML sebelum artikel</label>
                        <textarea
                          rows={3}
                          className={`${input} font-mono`}
                          defaultValue={blog.prefs?.beforeHtml || ''}
                          placeholder="Kode unit iklan AdSense (in-article) atau disclosure"
                          onBlur={(e) => savePrefs(blog, { beforeHtml: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={label}>HTML sesudah artikel</label>
                        <textarea
                          rows={3}
                          className={`${input} font-mono`}
                          defaultValue={blog.prefs?.afterHtml || ''}
                          placeholder="Iklan bawah artikel, related links, atau disclaimer"
                          onBlur={(e) => savePrefs(blog, { afterHtml: e.target.value })}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Kode AdSense paling stabil dipasang sekali di tema Blogspot (Layout → Add a Gadget → HTML/JavaScript), bukan per post.
                      Kolom di atas untuk unit iklan yang memang ingin disisipkan di dalam artikel.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Langkah 3: publikasi */}
      <div className={`${card} p-5 space-y-4`}>
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-cyan-500" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">3. Kirim artikel ke Blogspot</h4>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className={label}>Artikel Briefzy</label>
            <select className={input} value={articleId} onChange={(e) => { setArticleId(e.target.value); setResults(null); }}>
              {articles.length === 0 && <option value="">Belum ada artikel</option>}
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                  {a.draft ? ' (draft)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Mode publikasi</label>
            <div className="flex flex-wrap gap-3 text-xs text-slate-700 dark:text-slate-300 pt-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={mode === 'draft'} onChange={() => setMode('draft')} /> Draft Blogspot
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={mode === 'live'} onChange={() => setMode('live')} /> Langsung tayang
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={mode === 'schedule'} onChange={() => setMode('schedule')} /> Jadwalkan
              </label>
            </div>
            {mode === 'schedule' && (
              <div className="mt-2">
                <input type="datetime-local" className={input} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                <p className="text-[10px] text-slate-500 mt-1">Zona waktu perangkat: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
              </div>
            )}
          </div>
        </div>

        {selectedArticle && (
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <FileText className="w-3.5 h-3.5" /> {selectedArticle.title}
            </div>
            <div>Meta description: {selectedArticle.metaDescription || '—'}</div>
            <div>
              Label: {[...(selectedArticle.tags || []), selectedArticle.category].filter(Boolean).join(', ') || '—'}
            </div>
            <div>
              Panjang isi: {selectedArticle.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length.toLocaleString(LOCALE)} kata
            </div>
            {imageWarning && (
              <div className="text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span>{imageWarning}</span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className={label}>Blog tujuan ({selectedBlogIds.length} dipilih)</label>
          <div className="flex flex-wrap gap-2">
            {blogs.map((blog) => {
              const active = selectedBlogIds.includes(blog.id);
              return (
                <button
                  key={blog.id}
                  onClick={() => toggleTarget(blog.id)}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition-colors ${
                    active
                      ? 'bg-amber-500 border-amber-500 text-slate-950'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {active ? '✓ ' : ''}
                  {blog.name}
                </button>
              );
            })}
            {blogs.length === 0 && <span className="text-[11px] text-slate-500">Hubungkan akun dan muat daftar blog dulu.</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={publish}
            disabled={busy === 'publish' || !blogs.length || !selectedArticle}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {busy === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {mode === 'draft' ? 'Kirim sebagai draft' : mode === 'live' ? 'Publikasikan sekarang' : 'Jadwalkan di Blogspot'}
          </button>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" /> Disarankan mulai dari draft, cek tampilan di Blogspot, baru tayangkan.
          </span>
        </div>

        {results && (
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {results.map((r) => (
              <div key={r.blogId} className="p-3 flex items-center justify-between gap-2 text-[11px] border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  {r.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{r.blogName}</div>
                    {!r.ok && <div className="text-rose-600 dark:text-rose-400">{r.error}</div>}
                    {r.ok && <div className="text-slate-500">Post ID {r.postId || '—'}</div>}
                  </div>
                </div>
                {r.ok && r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 shrink-0"
                  >
                    Buka <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Antrean publikasi batch */}
      <div className={`${card} p-5 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-indigo-500" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">4. Antrean publikasi batch</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {queue && (
              <span className="text-[10px] text-slate-500">
                {queue.counts.queued} menunggu · {queue.counts.done} selesai
                {queue.counts.failed ? ` · ${queue.counts.failed} gagal` : ''}
                {queue.counts.running ? ` · ${queue.counts.running} diproses` : ''}
              </span>
            )}
            <button
              onClick={() => queueAction('/api/blogger/queue/pause', { paused: !queue?.paused }, 'pause')}
              disabled={queueBusy !== ''}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {queue?.paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {queue?.paused ? 'Lanjutkan antrean' : 'Jeda antrean'}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Kirim banyak artikel ke banyak blog dengan jeda bertahap. Antrean disimpan di komputer ini dan tetap jalan
          setelah aplikasi dibuka kembali. Worker memproses maksimal 5 pekerjaan per putaran (tiap 20 detik).
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={label}>Artikel ({queueArticleIds.length} dipilih)</label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              {articles.map((a) => {
                const on = queueArticleIds.includes(a.id);
                return (
                  <label
                    key={a.id}
                    className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={on}
                      onChange={() =>
                        setQueueArticleIds((prev) => (on ? prev.filter((x) => x !== a.id) : [...prev, a.id]))
                      }
                    />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {a.title}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {a.category}
                        {a.draft ? ' · draft' : ''}
                      </span>
                    </span>
                  </label>
                );
              })}
              {articles.length === 0 && <p className="p-3 text-[11px] text-slate-500">Belum ada artikel.</p>}
            </div>
            {articles.length > 0 && (
              <button
                onClick={() =>
                  setQueueArticleIds(queueArticleIds.length === articles.length ? [] : articles.map((a) => a.id))
                }
                className="mt-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {queueArticleIds.length === articles.length ? 'Kosongkan pilihan' : 'Pilih semua artikel'}
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className={label}>Blog tujuan ({queueBlogIds.length} dipilih)</label>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                {blogs.map((b) => {
                  const on = queueBlogIds.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setQueueBlogIds((prev) => (on ? prev.filter((x) => x !== b.id) : [...prev, b.id]))
                        }
                      />
                      <span className="truncate text-slate-700 dark:text-slate-300">{b.name}</span>
                    </label>
                  );
                })}
                {blogs.length === 0 && (
                  <p className="p-3 text-[11px] text-slate-500">Hubungkan akun Google dulu untuk memuat daftar blog.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Mulai</label>
                <input
                  type="datetime-local"
                  className={input}
                  value={queueStartAt}
                  onChange={(e) => setQueueStartAt(e.target.value)}
                />
              </div>
              <div>
                <label className={label}>Jeda (menit)</label>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  className={input}
                  value={queueInterval}
                  onChange={(e) =>
                    setQueueInterval(Math.max(0, Math.min(1440, Number(e.target.value) || 0)))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={queueMode === 'draft'} onChange={() => setQueueMode('draft')} /> Draft
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={queueMode === 'live'} onChange={() => setQueueMode('live')} /> Langsung tayang
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {queueArticleIds.length} artikel × {queueBlogIds.length} blog ={' '}
            <b>{queueArticleIds.length * queueBlogIds.length}</b> pekerjaan
            {queueArticleIds.length * queueBlogIds.length > 0 && queueStartAt && !isNaN(Date.parse(queueStartAt)) && (
              <span className="text-slate-400">
                · berakhir ±{' '}
                {new Date(
                  Date.parse(queueStartAt) +
                    (queueArticleIds.length * queueBlogIds.length - 1) * queueInterval * 60_000
                ).toLocaleString(LOCALE)}
              </span>
            )}
          </p>
          <button
            onClick={createQueue}
            disabled={queueBusy === 'create' || !queueArticleIds.length || !queueBlogIds.length}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {queueBusy === 'create' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListChecks className="w-3.5 h-3.5" />}
            Tambahkan ke antrean
          </button>
        </div>

        {queue && queue.items.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Status antrean
                {queue.paused && <span className="ml-2 text-amber-600 dark:text-amber-400">(dijeda)</span>}
              </span>
              <button
                onClick={() => queueAction('/api/blogger/queue/clear', {}, 'clear')}
                disabled={queueBusy !== ''}
                className="text-[10px] font-bold text-slate-500 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
              >
                Bersihkan yang selesai/gagal
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {queue.items.slice(0, 100).map((item) => (
                <div key={item.id} className="px-3 py-2 flex items-start justify-between gap-2 text-[11px]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${statusStyle(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.articleTitle}
                      </span>
                    </div>
                    <div className="text-slate-500 truncate">
                      {item.blogName} · {item.mode === 'draft' ? 'draft' : 'tayang'} · {fmtDate(item.scheduledAt)}
                      {item.attempts > 1 ? ` · ${item.attempts}× coba` : ''}
                    </div>
                    {item.lastError && (
                      <div className="text-rose-600 dark:text-rose-400">{item.lastError}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1"
                      >
                        Buka <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {(item.status === 'queued' || item.status === 'failed') && (
                      <button
                        onClick={() => queueAction('/api/blogger/queue/run', { id: item.id }, item.id)}
                        disabled={queueBusy !== ''}
                        title="Jalankan sekarang"
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {item.status === 'failed' && (
                      <button
                        onClick={() => queueAction('/api/blogger/queue/retry', { id: item.id }, item.id)}
                        disabled={queueBusy !== ''}
                        title="Ulangi"
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-50 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {item.status !== 'running' && (
                      <button
                        onClick={() => queueAction('/api/blogger/queue/remove', { id: item.id }, item.id)}
                        disabled={queueBusy !== ''}
                        title="Hapus dari antrean"
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {queue.items.length > 100 && (
              <p className="px-3 py-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                Menampilkan 100 dari {queue.items.length} pekerjaan.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Riwayat */}
      <div className={`${card} p-5 space-y-3`}>
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Riwayat publikasi ke Blogspot</h4>
        {(status?.history?.length || 0) === 0 ? (
          <p className="text-xs text-slate-500">Belum ada publikasi.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {status!.history.map((h) => (
              <div key={h.id} className="py-2 flex items-center justify-between gap-2 text-[11px]">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{h.articleTitle}</div>
                  <div className="text-slate-500">
                    {h.blogName} · {h.mode === 'draft' ? 'draft' : h.mode === 'schedule' ? 'terjadwal' : 'tayang'} · {fmtDate(h.at)}
                  </div>
                </div>
                {h.url && (
                  <a href={h.url} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 shrink-0">
                    Lihat <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        {status?.storageFile && (
          <p className="text-[10px] text-slate-400 font-mono break-all">Token &amp; pengaturan lokal: {status.storageFile}</p>
        )}
      </div>
    </div>
  );
};
