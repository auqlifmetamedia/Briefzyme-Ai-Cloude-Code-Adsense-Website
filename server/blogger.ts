// Integrasi Google Blogger / Blogspot (API v3) untuk Briefzy Studio.
// - OAuth 2.0 loopback (aman untuk aplikasi desktop lokal, tanpa server pihak ketiga).
// - Satu akun Google bisa mengelola banyak blog (10, 20, 50+).
// - Publikasi artikel SEO ke beberapa blog sekaligus: draft, langsung tayang, atau terjadwal.
// Token & pengaturan disimpan lokal di <dataDir>/blogger.json (tidak pernah dikirim ke mana pun
// selain Google). File ini tidak boleh dibagikan atau di-commit.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com/blogger/v3';
const SCOPE = 'https://www.googleapis.com/auth/blogger';

export interface BloggerPrefs {
  enabled: boolean;
  labels: string;
  beforeHtml: string;
  afterHtml: string;
}

interface BloggerTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expiry?: number;
}

interface PublishRecord {
  id: string;
  articleId: string;
  articleTitle: string;
  blogId: string;
  blogName: string;
  postId: string;
  url: string;
  mode: 'draft' | 'live' | 'schedule';
  at: string;
}

interface BloggerState {
  clientId: string;
  clientSecret: string;
  tokens: BloggerTokens | null;
  prefs: Record<string, BloggerPrefs>;
  history: PublishRecord[];
}

/** Satu pekerjaan antrean = satu artikel ke satu blog. */
export interface QueueItem {
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
  post: BloggerPostInput;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

interface QueueState {
  paused: boolean;
  items: QueueItem[];
}

export interface BloggerPostInput {
  title: string;
  content: string;
  description?: string;
  labels?: string[];
  imageUrl?: string;
  imageAlt?: string;
  keyTakeaways?: string[];
  faqs?: { question: string; answer: string }[];
}

const EMPTY_STATE: BloggerState = { clientId: '', clientSecret: '', tokens: null, prefs: {}, history: [] };

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function readErrorBody(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || parsed?.error_description || parsed?.error || raw.slice(0, 300);
  } catch {
    return raw.slice(0, 300);
  }
}

/** Bungkus artikel Briefzy menjadi HTML yang rapi untuk post Blogspot. */
export function buildBloggerHtml(post: BloggerPostInput, prefs?: Partial<BloggerPrefs>): string {
  const parts: string[] = [];
  const before = (prefs?.beforeHtml || '').trim();
  const after = (prefs?.afterHtml || '').trim();
  if (before) parts.push(before);

  const image = (post.imageUrl || '').trim();
  const hasImageInBody = image && post.content.includes(image);
  if (image && !hasImageInBody) {
    parts.push(
      `<figure style="margin:0 0 24px">` +
        `<img src="${esc(image)}" alt="${esc(post.imageAlt || post.title)}" style="width:100%;height:auto;border-radius:12px" loading="lazy" decoding="async" />` +
        (post.imageAlt ? `<figcaption style="font-size:13px;color:#64748b;margin-top:8px">${esc(post.imageAlt)}</figcaption>` : '') +
        `</figure>`
    );
  }

  if (post.keyTakeaways?.length) {
    const items = post.keyTakeaways
      .filter((k) => k && k.trim())
      .map((k) => `<li style="margin:0 0 8px">${esc(k)}</li>`)
      .join('');
    if (items) {
      parts.push(
        `<div style="background:#f8fafc;border-left:4px solid #f59e0b;border-radius:10px;padding:16px 20px;margin:0 0 26px">` +
          `<p style="margin:0 0 10px;font-weight:700;font-size:15px">Key takeaways</p>` +
          `<ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.6">${items}</ul>` +
          `</div>`
      );
    }
  }

  parts.push(post.content.trim());

  if (post.faqs?.length) {
    const faq = post.faqs
      .filter((f) => f?.question && f?.answer)
      .map((f) => `<h3 style="margin:26px 0 8px">${esc(f.question)}</h3><p style="margin:0 0 14px">${esc(f.answer)}</p>`)
      .join('');
    if (faq) parts.push(`<h2>Frequently Asked Questions</h2>${faq}`);
  }

  if (after) parts.push(after);
  return parts.filter(Boolean).join('\n');
}

function mergeLabels(base: string[], extra: string): string[] {
  const out: string[] = [];
  for (const raw of [...base, ...(extra || '').split(',')]) {
    const label = String(raw || '').trim();
    if (!label) continue;
    if (label.length > 100) continue;
    if (out.some((l) => l.toLowerCase() === label.toLowerCase())) continue;
    out.push(label);
    if (out.length >= 20) break; // batas label per post di Blogger
  }
  return out;
}

export function registerBloggerRoutes(
  app: any,
  opts: {
    dataDir: string;
    requireAdmin: (req: any, res: any) => boolean;
    getPort: () => number;
  }
) {
  const stateFile = path.join(opts.dataDir, 'blogger.json');
  const pendingAuth = new Map<string, { verifier: string; at: number }>();

  const redirectUri = () => `http://127.0.0.1:${opts.getPort()}/api/blogger/auth/callback`;

  const load = (): BloggerState => {
    try {
      const parsed = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      return {
        clientId: typeof parsed.clientId === 'string' ? parsed.clientId : '',
        clientSecret: typeof parsed.clientSecret === 'string' ? parsed.clientSecret : '',
        tokens: parsed.tokens && typeof parsed.tokens.access_token === 'string' ? parsed.tokens : null,
        prefs: parsed.prefs && typeof parsed.prefs === 'object' ? parsed.prefs : {},
        history: Array.isArray(parsed.history) ? parsed.history.slice(0, 500) : [],
      };
    } catch {
      return { ...EMPTY_STATE };
    }
  };

  const save = (state: BloggerState) => {
    fs.mkdirSync(opts.dataDir, { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
  };

  // Kredensial OAuth boleh datang dari .env (BLOGGER_CLIENT_ID/SECRET) atau dari UI.
  const clientCreds = (state: BloggerState) => ({
    id: (state.clientId || process.env.BLOGGER_CLIENT_ID || '').trim(),
    secret: (state.clientSecret || process.env.BLOGGER_CLIENT_SECRET || '').trim(),
  });

  const isConfigured = (state: BloggerState) => !!clientCreds(state).id;

  async function accessToken(state: BloggerState): Promise<string> {
    const tokens = state.tokens;
    if (!tokens) throw Object.assign(new Error('Belum terhubung ke akun Google.'), { status: 401, needsAuth: true });
    const stillValid = tokens.expiry && tokens.expiry - 60_000 > Date.now();
    if (stillValid || !tokens.refresh_token) return tokens.access_token;

    const creds = clientCreds(state);
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.id,
        ...(creds.secret ? { client_secret: creds.secret } : {}),
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
    });
    const raw = await res.text();
    if (!res.ok) {
      if (/invalid_grant/i.test(raw)) {
        state.tokens = null;
        save(state);
        throw Object.assign(new Error('Akses Google sudah dicabut/kedaluwarsa. Hubungkan ulang akun.'), {
          status: 401,
          needsAuth: true,
        });
      }
      throw Object.assign(new Error(`Gagal memperbarui token Google: ${readErrorBody(raw)}`), { status: 502 });
    }
    const data = JSON.parse(raw);
    state.tokens = {
      ...tokens,
      access_token: data.access_token,
      expiry: Date.now() + Number(data.expires_in || 3600) * 1000,
      scope: data.scope || tokens.scope,
    };
    save(state);
    return state.tokens.access_token;
  }

  async function google(pathname: string, init: RequestInit = {}, state?: BloggerState): Promise<Response> {
    const st = state || load();
    const token = await accessToken(st);
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body) headers.set('Content-Type', 'application/json; charset=utf-8');
    return fetch(`${API_BASE}${pathname}`, { ...init, headers });
  }

  async function listBlogs(state: BloggerState) {
    const blogs: any[] = [];
    let pageToken = '';
    for (let page = 0; page < 10; page++) {
      const qs = new URLSearchParams({ maxResults: '100', fetchUserInfo: 'false' });
      if (pageToken) qs.set('pageToken', pageToken);
      const res = await google(`/users/self/blogs?${qs.toString()}`, {}, state);
      const raw = await res.text();
      if (!res.ok) throw Object.assign(new Error(readErrorBody(raw)), { status: res.status });
      const data = JSON.parse(raw);
      for (const b of data.items || []) {
        blogs.push({
          id: String(b.id),
          name: String(b.name || ''),
          url: String(b.url || ''),
          posts: Number(b.posts?.totalItems ?? 0),
          updated: b.updated || null,
          prefs: state.prefs[String(b.id)] || { enabled: true, labels: '', beforeHtml: '', afterHtml: '' },
        });
      }
      pageToken = data.nextPageToken || '';
      if (!pageToken) break;
    }
    return blogs;
  }

  // ------------------------------------------------------------------
  // Status & koneksi
  // ------------------------------------------------------------------
  app.get('/api/blogger/status', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const state = load();
    const creds = clientCreds(state);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      configured: !!creds.id,
      connected: !!state.tokens,
      clientId: creds.id,
      hasSecret: !!creds.secret,
      redirectUri: redirectUri(),
      tokenExpiresAt: state.tokens?.expiry ? new Date(state.tokens.expiry).toISOString() : null,
      prefs: state.prefs,
      history: state.history.slice(0, 50),
      storageFile: stateFile,
    });
  });

  app.post('/api/blogger/config', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const { clientId, clientSecret } = req.body || {};
    if (typeof clientId !== 'string' || !clientId.trim()) {
      return res.status(400).json({ error: 'Client ID OAuth wajib diisi.' });
    }
    const state = load();
    state.clientId = clientId.trim();
    if (typeof clientSecret === 'string') state.clientSecret = clientSecret.trim();
    // Kredensial berubah => token lama tidak bisa dipakai lagi.
    if (state.tokens) state.tokens = null;
    save(state);
    res.json({ success: true, configured: true, redirectUri: redirectUri() });
  });

  app.post('/api/blogger/disconnect', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const state = load();
    state.tokens = null;
    save(state);
    res.json({ success: true });
  });

  app.get('/api/blogger/auth/start', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const state = load();
    const creds = clientCreds(state);
    if (!creds.id) {
      return res.status(400).json({ error: 'Isi Client ID OAuth Google terlebih dahulu.' });
    }
    const st = b64url(crypto.randomBytes(16));
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    pendingAuth.set(st, { verifier, at: Date.now() });
    for (const [key, value] of pendingAuth) if (Date.now() - value.at > 15 * 60_000) pendingAuth.delete(key);

    const url = new URL(AUTH_URL);
    url.searchParams.set('client_id', creds.id);
    url.searchParams.set('redirect_uri', redirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPE);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('state', st);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    res.json({ url: url.toString(), redirectUri: redirectUri() });
  });

  app.get('/api/blogger/auth/callback', async (req: any, res: any) => {
    const code = String(req.query.code || '');
    const stateKey = String(req.query.state || '');
    const oauthError = String(req.query.error || '');
    const page = (title: string, body: string) =>
      `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>` +
      `<meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
      `<body style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px">` +
      `<div style="max-width:520px;background:#111c33;border:1px solid #1e293b;border-radius:16px;padding:28px">` +
      `<h1 style="font-size:20px;margin:0 0 10px">${esc(title)}</h1>` +
      `<p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0">${body}</p>` +
      `</div></body></html>`;

    if (oauthError) {
      return res.status(400).send(page('Koneksi dibatalkan', `Google mengembalikan: ${esc(oauthError)}. Tutup tab ini lalu coba lagi dari aplikasi.`));
    }

    const pending = pendingAuth.get(stateKey);
    if (!pending) {
      return res.status(400).send(page('Permintaan kedaluwarsa', 'Sesi otorisasi tidak ditemukan atau sudah dipakai. Tutup tab ini lalu tekan Connect lagi.'));
    }
    pendingAuth.delete(stateKey);
    if (!code) {
      return res.status(400).send(page('Kode otorisasi tidak ada', 'Google tidak mengirim kode. Tutup tab ini lalu coba lagi.'));
    }

    const state = load();
    const creds = clientCreds(state);
    const form = new URLSearchParams({
      code,
      client_id: creds.id,
      ...(creds.secret ? { client_secret: creds.secret } : {}),
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
      code_verifier: pending.verifier,
    });

    try {
      const tokenRes = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const raw = await tokenRes.text();
      if (!tokenRes.ok) {
        return res
          .status(400)
          .send(page('Gagal menukar kode', `Google menolak permintaan: ${esc(readErrorBody(raw))}. Periksa Client ID/Secret dan Redirect URI.`));
      }
      const data = JSON.parse(raw);
      state.tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || state.tokens?.refresh_token,
        token_type: data.token_type,
        scope: data.scope,
        expiry: Date.now() + Number(data.expires_in || 3600) * 1000,
      };
      save(state);
      return res.send(
        page(
          'Akun Google terhubung',
          'Briefzy Studio sekarang bisa membaca daftar blog dan memublikasikan artikel. Tutup tab ini dan kembali ke aplikasi.'
        )
      );
    } catch (err: any) {
      return res.status(502).send(page('Koneksi gagal', esc(err?.message || 'Tidak bisa menghubungi Google.')));
    }
  });

  // ------------------------------------------------------------------
  // Daftar blog + pengaturan per blog
  // ------------------------------------------------------------------
  app.get('/api/blogger/blogs', async (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const state = load();
    try {
      const blogs = await listBlogs(state);
      res.json({ success: true, count: blogs.length, blogs });
    } catch (err: any) {
      const status = err?.needsAuth ? 401 : err?.status && err.status >= 400 ? err.status : 502;
      res.status(status).json({ error: err?.message || 'Gagal mengambil daftar blog.', needsAuth: !!err?.needsAuth });
    }
  });

  app.post('/api/blogger/blogs/prefs', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const { blogId, enabled, labels, beforeHtml, afterHtml } = req.body || {};
    if (typeof blogId !== 'string' || !blogId.trim()) return res.status(400).json({ error: 'blogId wajib diisi.' });
    const state = load();
    const prev = state.prefs[blogId] || { enabled: true, labels: '', beforeHtml: '', afterHtml: '' };
    const next: BloggerPrefs = {
      enabled: typeof enabled === 'boolean' ? enabled : prev.enabled,
      labels: typeof labels === 'string' ? labels.slice(0, 400) : prev.labels,
      beforeHtml: typeof beforeHtml === 'string' ? beforeHtml.slice(0, 20000) : prev.beforeHtml,
      afterHtml: typeof afterHtml === 'string' ? afterHtml.slice(0, 20000) : prev.afterHtml,
    };
    state.prefs[blogId] = next;
    save(state);
    res.json({ success: true, prefs: next });
  });

  // ------------------------------------------------------------------
  // Inti publikasi: satu artikel ke satu blog (dipakai publish langsung & antrean)
  // ------------------------------------------------------------------
  async function publishOne(
    state: BloggerState,
    blog: any,
    post: BloggerPostInput,
    mode: 'draft' | 'live' | 'schedule',
    scheduledIso: string | null,
    articleId: string
  ): Promise<{ postId: string; url: string }> {
    const prefs: BloggerPrefs = blog.prefs || { enabled: true, labels: '', beforeHtml: '', afterHtml: '' };
    const html = buildBloggerHtml(post, prefs);
    const labels = mergeLabels(Array.isArray(post.labels) ? post.labels.map(String) : [], prefs.labels);
    const description = String(post.description || '').trim().slice(0, 500);

    const body: any = {
      kind: 'blogger#post',
      title: post.title.trim().slice(0, 250),
      content: html,
      ...(labels.length ? { labels } : {}),
    };
    if (description) body.customMetaData = JSON.stringify({ description });
    const isDraft = mode === 'draft';
    if (mode === 'schedule' && scheduledIso) {
      body.status = 'SCHEDULED';
      body.published = scheduledIso;
    }

    // customMetaData sudah deprecated di API v3: kalau Google menolaknya, ulangi tanpa field itu.
    let lastError = '';
    let created: any = null;
    for (const attempt of [body, { ...body, customMetaData: undefined }]) {
      const payload = { ...attempt };
      if (!payload.customMetaData) delete payload.customMetaData;
      const url = `${API_BASE}/blogs/${encodeURIComponent(blog.id)}/posts${isDraft ? '?isDraft=true' : ''}`;
      const token = await accessToken(state);
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const raw = await response.text();
      if (response.ok) {
        created = JSON.parse(raw);
        break;
      }
      lastError = readErrorBody(raw);
      if (response.status !== 400 || !payload.customMetaData) {
        throw Object.assign(new Error(lastError), { status: response.status });
      }
    }
    if (!created) throw new Error(lastError || 'Google tidak mengembalikan data post.');

    const postId = String(created.id || '');
    const postUrl = String(created.url || blog.url || '');
    state.history.unshift({
      id: `${Date.now()}-${blog.id}`,
      articleId: String(articleId || ''),
      articleTitle: post.title.trim(),
      blogId: blog.id,
      blogName: blog.name,
      postId,
      url: postUrl,
      mode,
      at: new Date().toISOString(),
    });
    state.history = state.history.slice(0, 500);
    save(state);
    return { postId, url: postUrl };
  }

  // ------------------------------------------------------------------
  // Publikasi ke satu atau banyak blog
  // ------------------------------------------------------------------
  app.post('/api/blogger/publish', async (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const { articleId, post, blogIds, mode = 'draft', scheduledAt } = req.body || {};

    if (!Array.isArray(blogIds) || blogIds.length === 0) {
      return res.status(400).json({ error: 'Pilih minimal satu blog tujuan.' });
    }
    if (blogIds.length > 100) return res.status(400).json({ error: 'Maksimal 100 blog per permintaan.' });
    if (!post || typeof post.title !== 'string' || !post.title.trim()) {
      return res.status(400).json({ error: 'Judul artikel wajib diisi.' });
    }
    if (typeof post.content !== 'string' || !post.content.trim()) {
      return res.status(400).json({ error: 'Isi artikel kosong.' });
    }
    if (post.content.length > 900_000) return res.status(413).json({ error: 'Artikel terlalu panjang untuk satu post Blogspot.' });
    if (!['draft', 'live', 'schedule'].includes(mode)) return res.status(400).json({ error: 'Mode publikasi tidak dikenal.' });

    let scheduledIso: string | null = null;
    if (mode === 'schedule') {
      const t = Date.parse(String(scheduledAt || ''));
      if (isNaN(t)) return res.status(400).json({ error: 'Tanggal jadwal tidak valid.' });
      if (t < Date.now() - 60_000) return res.status(400).json({ error: 'Jadwal harus di masa depan.' });
      scheduledIso = new Date(t).toISOString();
    }

    const state = load();
    let blogs;
    try {
      blogs = await listBlogs(state);
    } catch (err: any) {
      const status = err?.needsAuth ? 401 : 502;
      return res.status(status).json({ error: err?.message || 'Gagal membaca daftar blog.', needsAuth: !!err?.needsAuth });
    }

    const targets = blogs.filter((b: any) => blogIds.includes(b.id));
    if (targets.length === 0) return res.status(404).json({ error: 'Blog tujuan tidak ditemukan di akun Google ini.' });

    const results: any[] = [];
    for (const blog of targets) {
      try {
        const { postId, url } = await publishOne(state, blog, post, mode, scheduledIso, String(articleId || ''));
        results.push({ blogId: blog.id, blogName: blog.name, ok: true, postId, url, mode });
      } catch (err: any) {
        results.push({ blogId: blog.id, blogName: blog.name, ok: false, error: err?.message || 'Publikasi gagal.' });
        if (err?.needsAuth) {
          return res.status(401).json({ error: err.message, needsAuth: true, results });
        }
      }
      await new Promise((r) => setTimeout(r, 350)); // sopan terhadap kuota API
    }

    const okCount = results.filter((r) => r.ok).length;
    res.json({
      success: okCount > 0,
      published: okCount,
      failed: results.length - okCount,
      results,
      history: state.history.slice(0, 50),
    });
  });

  app.get('/api/blogger/history', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    res.json({ history: load().history.slice(0, 200) });
  });

  // ------------------------------------------------------------------
  // Antrean publikasi batch: banyak artikel × banyak blog, jeda bertahap,
  // status persisten (aman jika aplikasi ditutup), dan pemantauan status.
  // ------------------------------------------------------------------
  const queueFile = path.join(opts.dataDir, 'blogger-queue.json');
  const MAX_QUEUE_ITEMS = 500;
  const QUEUE_BATCH_PER_TICK = 5;

  function saveQueue(queue: QueueState) {
    fs.mkdirSync(opts.dataDir, { recursive: true });
    fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2), { mode: 0o600 });
  }

  function loadQueue(): QueueState {
    let queue: QueueState;
    try {
      const parsed = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
      queue = { paused: !!parsed.paused, items: Array.isArray(parsed.items) ? parsed.items : [] };
    } catch {
      return { paused: false, items: [] };
    }
    // Pekerjaan yang tertinggal di status "running" (mis. aplikasi ditutup di tengah proses)
    // dikembalikan ke antrean agar tidak menggantung selamanya.
    let recovered = false;
    const now = Date.now();
    for (const item of queue.items) {
      const stamp = Date.parse(item.updatedAt || item.createdAt || '');
      if (item.status === 'running' && (isNaN(stamp) || now - stamp > 10 * 60_000)) {
        item.status = 'queued';
        item.lastError = 'Dikembalikan ke antrean setelah proses terhenti.';
        item.updatedAt = new Date().toISOString();
        recovered = true;
      }
    }
    if (recovered) saveQueue(queue);
    return queue;
  }

  function queueCounts(items: QueueItem[]) {
    return {
      total: items.length,
      queued: items.filter((i) => i.status === 'queued').length,
      running: items.filter((i) => i.status === 'running').length,
      done: items.filter((i) => i.status === 'done').length,
      failed: items.filter((i) => i.status === 'failed').length,
      nextAt:
        items
          .filter((i) => i.status === 'queued')
          .map((i) => i.scheduledAt)
          .sort()[0] || null,
    };
  }

  function publicQueue(queue: QueueState = loadQueue()) {
    const sorted = [...queue.items].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
    return {
      paused: queue.paused,
      counts: queueCounts(queue.items),
      // Isi artikel tidak dikirim ke UI (bisa besar); cukup metadata pekerjaan.
      items: sorted.slice(0, 300).map(({ post, ...rest }) => rest),
    };
  }

  let queueBusy = false;
  async function processQueue(): Promise<{ processed: number }> {
    if (queueBusy) return { processed: 0 };
    queueBusy = true;
    try {
      const queue = loadQueue();
      if (queue.paused) return { processed: 0 };
      const state = load();
      if (!state.tokens) return { processed: 0 }; // belum terhubung: biarkan menunggu

      const due = queue.items
        .filter((i) => i.status === 'queued' && Date.parse(i.scheduledAt) <= Date.now())
        .slice(0, QUEUE_BATCH_PER_TICK);
      if (!due.length) return { processed: 0 };

      let blogs: any[];
      try {
        blogs = await listBlogs(state);
      } catch (err) {
        console.error('Queue: gagal membaca daftar blog:', err);
        return { processed: 0 };
      }

      let processed = 0;
      for (const item of due) {
        const fresh = loadQueue();
        const target = fresh.items.find((i) => i.id === item.id);
        if (!target || target.status !== 'queued') continue;

        target.status = 'running';
        target.startedAt = new Date().toISOString();
        target.updatedAt = target.startedAt;
        target.attempts += 1;
        saveQueue(fresh);

        try {
          const blog = blogs.find((b: any) => b.id === target.blogId);
          if (!blog) {
            throw new Error('Blog tidak ditemukan di akun Google ini (mungkin dihapus atau aksesnya dicabut).');
          }
          const { postId, url } = await publishOne(state, blog, target.post, target.mode, null, target.articleId);
          const done = loadQueue();
          const current = done.items.find((i) => i.id === target.id);
          if (current) {
            current.status = 'done';
            current.postId = postId;
            current.url = url;
            current.lastError = '';
            current.finishedAt = new Date().toISOString();
            current.updatedAt = current.finishedAt;
          }
          saveQueue(done);
        } catch (err: any) {
          const failed = loadQueue();
          const current = failed.items.find((i) => i.id === target.id);
          if (current) {
            current.status = 'failed';
            current.lastError = err?.message || 'Publikasi gagal.';
            current.finishedAt = new Date().toISOString();
            current.updatedAt = current.finishedAt;
          }
          saveQueue(failed);
          if (err?.needsAuth) break;
        }

        processed += 1;
        await new Promise((r) => setTimeout(r, 500)); // sopan terhadap kuota API
      }
      return { processed };
    } finally {
      queueBusy = false;
    }
  }

  app.get('/api/blogger/queue', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    res.setHeader('Cache-Control', 'no-store');
    res.json(publicQueue());
  });

  app.post('/api/blogger/queue', async (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const { items, blogIds, startAt, intervalMinutes = 15, mode = 'draft' } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Pilih minimal satu artikel.' });
    if (items.length > 100) return res.status(400).json({ error: 'Maksimal 100 artikel per batch.' });
    if (!Array.isArray(blogIds) || blogIds.length === 0) return res.status(400).json({ error: 'Pilih minimal satu blog tujuan.' });
    if (blogIds.length > 100) return res.status(400).json({ error: 'Maksimal 100 blog per batch.' });
    if (!['draft', 'live'].includes(mode)) return res.status(400).json({ error: 'Mode antrean harus draft atau live.' });

    const interval = Number(intervalMinutes);
    if (!Number.isFinite(interval) || interval < 0 || interval > 1440) {
      return res.status(400).json({ error: 'Jeda harus antara 0 dan 1440 menit.' });
    }
    for (const item of items) {
      if (!item || typeof item.title !== 'string' || !item.title.trim()) {
        return res.status(400).json({ error: 'Ada artikel tanpa judul.' });
      }
      if (typeof item.content !== 'string' || !item.content.trim()) {
        return res.status(400).json({ error: `Artikel "${item.title}" tidak punya isi.` });
      }
      if (item.content.length > 900_000) {
        return res.status(413).json({ error: `Artikel "${item.title}" terlalu panjang untuk satu post Blogspot.` });
      }
    }

    const total = items.length * blogIds.length;
    if (total > MAX_QUEUE_ITEMS) {
      return res.status(400).json({ error: `Batch terlalu besar (${total} pekerjaan). Maksimal ${MAX_QUEUE_ITEMS}.` });
    }

    const startMs = startAt ? Date.parse(String(startAt)) : Date.now();
    if (isNaN(startMs)) return res.status(400).json({ error: 'Waktu mulai tidak valid.' });
    if (startMs < Date.now() - 60_000) return res.status(400).json({ error: 'Waktu mulai sudah lewat.' });

    // Nama blog untuk tampilan antrean (best effort; antrean tetap bisa dibuat walau belum terhubung).
    const names = new Map<string, string>();
    try {
      for (const blog of await listBlogs(load())) names.set(blog.id, blog.name);
    } catch {
      /* tetap lanjut */
    }

    const queue = loadQueue();
    const active = queue.items.filter((i) => i.status === 'queued' || i.status === 'running').length;
    if (active + total > MAX_QUEUE_ITEMS) {
      return res.status(400).json({
        error: `Antrean sudah berisi ${active} pekerjaan aktif. Selesaikan atau hapus dulu (maks ${MAX_QUEUE_ITEMS}).`,
      });
    }

    const stamp = Date.now();
    const nowIso = new Date().toISOString();
    let index = 0;
    const created: QueueItem[] = [];
    for (const item of items) {
      for (const blogId of blogIds) {
        const id = String(blogId);
        created.push({
          id: `q-${stamp}-${index + 1}`,
          articleId: String(item.articleId || ''),
          articleTitle: String(item.title).trim(),
          blogId: id,
          blogName: names.get(id) || `Blog ${id}`,
          mode: mode as 'draft' | 'live',
          scheduledAt: new Date(startMs + index * interval * 60_000).toISOString(),
          status: 'queued',
          attempts: 0,
          post: { ...item, title: String(item.title).trim() } as BloggerPostInput,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        index += 1;
      }
    }

    queue.items.push(...created);
    saveQueue(queue);
    res.json({ success: true, created: created.length, queue: publicQueue(queue) });
  });

  app.post('/api/blogger/queue/pause', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const queue = loadQueue();
    queue.paused = !!req.body?.paused;
    saveQueue(queue);
    res.json({ success: true, paused: queue.paused, queue: publicQueue(queue) });
  });

  app.post('/api/blogger/queue/run', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const id = String(req.body?.id || '');
    const queue = loadQueue();
    const item = queue.items.find((i) => i.id === id);
    if (!item) return res.status(404).json({ error: 'Pekerjaan tidak ditemukan.' });
    if (item.status === 'running') return res.status(400).json({ error: 'Pekerjaan ini sedang diproses.' });
    item.status = 'queued';
    item.scheduledAt = new Date().toISOString();
    item.lastError = undefined;
    item.updatedAt = new Date().toISOString();
    saveQueue(queue);
    processQueue().catch((err) => console.error('Queue run error:', err));
    res.json({ success: true, queue: publicQueue(queue) });
  });

  app.post('/api/blogger/queue/retry', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const id = String(req.body?.id || '');
    const queue = loadQueue();
    const item = queue.items.find((i) => i.id === id);
    if (!item) return res.status(404).json({ error: 'Pekerjaan tidak ditemukan.' });
    item.status = 'queued';
    item.scheduledAt = new Date().toISOString();
    item.lastError = undefined;
    item.finishedAt = undefined;
    item.updatedAt = new Date().toISOString();
    saveQueue(queue);
    processQueue().catch((err) => console.error('Queue retry error:', err));
    res.json({ success: true, queue: publicQueue(queue) });
  });

  app.post('/api/blogger/queue/remove', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const id = String(req.body?.id || '');
    const queue = loadQueue();
    const before = queue.items.length;
    queue.items = queue.items.filter((i) => i.id !== id || i.status === 'running');
    saveQueue(queue);
    res.json({ success: before !== queue.items.length, queue: publicQueue(queue) });
  });

  app.post('/api/blogger/queue/clear', (req: any, res: any) => {
    if (!opts.requireAdmin(req, res)) return;
    const queue = loadQueue();
    queue.items = queue.items.filter((i) => i.status === 'queued' || i.status === 'running');
    saveQueue(queue);
    res.json({ success: true, queue: publicQueue(queue) });
  });

  // Worker antrean: berjalan setiap 20 detik selama aplikasi terbuka.
  const queueTimer = setInterval(() => {
    processQueue().catch((err) => console.error('Queue tick error:', err));
  }, 20_000);
  if (typeof (queueTimer as any).unref === 'function') (queueTimer as any).unref();
  processQueue().catch((err) => console.error('Queue initial tick error:', err));
}
