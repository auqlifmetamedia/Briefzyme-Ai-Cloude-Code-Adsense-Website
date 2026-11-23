import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import { RESERVED_SLUGS } from './src/utils/routes.ts';
import { isLive } from './src/utils/publishState.ts';
import {
  expandOutlineToArticle,
  generateArticleFromOutlineAI,
  translateArticleWithAI,
  buildDefaultOutline,
  normalizeHeadlineTitleCase,
  runQualityGate,
  TARGET_LANGS,
} from './src/utils/articleGeneratorEngine.ts';
import type { ModelCaller } from './src/utils/articleGeneratorEngine.ts';
import {
  buildTopicImagePrompt,
  buildTopicAltText,
  generateTopicVisualSvg,
  buildYouTubeSearchQueries,
  svgToDataUrl,
  deriveArticleVisualization,
} from './src/utils/topicVisuals.ts';
import {
  detectRepeatedPhrasePatterns,
  detectTemplatedHeadingEchoes,
  detectTemplatedKeyTakeaways,
} from './src/utils/articleEnhancer.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Penyimpanan konten untuk pengembangan lokal (file JSON). Di Cloudflare diganti KV (lihat scripts/sync-api.mjs).
const DATA_FILE = path.resolve(__dirname, '.data/content.json');
const store = {
  available: () => true,
  async get(key: string): Promise<string | null> {
    try {
      const all = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return typeof all[key] === 'string' ? all[key] : null;
    } catch {
      return null;
    }
  },
  async put(key: string, value: string): Promise<void> {
    let all: Record<string, string> = {};
    try { all = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { /* file belum ada */ }
    all[key] = value;
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(all));
  },
};
const getAdminToken = () => process.env.ADMIN_TOKEN || '';
// Lokal: sajikan gambar unggahan dari penyimpanan dev (di Cloudflare ditangani worker/index.ts).
app.get('/img/:file', async (req, res) => {
  const id = String(req.params.file || '').split('.')[0];
  const raw = /^[a-f0-9]{16}$/.test(id) ? await store.get('briefzy:img:' + id) : null;
  if (!raw) return res.status(404).send('Not found');
  const { t, d } = JSON.parse(raw);
  res.setHeader('Content-Type', t);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(Buffer.from(d, 'base64'));
});
const ADMIN_OPEN_WHEN_UNSET = true; // lokal: tanpa ADMIN_TOKEN, admin terbuka. Di Cloudflare: ditolak.

app.use(express.json({ limit: '15mb' }));

// Initialize Google GenAI client if API key is present
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// -------------------------------------------------------------
// API: Automated SEO Article Generator (Google SEO / E-E-A-T Compliant)
// -------------------------------------------------------------
// Adapter: one place that knows how to talk to Gemini. The article engine only sees this function.
const makeModelCaller = (): ModelCaller | null => {
  if (!aiClient) return null;
  const client = aiClient;
  return async ({ system, prompt, json, maxTokens }) => {
    const response = await client.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: system,
        ...(json ? { responseMimeType: 'application/json' } : {}),
        maxOutputTokens: maxTokens ?? 4096,
      },
    });
    return response.text || '';
  };
};

// -------------------------------------------------------------
// Topic-matched Image & YouTube Helpers (Node + Cloudflare compatible)
// -------------------------------------------------------------
const ytSearchCache = new Map<string, { ts: number; videos: any[] }>();

function decodeHtmlEntities(s: string): string {
  return (s || '')
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function tokenizeTopicTerms(text: string): string[] {
  const stop = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'how',
    'what', 'when', 'where', 'which', 'into', 'guide', 'complete', 'practical',
    'step', 'steps', 'best', 'tools', '2025', '2026', 'tips', 'without', 'using',
  ]);
  return Array.from(
    new Set(
      (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !stop.has(w))
    )
  );
}

async function fetchWithTimeout(url: string, ms = 5500, headers: Record<string, string> = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyAndScoreYouTubeCandidates(
  candidates: { videoId: string; rawTitle?: string; rawAuthor?: string }[],
  contextText: string,
  limit = 3
) {
  const terms = tokenizeTopicTerms(contextText);
  const topCandidates = candidates.slice(0, 8);
  const verified = await Promise.all(
    topCandidates.map(async (c) => {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${c.videoId}`)}&format=json`;
        const resp = await fetchWithTimeout(oembedUrl, 4500);
        if (!resp.ok) return null;
        const data: any = await resp.json();
        if (!data?.title || !data?.html) return null;
        // Filter out portrait YouTube Shorts
        if (typeof data.width === 'number' && typeof data.height === 'number' && data.height > data.width) {
          return null;
        }
        const vTitle = String(data.title);
        const lowTitle = vTitle.toLowerCase();
        if (lowTitle.includes('#shorts')) return null;

        let score = 0;
        for (const t of terms) {
          if (lowTitle.includes(t)) score += 3;
          else if ((data.author_name || '').toLowerCase().includes(t)) score += 1;
        }
        if (/\b(tutorial|guide|how to|explained|walkthrough|setup|tips|review)\b/i.test(vTitle)) {
          score += 1;
        }

        return {
          videoId: c.videoId,
          title: vTitle,
          authorName: String(data.author_name || c.rawAuthor || 'YouTube Creator'),
          authorUrl: typeof data.author_url === 'string' ? data.author_url : undefined,
          thumbnailUrl: `https://i.image-proxy.invalid/`.startsWith('x')
            ? ''
            : String(data.thumbnail_url || `https://i.ytimg.com/vi/${c.videoId}/hqdefault.jpg`),
          embedUrl: `https://www.youtube-nocookie.com/embed/${c.videoId}`,
          watchUrl: `https://www.youtube.com/watch?v=${c.videoId}`,
          _score: score,
        };
      } catch {
        return null;
      }
    })
  );

  const clean = verified
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...rest }) => rest);

  return clean;
}

async function searchYouTubeVideos(opts: {
  query?: string;
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
  limit?: number;
}) {
  const limit = Math.min(6, Math.max(1, Number(opts.limit) || 3));
  const queries = opts.query?.trim()
    ? [opts.query.trim()]
    : buildYouTubeSearchQueries({
        title: opts.title,
        topic: opts.topic,
        keyword: opts.keyword,
        category: opts.category,
      });

  const primaryQuery = queries[0] || 'productivity tutorial';
  const contextText = `${opts.query || ''} ${opts.title || ''} ${opts.topic || ''} ${opts.keyword || ''} ${opts.category || ''}`;
  const cacheKey = `${primaryQuery.toLowerCase()}::${limit}`;
  const cached = ytSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 15 * 60 * 1000) {
    return { videos: cached.videos, query: primaryQuery };
  }

  const seenIds = new Set<string>();
  const candidates: { videoId: string; rawTitle?: string; rawAuthor?: string }[] = [];

  for (const q of queries) {
    if (candidates.length >= 10) break;
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D`;
      const resp = await fetchWithTimeout(searchUrl, 6000, {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (compatible; BriefzyEditorial/1.0)',
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      // Match videoRenderer objects (excludes reel/Shorts shelves)
      const re = /"videoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})"[\s\S]{0,600}?"title":\{"runs":\[\{"text":"([^"\\]*(?:\\.[^"\\]*)*)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        const videoId = m[1];
        const rawTitle = decodeHtmlEntities(m[2]);
        if (!seenIds.has(videoId) && !/#shorts/i.test(rawTitle)) {
          seenIds.add(videoId);
          candidates.push({ videoId, rawTitle });
          if (candidates.length >= 10) break;
        }
      }
      // Fallback regex if markup varies
      if (candidates.length === 0) {
        const idRe = /"videoId":"([A-Za-z0-9_-]{11})"/g;
        let idm: RegExpExecArray | null;
        while ((idm = idRe.exec(html)) !== null) {
          const id = idm[1];
          if (!seenIds.has(id)) {
            seenIds.add(id);
            candidates.push({ videoId: id });
            if (candidates.length >= 8) break;
          }
        }
      }
    } catch {
      // Try next query
    }
  }

  const videos = await verifyAndScoreYouTubeCandidates(candidates, contextText, limit);
  if (videos.length > 0) {
    ytSearchCache.set(cacheKey, { ts: Date.now(), videos });
  }
  return { videos, query: primaryQuery };
}

// Ringkasan error Gemini yang bisa dibaca manusia (bahasa Indonesia).
// Pesan mentah Gemini adalah blob JSON yang panjang; yang ditampilkan ke admin
// hanya intinya supaya jelas kenapa generate gagal. Kasus terpenting: error 429
// dengan "limit: 0" artinya model gambar itu TIDAK tersedia di Free Tier sama
// sekali — menunggu tidak membantu, hanya billing yang mengaktifkannya.
function summarizeImageGenError(err: any, modelName: string): string {
  const raw = String(err?.message || err || `Model ${modelName} unavailable`);
  let code = 0;
  let detail = raw;
  const jsonMatch = raw.match(/\{[\s\S]*"error"[\s\S]*\}/);
  try {
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    code = Number(parsed?.error?.code) || 0;
    detail = String(parsed?.error?.message || raw);
  } catch {
    const m = raw.match(/"code"\s*:\s*(\d+)/);
    if (m) code = Number(m[1]);
  }
  if (code === 429) {
    if (/limit:\s*0/i.test(detail)) {
      return `Kuota gratis Gemini untuk model gambar ${modelName} adalah 0 (model ini tidak tersedia di Free Tier). Aktifkan billing pay-as-you-go di Google AI Studio / Google Cloud agar generate gambar bisa jalan.`;
    }
    return `Kuota Gemini untuk ${modelName} habis (429). Coba lagi nanti atau aktifkan billing di Google AI Studio.`;
  }
  if (code === 404) return `Model gambar ${modelName} tidak ditemukan di Gemini API (404).`;
  if (code === 401 || code === 403) return `API key Gemini ditolak (${code}). Periksa GEMINI_API_KEY di server.`;
  const firstLine = detail.split('\n').find((l) => l.trim())?.trim() || raw.slice(0, 200);
  return `${modelName}: ${firstLine.slice(0, 200)}`;
}

// Ukuran gambar yang diminta ke Pollinations per aspect ratio.
const POLLINATIONS_SIZES: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1200, height: 630 },
  '3:2': { width: 1200, height: 800 },
  '4:3': { width: 1152, height: 864 },
  '1:1': { width: 1024, height: 1024 },
  '9:16': { width: 630, height: 1200 },
};

// Fallback GRATIS (Pollinations / Flux): tanpa API key, tanpa billing.
// Dipakai kalau Gemini gagal (mis. kuota Free Tier 0) atau key belum diset.
// Mengembalikan data URL foto, atau null kalau Pollinations juga gagal.
// Catatan: foto gratis ini membawa watermark kecil "pollinations.ai" di pojok.
//
// Pollinations dari balik Cloudflare Workers kadang langsung ditolak (429,
// kemungkinan rate limit di IP egress bersama) lalu berhasil saat dicoba lagi
// — jadi dicoba sampai 3x dengan jeda. (Terbukti di live: 1x berhasil 200
// dalam 6 detik, 1x gagal 502 dalam 1,2 detik, dengan prompt dan UA yang sama.)
async function generatePollinationsImage(
  prompt: string,
  aspectRatio: string,
): Promise<{ imageUrl: string; model: string; source: string } | null> {
  const size = POLLINATIONS_SIZES[aspectRatio] || POLLINATIONS_SIZES['16:9'];
  const baseSeed = Math.floor(Math.random() * 1_000_000);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=${size.width}&height=${size.height}&model=flux&nologo=true&seed=${baseSeed + attempt}`;
    try {
      const res = await fetchWithTimeout(url, 60000, {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          console.warn(`Pollinations fallback failed: unexpected content-type ${contentType}`);
          return null;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 1000) return null;
        const mime = contentType.split(';')[0].trim() || 'image/jpeg';
        return {
          imageUrl: `data:${mime};base64,${buf.toString('base64')}`,
          model: 'pollinations-flux',
          source: 'pollinations',
        };
      }
      // 429/5xx sifatnya sementara — coba lagi. 4xx lain (mis. 403) tidak
      // akan membaik dengan retry, jadi langsung menyerah.
      const retryable = res.status === 429 || res.status >= 500;
      console.warn(`Pollinations fallback attempt ${attempt} failed: HTTP ${res.status}`);
      if (!retryable || attempt === 3) return null;
    } catch (err: any) {
      console.warn(`Pollinations fallback attempt ${attempt} failed:`, err?.message || err);
      if (attempt === 3) return null;
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
  return null;
}

async function generateTopicImageAsset(opts: {
  prompt?: string;
  title?: string;
  topic?: string;
  keyword?: string;
  secondaryKeywords?: string[];
  category?: string;
  visualStyle?: 'editorial-scene' | 'visual-diagram' | 'workspace-photo' | 'flat-illustration';
  aspectRatio?: string;
  imageSize?: string;
  useSearch?: boolean;
  model?: string;
  // strict: dipakai AI Image Studio. Kalau true, kegagalan Gemini dilempar
  // sebagai error — bukan disamarkan jadi gambar SVG "sukses".
  strict?: boolean;
}) {
  const aspectRatio = opts.aspectRatio || '16:9';
  const enrichedPrompt = buildTopicImagePrompt({
    prompt: opts.prompt,
    title: opts.title,
    topic: opts.topic,
    keyword: opts.keyword,
    secondaryKeywords: opts.secondaryKeywords,
    category: opts.category,
    visualStyle: opts.visualStyle || 'editorial-scene',
  });

  const needsProModel =
    opts.model === 'gemini-nano-banana-2.1' ||
    !!opts.useSearch ||
    opts.imageSize === '2K' ||
    opts.imageSize === '4K';
  const chosenModel = needsProModel ? 'gemini-nano-banana-2.1' : 'gemini-3.1-flash-lite-image';

  // Semua error dikumpulkan (dulu hanya error terakhir yang disimpan, jadi
  // penyebab gagalnya model pertama tidak pernah terlihat).
  const errors: string[] = [];

  if (aiClient) {
    const modelsToTry =
      chosenModel === 'gemini-3.1-flash-lite-image'
        ? ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1']
        : ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];

    for (const modelName of modelsToTry) {
      try {
        const config: any = {
          imageConfig: {
            aspectRatio,
            ...(modelName === 'gemini-nano-banana-2.1' && opts.imageSize ? { imageSize: opts.imageSize } : {}),
          },
        };
        if (opts.useSearch && modelName === 'gemini-nano-banana-2.1') {
          config.tools = [
            {
              googleSearch: {
                searchTypes: {
                  webSearch: {},
                  imageSearch: {},
                },
              },
            },
          ];
        }

        const response = await aiClient.models.generateContent({
          model: modelName,
          contents: enrichedPrompt,
          config,
        });

        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return {
              imageUrl: `data:${mime};base64,${part.inlineData.data}`,
              model: modelName,
              source: modelName,
              prompt: enrichedPrompt,
              aspectRatio,
              imageSize: opts.imageSize || '1K',
            };
          }
        }
        // Gemini menjawab tapi tanpa gambar (mis. hanya teks) — itu gagal juga.
        errors.push(`${modelName}: Gemini tidak mengembalikan gambar.`);
      } catch (err: any) {
        const summary = summarizeImageGenError(err, modelName);
        errors.push(summary);
        console.warn(`Image generation failed on ${modelName}:`, summary);
      }
    }
  } else {
    errors.push('GEMINI_API_KEY belum dikonfigurasi di server.');
  }

  // Fallback GRATIS (Pollinations / Flux): dicoba kalau Gemini gagal atau key
  // belum diset, sebelum menyerah ke ilustrasi SVG. Foto gratis ini membawa
  // watermark kecil "pollinations.ai" di pojok — disampaikan lewat `warning`.
  const freeImage = await generatePollinationsImage(enrichedPrompt, aspectRatio);
  if (freeImage) {
    return {
      ...freeImage,
      prompt: enrichedPrompt,
      aspectRatio,
      imageSize: opts.imageSize || '1K',
      warning:
        'Foto gratis dari Pollinations (Flux) — ada watermark kecil pollinations.ai di pojok gambar.',
    };
  }

  // Mode strict (dipakai AI Image Studio): kegagalan Gemini adalah error,
  // bukan gambar SVG. Dulu endpoint mengembalikan success:true + SVG sehingga
  // dari dashboard terlihat seperti generate "berhasil" padahal yang tampil
  // hanya ilustrasi placeholder — inilah kenapa generate selalu "gagal".
  if (opts.strict) {
    throw new Error(
      [...errors, 'Fallback gratis (Pollinations) juga gagal.'].join(' ') ||
        'Gagal generate gambar.',
    );
  }

  const svg = generateTopicVisualSvg({
    prompt: opts.prompt,
    title: opts.title,
    topic: opts.topic,
    keyword: opts.keyword,
    category: opts.category,
    aspectRatio,
    styleMode: opts.visualStyle || 'editorial-scene',
  });

  return {
    imageUrl: svgToDataUrl(svg),
    model: 'editorial-canvas-engine',
    source: 'editorial-canvas-engine',
    prompt: enrichedPrompt,
    aspectRatio,
    imageSize: opts.imageSize || '1K',
    warning: errors.join(' ') || undefined,
    errors,
  };
}

app.post('/api/seo/generate-article', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const {
    topic,
    primaryKeyword,
    category = 'Productivity & AI Tools',
    targetCountry = 'United States',
    outline = null,
    fieldNotes = '',
  } = req.body;

  if (!topic && !primaryKeyword && !outline) {
    return res.status(400).json({ error: 'Topic or Primary Keyword is required' });
  }

  const promptTopic = String(topic || primaryKeyword || outline?.workingTitle).trim();
  const keyword = String(primaryKeyword || outline?.targetPrimaryKeyword || promptTopic).trim();
  const cleanFieldNotes = String(fieldNotes || '').trim();

  // Author mapping strictly aligned with real profiles in src/data/mockTeam.ts (no academic titles)
  const catLower = (category || '').toLowerCase();
  const aiWriters = ['Sarah Jenkins', 'Priya Nair', 'Hannah Kim', 'Alex Rivera'];
  const secWriters = ['David Chen', 'Nadia Kowalski', 'Omar Farooq'];
  const workWriters = ['Maya Patel', 'Sofia Alvarez', 'Chloe Martin'];
  const techWriters = ['Daniel Brooks', 'Rachel Torres', 'Marcus Reid', 'Trevor Hall'];
  const pool =
    catLower.includes('security') || catLower.includes('cyber') || catLower.includes('priva')
      ? secWriters
      : catLower.includes('remote') || catLower.includes('work') || catLower.includes('career')
      ? workWriters
      : catLower.includes('how') || catLower.includes('device') || catLower.includes('gadget') || catLower.includes('everyday') || catLower.includes('tech')
      ? techWriters
      : aiWriters;
  const chosenAuthor = pool[promptTopic.length % pool.length];

  let generatedArticle: any = null;
  let source = outline ? 'expanded-ai-outline' : 'curated-generator';

  const call = makeModelCaller();
  if (call) {
    try {
      generatedArticle = await generateArticleFromOutlineAI(call, {
        topic: promptTopic,
        keyword,
        category,
        targetCountry,
        author: chosenAuthor,
        outline,
        fieldNotes: cleanFieldNotes,
      });
      source = 'gemini-outline';
    } catch (genError) {
      console.error('Gemini outline generation error:', genError);
    }
  }

  if (!generatedArticle) {
    generatedArticle = expandOutlineToArticle(outline, promptTopic, keyword, category, targetCountry, chosenAuthor, cleanFieldNotes);
  }

  // Enrich with topic-matched hero image, alt text, visualization, and verified YouTube tutorials
  try {
    const [imgRes, ytRes] = await Promise.all([
      generateTopicImageAsset({
        title: generatedArticle.title,
        topic: promptTopic,
        keyword: generatedArticle.primaryKeyword || keyword,
        secondaryKeywords: generatedArticle.secondaryKeywords || [],
        category,
        visualStyle: 'editorial-scene',
        aspectRatio: '16:9',
      }).catch(() => null),
      searchYouTubeVideos({
        title: generatedArticle.title,
        topic: promptTopic,
        keyword: generatedArticle.primaryKeyword || keyword,
        category,
        limit: 3,
      }).catch(() => ({ videos: [], query: keyword })),
    ]);

    if (imgRes?.imageUrl) {
      generatedArticle.featuredImage = imgRes.imageUrl;
    }
    generatedArticle.imageAlt = buildTopicAltText({
      title: generatedArticle.title,
      keyword: generatedArticle.primaryKeyword || keyword,
      category,
    });
    if (ytRes?.videos?.length) {
      generatedArticle.youtubeVideos = ytRes.videos;
    }
    if (!generatedArticle.visualization) {
      generatedArticle.visualization = deriveArticleVisualization({
        title: generatedArticle.title,
        category,
        primaryKeyword: generatedArticle.primaryKeyword || keyword,
        content: generatedArticle.content,
        keyTakeaways: generatedArticle.keyTakeaways,
      });
    }
  } catch (enrichErr) {
    console.warn('Article enrichment warning:', enrichErr);
  }

  // Quality gate: template fallback drafts and gate failures may never go
  // live as if they were finished articles. They are returned as drafts.
  const isTemplateFallback = source !== 'gemini-outline';
  if (isTemplateFallback) {
    source = 'template-fallback-draft-only';
    generatedArticle.isTemplateFallback = true;
    generatedArticle.templateFallback = true;
  }
  const qualityGate = runQualityGate({
    title: generatedArticle.title,
    content: generatedArticle.content,
    keyTakeaways: generatedArticle.keyTakeaways || [],
    primaryKeyword: generatedArticle.primaryKeyword || keyword,
    topic: promptTopic,
    fieldNotes: cleanFieldNotes,
  });
  generatedArticle.qualityGate = qualityGate;
  const needsFieldNotes = cleanFieldNotes.length < 80;
  const publishBlocked = isTemplateFallback || !qualityGate.passed;
  generatedArticle.draft = publishBlocked;
  const warnings: string[] = [];
  if (isTemplateFallback) warnings.push('Gemini unavailable — template draft only, DO NOT PUBLISH without human rewrite');
  if (needsFieldNotes) warnings.push('Add first-hand field notes (80+ characters) before publishing');
  if (!qualityGate.passed) warnings.push(...qualityGate.blockers);

  return res.json({
    success: true,
    article: generatedArticle,
    source,
    wordCount: generatedArticle.wordCount,
    draft: publishBlocked,
    publishBlocked,
    needsFieldNotes,
    qualityGate,
    warning: warnings.length ? warnings.join(' ') : undefined,
    warnings,
  });
});

// Translates a finished article into one language with Gemini (called once per language by the admin editor).
app.post('/api/seo/translate-article', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { lang, article } = req.body || {};
  if (!TARGET_LANGS.includes(lang)) {
    return res.status(400).json({ error: 'lang must be one of: es, de, fr, ja' });
  }
  if (!article || typeof article.content !== 'string' || !article.content.trim() || article.content.length > 400000) {
    return res.status(400).json({ error: 'article.content is required' });
  }
  const call = makeModelCaller();
  if (!call) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY belum diatur di server, jadi artikel tidak bisa diterjemahkan otomatis.',
      needsKey: true,
    });
  }
  try {
    const translation = await translateArticleWithAI(call, {
      title: String(article.title || ''),
      metaDescription: String(article.metaDescription || ''),
      keyTakeaways: Array.isArray(article.keyTakeaways) ? article.keyTakeaways.map(String) : [],
      faqs: Array.isArray(article.faqs) ? article.faqs.map((f: any) => ({ question: String(f?.question || ''), answer: String(f?.answer || '') })) : [],
      content: article.content,
    }, lang);
    return res.json({ success: true, lang, translation });
  } catch (err: any) {
    console.error('Translation error:', err?.message);
    return res.status(502).json({ error: err?.message || 'Translation failed' });
  }
});

// -------------------------------------------------------------
// API: Keyword Performance Analyzer & Search Volume
// -------------------------------------------------------------
app.post('/api/seo/analyze-keyword', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { keyword } = req.body;
  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  const clean = keyword.toLowerCase().trim();
  // Generate realistic metrics tailored for Tier 1 search economics
  const hash = clean.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const volume = 8500 + (hash * 37) % 45000;
  const difficulty = 32 + (hash % 45); // 32 to 77
  const cpc = (3.5 + ((hash % 180) / 10)).toFixed(2);
  const trend = hash % 2 === 0 ? '+18%' : '+34%';

  res.json({
    keyword: clean,
    volume,
    difficulty,
    cpc: `$${cpc}`,
    trend,
    competition: difficulty > 60 ? 'High' : difficulty > 40 ? 'Medium' : 'Low',
    intent: hash % 3 === 0 ? 'Informational' : hash % 3 === 1 ? 'Commercial' : 'Transactional',
    tier1Demographics: {
      US: '52%',
      UK: '21%',
      CA: '14%',
      AU: '10%',
      NZ: '3%',
    },
    suggestedLsi: [
      `best ${clean} tools 2026`,
      `how to use ${clean} for business`,
      `${clean} vs alternatives`,
      `cost of ${clean} implementation`,
    ],
  });
});

// -------------------------------------------------------------
// API: High-Volume / Low-Competition SEO Keywords & AI Indexing Suggestions
// -------------------------------------------------------------
app.post('/api/seo/suggest-keywords', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { topic = '', category = 'Technology', seedKeyword = '' } = req.body;
  const currentTopic = topic || seedKeyword || 'Enterprise AI Architecture';

  if (aiClient) {
    try {
      const prompt = `You are a Tier-1 SEO research director and algorithmic indexing specialist.
Analyze this topic: "${currentTopic}" (Category: "${category}").
Identify 5 high-potential, high-search-volume yet LOW-COMPETITION (Golden Ratio) SEO keywords that:
1. Have strong monthly search demand in Tier-1 countries (US, UK, CA, AU).
2. Have low keyword difficulty / low domain competition so a new or growing authority site can rank on Google Page 1 quickly.
3. Are optimized for immediate semantic understanding by Google's RankBrain, Helpful Content System, and modern AI/LLM crawlers (GPTBot, PerplexityBot, Google-Extended, ClaudeBot).
4. Include an optimized High-CTR Auto Title that places the keyword upfront.

Return STRICT JSON matching this schema:
{
  "seedTopic": "${currentTopic}",
  "keywords": [
    {
      "keyword": "High Potential Keyword",
      "searchVolume": "24,500/mo",
      "difficulty": 22,
      "difficultyLabel": "Low Competition (High Rank Potential)",
      "potentialScore": 95,
      "estimatedCpc": "$11.40",
      "indexingSpeed": "Fast Indexing (<24h)",
      "crawlerScore": "98/100 (Googlebot & AI SGE Priority)",
      "intent": "Informational | Commercial",
      "autoTitle": "Keyword: 2026 Executive Architecture & Playbook",
      "secondaryLsi": ["lsi keyword 1", "lsi keyword 2", "lsi keyword 3"]
    }
  ]
}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.keywords && Array.isArray(parsed.keywords)) {
        parsed.keywords = parsed.keywords.map((item: any) => ({
          ...item,
          autoTitle: item?.autoTitle ? normalizeHeadlineTitleCase(String(item.autoTitle)) : item?.autoTitle,
        }));
        return res.json({ success: true, ...parsed, source: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini keyword suggest error:', err);
    }
  }

  // Curated topic-adaptive fallback for High Search Volume / Low Competition keywords
  const cleanSeed = normalizeHeadlineTitleCase(currentTopic || 'Practical Productivity Workflows');
  const catLabel = (category || 'Practical Guide').trim();
  const fallbackKeywords = [
    {
      keyword: `how to set up ${cleanSeed.toLowerCase()}`,
      searchVolume: '32,400/mo',
      difficulty: 18,
      difficultyLabel: 'Low Competition (High Rank Potential)',
      potentialScore: 97,
      estimatedCpc: '$8.40',
      indexingSpeed: 'Fast Indexing (<12h)',
      crawlerScore: '99/100 (Googlebot & AI SGE Priority)',
      intent: 'Informational & How-To',
      autoTitle: `How to Set Up ${cleanSeed}: Practical Step-by-Step Guide`,
      secondaryLsi: [`${cleanSeed} checklist`, `${cleanSeed} common mistakes`, `best ${cleanSeed} setup`],
    },
    {
      keyword: `best ${cleanSeed.toLowerCase()} for beginners`,
      searchVolume: '28,100/mo',
      difficulty: 21,
      difficultyLabel: 'Low Competition (High Opportunity)',
      potentialScore: 94,
      estimatedCpc: '$9.20',
      indexingSpeed: 'Fast Indexing (<24h)',
      crawlerScore: '96/100 (Google SGE Direct Answer)',
      intent: 'Commercial & Informational',
      autoTitle: `Best ${cleanSeed} for Beginners: What Actually Works`,
      secondaryLsi: [`${cleanSeed} comparison`, `${cleanSeed} free vs paid`, `${cleanSeed} workflow`],
    },
    {
      keyword: `${cleanSeed.toLowerCase()} tips and troubleshooting`,
      searchVolume: '19,500/mo',
      difficulty: 16,
      difficultyLabel: 'Very Low Competition (Golden Ratio)',
      potentialScore: 98,
      estimatedCpc: '$7.80',
      indexingSpeed: 'Instant Indexing (<6h)',
      crawlerScore: '97/100 (High Reader Retention)',
      intent: 'Informational',
      autoTitle: `${cleanSeed}: Common Pitfalls, Fixes & Daily Best Practices`,
      secondaryLsi: [`fix ${cleanSeed} issues`, `${cleanSeed} maintenance`, `${catLabel} habits`],
    },
    {
      keyword: `${cleanSeed.toLowerCase()} tools and workflow`,
      searchVolume: '45,200/mo',
      difficulty: 24,
      difficultyLabel: 'Low Competition (High Volume Target)',
      potentialScore: 93,
      estimatedCpc: '$10.40',
      indexingSpeed: 'Fast Indexing (<24h)',
      crawlerScore: '95/100 (Google Zero-Click Snippet)',
      intent: 'Informational & Commercial',
      autoTitle: `${cleanSeed}: Reliable Tools and Repeatable Workflow`,
      secondaryLsi: [`${cleanSeed} tools`, `${cleanSeed} alternatives`, `${cleanSeed} budget options`],
    },
    {
      keyword: `${cleanSeed.toLowerCase()} safety and privacy`,
      searchVolume: '22,700/mo',
      difficulty: 19,
      difficultyLabel: 'Low Competition (High Trust Intent)',
      potentialScore: 96,
      estimatedCpc: '$11.90',
      indexingSpeed: 'Fast Indexing (<18h)',
      crawlerScore: '98/100 (E-E-A-T Authority Signal)',
      intent: 'Informational',
      autoTitle: `${cleanSeed}: Privacy Checks and Everyday Safety Rules`,
      secondaryLsi: [`${cleanSeed} risks`, `${cleanSeed} privacy settings`, `${cleanSeed} verification`],
    },
  ];

  return res.json({
    success: true,
    seedTopic: currentTopic,
    keywords: fallbackKeywords,
    source: 'algorithmic-analyzer',
  });
});

// -------------------------------------------------------------
// API: Auto-Title Generator based on Primary Keyword
// -------------------------------------------------------------
app.post('/api/seo/auto-titles', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { primaryKeyword = '', topic = '', category = 'Productivity & AI Tools' } = req.body;
  const kw = (primaryKeyword || topic || 'Practical Digital Workflows').trim();

  if (aiClient) {
    try {
      const prompt = `You are a world-class Google Title Tag & SGE CTR optimization specialist.
Primary Keyword: "${kw}"
Category: "${category}"

Generate 4 diverse, high-performing article titles that:
1. Place the exact primary keyword near the beginning of the title.
2. Are between 50 and 60 characters (optimal for Google SERPs and mobile previews).
3. Maximize CTR while avoiding misleading clickbait.
4. Fit the topic category "${category}" naturally in plain English.

Return STRICT JSON matching this schema:
{
  "primaryKeyword": "${kw}",
  "titles": [
    {
      "title": "Title String",
      "formula": "Step-by-Step Guide | Practical Comparison | Quick Walkthrough | Common Fixes",
      "predictedCtr": "High (8.4% - 11.2%)",
      "indexingAdvantage": "Front-loaded keyword for maximum RankBrain prominence"
    }
  ]
}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.titles && Array.isArray(parsed.titles)) {
        parsed.titles = parsed.titles.map((item: any) => ({
          ...item,
          title: item?.title ? normalizeHeadlineTitleCase(String(item.title)) : item?.title,
        }));
        return res.json({ success: true, ...parsed, source: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini auto-titles error:', err);
    }
  }

  // Fallback high-CTR plain-English titles matched to the keyword & category (clean Title Case)
  const kwTitle = normalizeHeadlineTitleCase(kw);
  const fallbackTitles = [
    {
      title: `${kwTitle}: Complete Guide, Benchmarks and Practical Roadmap`,
      formula: 'Benchmarks + Roadmap Guide',
      predictedCtr: 'High (9.8%)',
      indexingAdvantage: 'Front-loaded keyword with clear benchmark & roadmap alignment',
    },
    {
      title: `How to Set Up ${kwTitle} Without Overcomplicating It`,
      formula: 'Plain-English Walkthrough',
      predictedCtr: 'High (8.9%)',
      indexingAdvantage: 'Matches real search phrasing and Helpful Content signals',
    },
    {
      title: `${kwTitle}: Real Trade-Offs, Metrics and Setup Checklist`,
      formula: 'Practical Comparison',
      predictedCtr: 'Very High (10.8%)',
      indexingAdvantage: 'Optimized for Google Featured Snippets and AI Overviews',
    },
    {
      title: `${kwTitle} Pitfalls to Avoid and What Tested Best`,
      formula: 'Experience-Backed Fix',
      predictedCtr: 'High (9.2%)',
      indexingAdvantage: 'Strong problem-solving intent and dwell-time signal',
    },
  ];

  return res.json({
    success: true,
    primaryKeyword: kw,
    titles: fallbackTitles,
    source: 'algorithmic-generator',
  });
});

// -------------------------------------------------------------
// API: AI-Powered Article & SEO Assistant (Briefzy Copilot)
// -------------------------------------------------------------
app.post('/api/seo/ai-assistant', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { mode = 'outline', topic = '', primaryKeyword = '', title = '', metaDescription = '', content = '', keyTakeaways = [], prompt = '', category = 'Technology', fieldNotes = '', context = null } = req.body || {};

  const currentTopic = topic || primaryKeyword || title || context?.topic || context?.primaryKeyword || 'Practical Technology & Productivity Guide';
  const notesContext = String(fieldNotes || '').trim();

  if (aiClient) {
    try {
      if (mode === 'outline') {
        const response = await aiClient.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Generate a Google E-E-A-T and Helpful Content compliant practical guide outline for the topic: "${currentTopic}" (Category: ${category}). First decide the article kind from the topic: how-to (how to / setup / guide / step-by-step), comparison (vs / compare / best / which), checklist, explainer (what is / how it works), or analysis — analysis (enterprise / strategy / blueprint framing) ONLY if the topic explicitly demands it, never for small-team, beginner, or home topics.
Target Audience: general English-speaking practitioners and readers (US/UK/CA/AU) who want hands-on, verifiable guidance in plain English.
${notesContext ? `Author First-Hand Testing / Field Notes to incorporate: "${notesContext}"\n` : ''}
Outline requirements:
1. Provide 5-7 crisp H2 sections appropriate to the article kind, whose targetWords add up to 1,800-2,800 words total (not 3,400+), each with 2 to 3 concrete H3 subtopics; avoid shallow filler subtopics.
2. Include a dedicated H2 section on "Verified Benchmarks, Evaluation Metrics and Trade-Offs" ONLY if the topic has public, citable benchmarks; include "Field Testing Assumptions, Real Failure Modes and Scope Limits" ONLY if the topic involves real testing or rollout risk. Never force either section on a simple how-to.
3. The workingTitle must match the article kind and the reader's search intent: a how-to starts with "How to ...", a comparison names both options, and enterprise/blueprint/Tier-1 framing is forbidden unless the topic is explicitly enterprise.
4. Use clean Title Case for workingTitle and every heading (never start headlines lowercase).
5. Include exactly 5 faqSchemaCandidates.

Return STRICT JSON in the following schema:
{
  "workingTitle": "Title-Cased High-CTR Non-Clickbait Title (55-65 chars)",
  "searchIntent": "Informational | Commercial Investigation",
  "estimatedWordCount": 2200,
  "targetAudience": "Practical readers, everyday practitioners, and remote professionals",
  "suggestedSlug": "clean-hyphenated-slug",
  "targetPrimaryKeyword": "${primaryKeyword || currentTopic}",
  "sections": [
    {
      "heading": "Title-Cased H2 Heading Text",
      "targetWords": 380,
      "subtopics": ["H3 point A", "H3 point B"],
      "keywordsToInclude": ["keyword 1", "keyword 2"],
      "recommendedCitations": "authoritative engineering documentation, OWASP/NIST standard, or verified research"
    }
  ],
  "faqSchemaCandidates": [
    "Question 1?",
    "Question 2?",
    "Question 3?",
    "Question 4?",
    "Question 5?"
  ],
  "expertTakeawayTip": "One practical insight grounded in real-world hands-on pilot testing."
}`,
          config: {
            responseMimeType: 'application/json',
          },
        });
        const parsed = JSON.parse(response.text || '{}');
        if (parsed.workingTitle) parsed.workingTitle = normalizeHeadlineTitleCase(String(parsed.workingTitle));
        if (Array.isArray(parsed.sections)) {
          parsed.sections = parsed.sections.map((s: any) => ({
            ...s,
            heading: s?.heading ? normalizeHeadlineTitleCase(String(s.heading)) : s?.heading,
          }));
        }
        return res.json({ success: true, mode: 'outline', data: parsed, source: 'gemini' });
      }

      if (mode === 'keywords') {
        const response = await aiClient.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Suggest high-value Tier 1 AdSense and Google SEO keywords for the topic: "${currentTopic}" (Category: ${category}).
Return STRICT JSON in the following schema:
{
  "primaryKeyword": "${primaryKeyword || currentTopic}",
  "primaryVolume": 18500,
  "primaryCpc": "$9.40",
  "primaryDifficulty": 48,
  "secondaryKeywords": [
    { "keyword": "string", "volume": 6200, "cpc": "$7.80", "difficulty": 42, "intent": "Informational" },
    { "keyword": "string", "volume": 4100, "cpc": "$12.10", "difficulty": 55, "intent": "Commercial" },
    { "keyword": "string", "volume": 3200, "cpc": "$8.50", "difficulty": 38, "intent": "Informational" },
    { "keyword": "string", "volume": 2400, "cpc": "$14.20", "difficulty": 62, "intent": "Transactional" }
  ],
  "longTailQuestions": [
    "How does X work in everyday practice?",
    "What is the real cost or effort of X?",
    "Common mistakes to avoid with X?"
  ],
  "highCpcNicheAdvice": "Tips to align the article with clear buyer/comparison intent without jargon."
}`,
          config: {
            responseMimeType: 'application/json',
          },
        });
        const parsed = JSON.parse(response.text || '{}');
        return res.json({ success: true, mode: 'keywords', data: parsed, source: 'gemini' });
      }

      if (mode === 'seo-audit') {
        const plainAuditText = String(content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const auditLower = plainAuditText.toLowerCase();
        const auditWords = plainAuditText ? plainAuditText.split(/\s+/).length : 0;
        const pBlocks = (String(content || '').match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [])
          .map((p) => p.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
          .filter((p) => p.length >= 45);
        const uniqP = new Set(pBlocks.map((p) => p.toLowerCase().replace(/[^a-z0-9\s]/g, '')));
        const uniquePct = pBlocks.length ? Math.round((uniqP.size / pBlocks.length) * 100) : auditWords > 0 ? 100 : 0;
        const templatedHits = detectTemplatedHeadingEchoes(String(content || ''));
        const templatedHeadingCount = templatedHits.length;
        const takeawaysArr = Array.isArray(keyTakeaways)
          ? keyTakeaways.map(String)
          : String(keyTakeaways || '').split('\n').map((l) => l.trim()).filter(Boolean);
        const takeawayAudit = detectTemplatedKeyTakeaways(takeawaysArr);
        const templatedTakeawaysCount = takeawayAudit.hasBoilerplate ? Math.max(1, takeawayAudit.repeatedPairs) : 0;
        const repeatReport = detectRepeatedPhrasePatterns(String(content || ''));
        const repeatedPhraseCount = repeatReport.repeatedClauseCount;

        const titleCaseOk = !String(title || '').trim() || !/^[a-z]/.test(String(title || '').trim());
        const promisesBench = /\b(benchmark|benchmarks|comparison|compare|metrics|roadmap)\b/i.test(String(title || ''));
        const hasBenchEvidence = /<table[\s>]/i.test(String(content || '')) && /\b(benchmark|metrics|assumptions|dimension|threshold)\b/i.test(auditLower);
        const hasAttributionSplit =
          /\b(third-party|external research|not independent|published external|study scope)\b/i.test(auditLower) &&
          /\b(internal|track locally|baseline|minutes spent|team evidence)\b/i.test(auditLower);
        const promiseAligned = !promisesBench || (auditWords > 120 && hasBenchEvidence);
        const benchmarkBoundaryClear = !promisesBench || (hasBenchEvidence && hasAttributionSplit);
        const hasExperience = /\b(field pilot|pilot lesson|failure mode|implementation observation|rollback|pitfall|trade-off)\b/i.test(auditLower);
        const hasExternalSrc = /<a\b[^>]*href=["']https?:\/\//i.test(String(content || '')) && /\b(assumptions|limitations|scope limits|methodology|sources)\b/i.test(auditLower);

        const auditPrompt = `Perform a strict Google Helpful Content & E-E-A-T audit on this article draft:
Title: "${title}"
Meta Description: "${metaDescription}"
Primary Keyword: "${primaryKeyword}"
Category: "${category}"
Computed Signals: words=${auditWords}, titleCaseOk=${titleCaseOk}, uniqueParagraphPct=${uniquePct}%, templatedHeadingCount=${templatedHeadingCount}, templatedTakeawaysCount=${templatedTakeawaysCount}, repeatedPhraseCount=${repeatedPhraseCount}, promiseAligned=${promiseAligned}, benchmarkBoundaryClear=${benchmarkBoundaryClear}, hasExperience=${hasExperience}, hasExternalSourcesAndLimits=${hasExternalSrc}
Content excerpt: "${plainAuditText.slice(0, 2200) || 'No content provided yet'}"

Return STRICT JSON:
{
  "overallScore": 84,
  "titleAnalysis": {
    "score": 88,
    "status": "Optimal | Warning | Critical",
    "feedback": "Feedback on title & Title Case CTR",
    "suggestedImprovements": ["Title-Cased Alternative 1", "Title-Cased Alternative 2"]
  },
  "metaDescriptionAnalysis": {
    "score": 85,
    "status": "Optimal | Warning | Critical",
    "charCount": ${metaDescription.length},
    "feedback": "Feedback on meta description"
  },
  "helpfulContentMetrics": {
    "titleCaseOk": ${titleCaseOk},
    "promiseAligned": ${promiseAligned},
    "benchmarkBoundaryClear": ${benchmarkBoundaryClear},
    "uniqueParagraphPct": ${uniquePct},
    "templatedHeadingCount": ${templatedHeadingCount},
    "templatedTakeawaysCount": ${templatedTakeawaysCount},
    "repeatedPhraseCount": ${repeatedPhraseCount},
    "hasExperienceSignals": ${hasExperience},
    "hasSourcesAndLimits": ${hasExternalSrc}
  },
  "contentAnalysis": {
    "score": 85,
    "keywordDensity": "1.6%",
    "eeatRating": "High | Moderate | Needs Work",
    "readabilityLevel": "Plain-English Practical Standard",
    "strengths": ["Clear section breakdown", "Strong practical examples"],
    "actionableFixes": ["Specific concrete fix 1", "Specific concrete fix 2"]
  },
  "googleGuidelinesChecklist": [
    { "item": "Title Case & primary keyword front-loaded", "passed": ${titleCaseOk && !!primaryKeyword && title.toLowerCase().includes(primaryKeyword.toLowerCase())} },
    { "item": "External research benchmarks clearly separated from internal metrics", "passed": ${promiseAligned && benchmarkBoundaryClear} },
    { "item": "Key Takeaways free of boilerplate suffix repetition", "passed": ${templatedTakeawaysCount === 0} },
    { "item": "Zero templated boilerplate (>=95% unique paragraphs & 0 cross-section echoes)", "passed": ${uniquePct >= 95 && repeatedPhraseCount === 0} },
    { "item": "Zero templated subheading echoes (context-specific openers)", "passed": ${templatedHeadingCount === 0} },
    { "item": "First-hand Experience & failure lessons present", "passed": ${hasExperience} },
    { "item": "Primary external sources & scope limitations cited", "passed": ${hasExternalSrc} },
    { "item": "Meta description within 135-165 chars", "passed": ${metaDescription.length >= 135 && metaDescription.length <= 165} }
  ]
}`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: auditPrompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        const parsed = JSON.parse(response.text || '{}');
        parsed.helpfulContentMetrics = {
          titleCaseOk,
          promiseAligned,
          benchmarkBoundaryClear,
          uniqueParagraphPct: uniquePct,
          templatedHeadingCount,
          templatedTakeawaysCount,
          repeatedPhraseCount,
          hasExperienceSignals: hasExperience,
          hasSourcesAndLimits: hasExternalSrc,
        };
        if (parsed.titleAnalysis?.suggestedImprovements && Array.isArray(parsed.titleAnalysis.suggestedImprovements)) {
          parsed.titleAnalysis.suggestedImprovements = parsed.titleAnalysis.suggestedImprovements.map((t: any) =>
            normalizeHeadlineTitleCase(String(t || ''))
          );
        }
        return res.json({ success: true, mode: 'seo-audit', data: parsed, source: 'gemini' });
      }

      if (mode === 'chat') {
        const response = await aiClient.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `You are the Briefzy Editorial & SEO Copilot (briefzy.me). Give concise, practical advice on Google SEO, keyword structure, plain-English readability, E-E-A-T clarity, and topic-matched visuals/videos.
User question/prompt: "${prompt || 'How can I make this article clearer and stronger for readers and search?'}"`,
        });
        return res.json({ success: true, mode: 'chat', reply: response.text, source: 'gemini' });
      }
    } catch (err) {
      console.error('Gemini AI Assistant error:', err);
      // Fall through to fallback
    }
  }

  // Fallback intelligent responses when offline or without Gemini
  if (mode === 'outline') {
    const kw = String(primaryKeyword || currentTopic);
    const base = buildDefaultOutline(currentTopic, kw);
    const fallbackOutline = {
      ...base,
      searchIntent: 'Informational',
      estimatedWordCount:
        base.sections?.reduce((a: number, s: any) => a + (Number(s.targetWords) || 0), 0) || 2200,
      targetAudience: 'General English-speaking readers who want practical, accurate guidance',
      expertTakeawayTip: 'Add one first-hand observation, verified benchmark metric, or failure mode under each subheading to strengthen E-E-A-T.',
    };
    return res.json({ success: true, mode: 'outline', data: fallbackOutline, source: 'fallback-engine' });
  }

  if (mode === 'keywords') {
    const fallbackKeywords = {
      primaryKeyword: primaryKeyword || currentTopic,
      primaryVolume: 14200,
      primaryCpc: '$8.80',
      primaryDifficulty: 42,
      secondaryKeywords: [
        { keyword: `${currentTopic} step by step`, volume: 5400, cpc: '$7.20', difficulty: 34, intent: 'Informational' },
        { keyword: `best ${currentTopic} tools 2026`, volume: 4100, cpc: '$10.50', difficulty: 48, intent: 'Commercial' },
        { keyword: `${currentTopic} mistakes to avoid`, volume: 2900, cpc: '$6.90', difficulty: 31, intent: 'Informational' },
        { keyword: `${currentTopic} vs alternatives`, volume: 2200, cpc: '$8.70', difficulty: 41, intent: 'Commercial' },
      ],
      longTailQuestions: [
        `How do you get started with ${currentTopic}?`,
        `What are the real costs or trade-offs of ${currentTopic}?`,
        `What safety or privacy checks matter most for ${currentTopic}?`,
      ],
      highCpcNicheAdvice: 'Pair practical step-by-step guidance with tool comparisons and real-world trade-offs tailored to your category.',
    };
    return res.json({ success: true, mode: 'keywords', data: fallbackKeywords, source: 'fallback-engine' });
  }

  if (mode === 'seo-audit') {
    const cleanTitle = String(title || '').trim();
    const titleLen = cleanTitle.length;
    const metaLen = String(metaDescription || '').length;
    const hasKwInTitle = !!(primaryKeyword && cleanTitle.toLowerCase().includes(String(primaryKeyword).toLowerCase()));
    const titleCaseOk = !cleanTitle || !/^[a-z]/.test(cleanTitle);

    const plainText = String(content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const lowerText = plainText.toLowerCase();
    const words = plainText ? plainText.split(/\s+/) : [];
    const wordCount = words.length;
    const first100 = words.slice(0, 100).join(' ').toLowerCase();
    const hasKwFirst100 = !!(primaryKeyword && first100.includes(String(primaryKeyword).toLowerCase()));
    const headingCount = (String(content || '').match(/<h[2-4][^>]*>/gi) || []).length;

    const pBlocks = (String(content || '').match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [])
      .map((p) => p.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
      .filter((p) => p.length >= 45);
    const uniqP = new Set(pBlocks.map((p) => p.toLowerCase().replace(/[^a-z0-9\s]/g, '')));
    const uniqueParagraphPct = pBlocks.length > 0 ? Math.round((uniqP.size / pBlocks.length) * 100) : wordCount > 0 ? 100 : 0;
    const templatedHits = detectTemplatedHeadingEchoes(String(content || ''));
    const templatedHeadingCount = templatedHits.length;
    const takeawaysArr = Array.isArray(keyTakeaways)
      ? keyTakeaways.map(String)
      : String(keyTakeaways || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const takeawayAudit = detectTemplatedKeyTakeaways(takeawaysArr);
    const templatedTakeawaysCount = takeawayAudit.hasBoilerplate ? Math.max(1, takeawayAudit.repeatedPairs) : 0;
    const repeatReport = detectRepeatedPhrasePatterns(String(content || ''));
    const repeatedPhraseCount = repeatReport.repeatedClauseCount;

    const promisesBench = /\b(benchmark|benchmarks|comparison|compare|metrics|roadmap)\b/i.test(cleanTitle);
    const hasBenchTable = /<table[\s>]/i.test(String(content || '')) && /\b(benchmark|metrics|assumptions|dimension|threshold)\b/i.test(lowerText);
    const hasAttributionSplit =
      /\b(third-party|external research|not independent|published external|study scope)\b/i.test(lowerText) &&
      /\b(internal|track locally|baseline|minutes spent|team evidence)\b/i.test(lowerText);
    const promiseAligned = !promisesBench || (wordCount > 120 && hasBenchTable);
    const benchmarkBoundaryClear = !promisesBench || (hasBenchTable && hasAttributionSplit);
    const hasExperienceSignals = wordCount > 150 && /\b(field pilot|pilot lesson|failure mode|implementation observation|rollback|pitfall|trade-off)\b/i.test(lowerText);
    const hasSourcesAndLimits =
      /<a\b[^>]*href=["']https?:\/\//i.test(String(content || '')) &&
      /\b(assumptions|limitations|boundary|scope limits|methodology|sources|references)\b/i.test(lowerText);

    const actionableFixes: string[] = [];
    if (!titleCaseOk) actionableFixes.push('Fix lowercase headline start: convert H1 title to clean Title Case for stronger SERP CTR.');
    if (!hasKwInTitle) actionableFixes.push(`Include primary keyword "${primaryKeyword || currentTopic}" near the start of the headline.`);
    if (!promiseAligned) actionableFixes.push('Title promises benchmarks/comparison: add a structured HTML benchmark table with metric definitions & test assumptions.');
    if (promiseAligned && !benchmarkBoundaryClear) actionableFixes.push('Explicitly separate third-party published benchmarks from internal team metrics (e.g., minutes spent rewriting) and test boundaries.');
    if (templatedTakeawaysCount > 0) actionableFixes.push('Rewrite repetitive Key Takeaways so every bullet presents a distinct point without shared boilerplate endings.');
    if (repeatedPhraseCount > 0) actionableFixes.push(`Eliminate ${repeatedPhraseCount} repeated phrase/stat pattern(s) echoed across multiple H2/H3 subsections.`);
    if (templatedHeadingCount > 0) actionableFixes.push(`Replace ${templatedHeadingCount} templated subheading opener(s) repeating section titles with concrete mechanisms tailored to each subtopic.`);
    if (uniqueParagraphPct < 95 && pBlocks.length >= 2) actionableFixes.push(`Deduplicate repeated paragraph phrasing (currently ${uniqueParagraphPct}% unique) to eliminate Helpful Content boilerplate risk.`);
    if (!hasExperienceSignals) actionableFixes.push('Add a Field Pilot Lesson Learned callout describing a real failure mode, root cause, and rollback step.');
    if (!hasSourcesAndLimits) actionableFixes.push('Cite primary institutional sources (https:// links) and explicitly state test assumptions & scope limitations.');
    if (metaLen < 135 || metaLen > 165) actionableFixes.push(`Adjust Meta Description (${metaLen} chars) to 140-160 characters.`);
    if (actionableFixes.length === 0) actionableFixes.push('Draft meets Helpful Content, Title-to-Content promise alignment, and E-E-A-T standards.');

    const kwMatches = primaryKeyword ? (lowerText.match(new RegExp(`\\b${String(primaryKeyword).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')) || []).length : 0;
    const kwWordLen = primaryKeyword ? String(primaryKeyword).trim().split(/\s+/).length : 1;
    const density = wordCount > 0 ? `${((kwMatches * kwWordLen / wordCount) * 100).toFixed(2)}%` : '0.0%';

    const computedScore = Math.max(
      12,
      Math.min(
        98,
        (titleCaseOk ? 10 : 0) +
          (hasKwInTitle ? 10 : 0) +
          (metaLen >= 130 && metaLen <= 165 ? 9 : 4) +
          (hasKwFirst100 ? 9 : 0) +
          (headingCount >= 6 ? 10 : headingCount >= 3 ? 6 : 2) +
          (promiseAligned ? 10 : 0) +
          (benchmarkBoundaryClear ? 8 : 0) +
          (templatedTakeawaysCount === 0 ? 6 : 0) +
          (templatedHeadingCount === 0 && wordCount > 100 ? 8 : 0) +
          (repeatedPhraseCount === 0 && wordCount > 100 ? 6 : 0) +
          (uniqueParagraphPct >= 95 ? 8 : 3) +
          (hasExperienceSignals ? 7 : 0) +
          (hasSourcesAndLimits ? 8 : 0) -
          Math.min(18, templatedHeadingCount * 4 + repeatedPhraseCount * 3 + templatedTakeawaysCount * 4)
      )
    );

    const kwTitleCase = normalizeHeadlineTitleCase(String(primaryKeyword || currentTopic));
    const fallbackAudit = {
      overallScore: computedScore,
      titleAnalysis: {
        score: (hasKwInTitle ? 60 : 30) + (titleCaseOk ? 25 : 0) + (titleLen >= 45 && titleLen <= 75 ? 15 : 5),
        status: hasKwInTitle && titleCaseOk ? 'Optimal' : 'Warning',
        feedback: !titleCaseOk
          ? `Headline starts lowercase ("${cleanTitle.slice(0, 24)}..."). Convert to Title Case.`
          : hasKwInTitle
          ? `Title is clean (${titleLen} chars) with Title Case and primary keyword front-loaded.`
          : `Primary keyword "${primaryKeyword}" is missing from the main title tag.`,
        suggestedImprovements: [
          `${kwTitleCase}: Complete Guide, Reference Benchmarks and Roadmap`,
          `How to Set Up ${kwTitleCase} Without Overcomplicating It`,
        ],
      },
      metaDescriptionAnalysis: {
        score: metaLen >= 135 && metaLen <= 165 ? 92 : 70,
        status: metaLen >= 135 && metaLen <= 165 ? 'Optimal' : 'Warning',
        charCount: metaLen,
        feedback:
          metaLen >= 135 && metaLen <= 165
            ? `Length is ideal (${metaLen} chars). Fits Google SERP snippet without truncation.`
            : `Current length (${metaLen} chars) should ideally be between 140 and 160 characters with a clear benefit.`,
      },
      helpfulContentMetrics: {
        titleCaseOk,
        promiseAligned,
        benchmarkBoundaryClear,
        uniqueParagraphPct,
        templatedHeadingCount,
        templatedTakeawaysCount,
        repeatedPhraseCount,
        hasExperienceSignals,
        hasSourcesAndLimits,
      },
      contentAnalysis: {
        score: computedScore,
        keywordDensity: density,
        eeatRating:
          hasExperienceSignals && hasSourcesAndLimits && promiseAligned && benchmarkBoundaryClear && templatedHeadingCount === 0 && templatedTakeawaysCount === 0 && repeatedPhraseCount === 0
            ? 'High'
            : hasExperienceSignals || hasSourcesAndLimits
            ? 'Moderate'
            : 'Needs Work',
        readabilityLevel: wordCount >= 1800 ? 'Comprehensive Plain-English Standard' : wordCount > 300 ? 'Developing Draft' : 'Thin / Incomplete',
        strengths: [
          promiseAligned && benchmarkBoundaryClear ? 'External study benchmarks and internal metrics clearly attributed' : 'Topic focus identified',
          templatedTakeawaysCount === 0 ? 'Key Takeaways contain distinct, non-boilerplate summaries' : 'Key Takeaways share repetitive template endings',
          templatedHeadingCount === 0 && repeatedPhraseCount === 0 && wordCount > 100
            ? 'Zero templated heading echoes or cross-section stat repetition'
            : `${templatedHeadingCount + repeatedPhraseCount} templated/repeated pattern(s) detected across sections`,
          uniqueParagraphPct >= 95 ? `Strong originality (${uniqueParagraphPct}% unique paragraphs)` : 'Needs deduplication across subsections',
          hasSourcesAndLimits ? 'External citations and scope boundaries present' : 'Add verifiable primary sources',
        ],
        actionableFixes,
      },
      googleGuidelinesChecklist: [
        { item: 'Headline uses clean Title Case & primary keyword', passed: titleCaseOk && hasKwInTitle },
        { item: 'External benchmarks separated from internal pilot metrics', passed: promiseAligned && benchmarkBoundaryClear },
        { item: 'Key Takeaways free of boilerplate suffix repetition', passed: templatedTakeawaysCount === 0 },
        { item: `Zero templated subheading echoes (${templatedHeadingCount} found)`, passed: templatedHeadingCount === 0 && wordCount > 100 },
        { item: `Zero cross-section phrase/stat repeats (${repeatedPhraseCount} found)`, passed: repeatedPhraseCount === 0 && wordCount > 100 },
        { item: `Anti-boilerplate uniqueness (${uniqueParagraphPct}% >= 95%)`, passed: uniqueParagraphPct >= 95 && wordCount > 100 },
        { item: 'First-hand Experience & failure lessons present', passed: hasExperienceSignals },
        { item: 'Primary sources & test scope limits cited', passed: hasSourcesAndLimits },
        { item: 'Primary keyword in first 100 words & H2/H3 structure', passed: hasKwFirst100 && headingCount >= 4 },
      ],
    };
    return res.json({ success: true, mode: 'seo-audit', data: fallbackAudit, source: 'fallback-engine' });
  }

  // Fallback chat
  return res.json({
    success: true,
    mode: 'chat',
    reply: `To rank for "${currentTopic}" in Google Tier-1 search results: 1) Place your primary keyword in the first 60 characters of your H1 title; 2) Provide a clear 40-word direct summary in the first paragraph to capture the Google AI Overview snapshot; 3) Structure with at least 3 distinct H2 sub-sections and 1 FAQ block; 4) Ensure your meta description has an active call-to-action within 155 characters.`,
    source: 'fallback-engine',
  });
});

// -------------------------------------------------------------
// API: Create Topic-Matched Image (Text-to-Image via Gemini + Topic SVG fallback)
// -------------------------------------------------------------
app.post('/api/images/generate', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const {
    prompt,
    title = '',
    topic = '',
    keyword = '',
    secondaryKeywords = [],
    category = '',
    visualStyle = 'editorial-scene',
    aspectRatio = '16:9',
    imageSize = '1K',
    useSearch = false,
    model = 'gemini-3.1-flash-lite-image',
  } = req.body || {};

  if (!String(prompt || title || topic || keyword).trim()) {
    return res.status(400).json({ error: 'A prompt, article title, or topic is required' });
  }

  try {
    const result = await generateTopicImageAsset({
      prompt,
      title,
      topic,
      keyword,
      secondaryKeywords: Array.isArray(secondaryKeywords) ? secondaryKeywords : [],
      category,
      visualStyle,
      aspectRatio,
      imageSize,
      useSearch,
      model,
      strict: true,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Image generation failed:', err?.message);
    return res.status(502).json({
      success: false,
      error: err?.message || 'Gagal generate gambar. Coba lagi nanti.',
    });
  }
});

// -------------------------------------------------------------
// API: Edit Image (Prompt-based Inpainting & Style Transfer)
// -------------------------------------------------------------
app.post('/api/images/edit', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const {
    prompt,
    imageBase64,
    mimeType = 'image/png',
    aspectRatio = '16:9',
    imageSize = '1K',
    title = '',
    topic = '',
    keyword = '',
    category = '',
    model = 'gemini-3.1-flash-lite-image',
  } = req.body || {};

  if (!prompt || !imageBase64) {
    return res.status(400).json({ error: 'Both image and edit prompt are required' });
  }

  const cleanPrompt = buildTopicImagePrompt({
    prompt: String(prompt).trim(),
    title,
    topic,
    keyword,
    category,
    visualStyle: 'editorial-scene',
  });
  const cleanBase64 = String(imageBase64).replace(/^data:image\/[a-z0-9+.-]+;base64,/, '');
  const chosenModel =
    model === 'gemini-nano-banana-2.1' || imageSize === '2K' || imageSize === '4K'
      ? 'gemini-nano-banana-2.1'
      : 'gemini-3.1-flash-lite-image';

  // Semua error dikumpulkan; kalau semua model gagal, kembalikan error yang
  // jujur (502) — bukan SVG placeholder yang diklaim "sukses diedit".
  const editErrors: string[] = [];
  if (aiClient) {
    const modelsToTry =
      chosenModel === 'gemini-3.1-flash-lite-image'
        ? ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1']
        : ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];

    for (const modelName of modelsToTry) {
      try {
        const response = await aiClient.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/png',
              },
            },
            { text: cleanPrompt },
          ],
          config: {
            imageConfig: {
              aspectRatio: aspectRatio || '16:9',
              ...(modelName === 'gemini-nano-banana-2.1' && imageSize ? { imageSize } : {}),
            },
          },
        });

        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const outMime = part.inlineData.mimeType || 'image/png';
            return res.json({
              success: true,
              imageUrl: `data:${outMime};base64,${part.inlineData.data}`,
              model: modelName,
              prompt: cleanPrompt,
              aspectRatio,
              imageSize,
              isEdited: true,
              source: modelName,
            });
          }
        }
        editErrors.push(`${modelName}: Gemini tidak mengembalikan gambar.`);
      } catch (err: any) {
        const summary = summarizeImageGenError(err, modelName);
        editErrors.push(summary);
        console.warn(`Image edit failed on ${modelName}:`, summary);
      }
    }
  } else {
    editErrors.push('GEMINI_API_KEY belum dikonfigurasi di server.');
  }

  console.error('Image edit failed:', editErrors.join(' '));
  return res.status(502).json({
    success: false,
    error: editErrors.join(' ') || 'Gagal mengedit gambar. Coba lagi nanti.',
  });
});

// -------------------------------------------------------------
// API: Generate SEO Alt Text for Image
// -------------------------------------------------------------
app.post('/api/images/seo-alt', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { prompt = '', title = '', keyword = '', category = '' } = req.body || {};

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Create a natural, accessible Google Image SEO alt-text (80-125 characters) specifically for this article and visual prompt. No buzzwords.
Article Title: "${title}"
Primary Keyword: "${keyword}"
Category: "${category}"
Image Prompt: "${prompt}"

Return STRICT JSON:
{
  "altText": "Clear, topic-accurate alt text under 125 chars"
}`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.altText) {
        return res.json({ success: true, altText: parsed.altText });
      }
    } catch (err) {
      console.warn('Gemini alt-text error:', err);
    }
  }

  return res.json({
    success: true,
    altText: buildTopicAltText({ prompt, title, keyword, category }),
  });
});

// -------------------------------------------------------------
// API: Verified Topic-Matched YouTube Search
// -------------------------------------------------------------
app.get('/api/youtube/search', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q : '';
  const title = typeof req.query.title === 'string' ? req.query.title : '';
  const topic = typeof req.query.topic === 'string' ? req.query.topic : '';
  const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : '';
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const limit = Number(req.query.limit || 3);

  if (!query && !title && !topic && !keyword) {
    return res.status(400).json({ error: 'Provide q, title, topic, or keyword' });
  }

  const out = await searchYouTubeVideos({ query, title, topic, keyword, category, limit });
  return res.json({ success: true, ...out });
});

app.post('/api/youtube/search', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { query = '', title = '', topic = '', keyword = '', category = '', limit = 4 } = req.body || {};
  if (!query && !title && !topic && !keyword) {
    return res.status(400).json({ error: 'Provide query, title, topic, or keyword' });
  }
  const out = await searchYouTubeVideos({ query, title, topic, keyword, category, limit });
  return res.json({ success: true, ...out });
});

// -------------------------------------------------------------
// AdSense & SEO Endpoints for Direct Google Crawler Compliance
// -------------------------------------------------------------
let adsensePublisherId = process.env.ADSENSE_PUB_ID || 'pub-8492019382104928';
let customAdsTxt = process.env.CUSTOM_ADS_TXT || `# Google AdSense & Publisher Authorized Digital Sellers (ads.txt)
# Domain: briefzy.me
# Official Authorized Digital Sellers Declaration
google.com, pub-8492019382104928, DIRECT, f08c47fec0942fa0
`;

// GET /ads.txt - Authorized Digital Sellers declaration required by Google AdSense & Publisher Networks
app.get('/ads.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(customAdsTxt);
});

// GET /robots.txt - Standard crawler guidance with explicit AdSense & Googlebot rules
app.get('/robots.txt', (_req, res) => {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /administrator

# Explicit permissions for Google AdSense crawlers
User-agent: Mediapartners-Google
Allow: /

User-agent: AdsBot-Google
Allow: /

User-agent: AdsBot-Google-Mobile
Allow: /

# AI search and assistant crawlers: allowed so Briefzy articles can be found and cited in AI answers.
# (Remove a group below if you do not want that bot to use the site.)
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /administrator

# Canonical XML Sitemap, RSS feed and AI-readable site map
Sitemap: https://briefzy.me/sitemap.xml
Sitemap: https://briefzy.me/feed.xml
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(robotsTxt);
});

// GET /sitemap.xml - Dynamic XML sitemap for instant search indexing and AdSense audit
app.get('/sitemap.xml', (_req, res) => {
  const baseUrl = 'https://briefzy.me';
  const currentDate = new Date().toISOString().split('T')[0];

  const standardPages = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/about-us`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${baseUrl}/contact-us`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${baseUrl}/privacy-policy`, priority: '0.9', changefreq: 'monthly' },
    { loc: `${baseUrl}/terms-of-service`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${baseUrl}/dmca`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${baseUrl}/category/technology`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/category/finance`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/category/cybersecurity`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/category/saas-business`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/category/strategy`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/category/future-of-work`, priority: '0.9', changefreq: 'daily' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const page of standardPages) {
    xml += `  <url>\n    <loc>${page.loc}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
  }

  xml += `</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml);
});

// API: Get & Update AdSense Publisher ID & Custom ads.txt
app.get('/api/adsense/config', (_req, res) => {
  res.json({
    publisherId: adsensePublisherId,
    customAdsTxt,
    adsTxtUrl: 'https://briefzy.me/ads.txt',
    robotsTxtUrl: 'https://briefzy.me/robots.txt',
    sitemapUrl: 'https://briefzy.me/sitemap.xml',
    isConfigured: !!adsensePublisherId && adsensePublisherId !== 'pub-8492019382104928',
  });
});

app.post('/api/adsense/config', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { publisherId, customAdsTxt: newAdsTxt } = req.body;
  if (publisherId && typeof publisherId === 'string') {
    adsensePublisherId = publisherId.trim();
  }
  if (typeof newAdsTxt === 'string') {
    customAdsTxt = newAdsTxt;
  } else if (publisherId && typeof publisherId === 'string') {
    const cleanPub = adsensePublisherId.replace(/^ca-/, '');
    if (!customAdsTxt.includes(cleanPub)) {
      customAdsTxt = `# Google AdSense Authorized Digital Sellers\ngoogle.com, ${cleanPub}, DIRECT, f08c47fec0942fa0\n` + customAdsTxt;
    }
  }
  res.json({
    success: true,
    publisherId: adsensePublisherId,
    customAdsTxt,
    adsTxtContent: customAdsTxt,
  });
});

// -------------------------------------------------------------
// Admin auth & penyimpanan konten (KV di Cloudflare)
// -------------------------------------------------------------
const CONTENT_KEYS = {
  articles: 'briefzy:articles',
  categories: 'briefzy:categories',
  team: 'briefzy:team',
} as const;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function requireAdmin(req: any, res: any): boolean {
  const expected = getAdminToken();
  if (!expected) {
    if (ADMIN_OPEN_WHEN_UNSET) return true;
    res.status(503).json({ error: 'ADMIN_TOKEN belum diatur di server (Cloudflare → Settings → Variables and Secrets).', adminNotConfigured: true });
    return false;
  }
  const given = String(req.headers['x-admin-token'] || '');
  if (!given || !safeEqual(given, expected)) {
    res.status(401).json({ error: 'Token admin salah atau belum diisi.', adminRequired: true });
    return false;
  }
  return true;
}

async function readCollection(key: keyof typeof CONTENT_KEYS): Promise<any[] | null> {
  const raw = await store.get(CONTENT_KEYS[key]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Publik: dipakai semua pengunjung. Email tim disembunyikan.
app.get('/api/content', async (_req, res) => {
  const [articles, categories, team] = await Promise.all([
    readCollection('articles'), readCollection('categories'), readCollection('team'),
  ]);
  res.setHeader('Cache-Control', 'no-store');
  const now = Date.now();
  res.json({
    articles: articles ? articles.filter((a: any) => isLive(a, now)) : null,
    categories,
    team: team ? team.map((m: any) => ({ ...m, email: '' })) : null,
  });
});

app.post('/api/admin/login', (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ ok: true });
});

app.get('/api/admin/content', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const [articles, categories, team] = await Promise.all([
    readCollection('articles'), readCollection('categories'), readCollection('team'),
  ]);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ articles, categories, team });
});

app.put('/api/admin/content', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const body = req.body || {};
  const saved: string[] = [];

  for (const key of ['articles', 'categories', 'team'] as const) {
    const value = body[key];
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.length > 5000) {
      return res.status(400).json({ error: `Data "${key}" harus berupa array (maks 5000 item).` });
    }
    if (key === 'articles') {
      const seen = new Set<string>();
      for (const a of value) {
        const ok = a && typeof a.id === 'string' && typeof a.title === 'string' && typeof a.category === 'string'
          && typeof a.content === 'string' && typeof a.slug === 'string';
        if (!ok) return res.status(400).json({ error: 'Ada artikel dengan data tidak lengkap (id/title/category/slug/content).' });
        if (!SLUG_RE.test(a.slug)) {
          return res.status(400).json({ error: `Slug artikel "${a.title}" tidak valid. Gunakan huruf kecil, angka, dan tanda hubung.` });
        }
        if (a.scheduledAt !== undefined && (typeof a.scheduledAt !== 'string' || isNaN(Date.parse(a.scheduledAt)))) {
          return res.status(400).json({ error: `Tanggal jadwal artikel "${a.title}" tidak valid.` });
        }
        if (seen.has(a.slug)) return res.status(400).json({ error: `Slug artikel duplikat: ${a.slug}` });
        // Quality gate: an article may only go live if it passes. Drafts may
        // be saved with warnings; a live publish that fails the gate is
        // rejected with a 400 and nothing in this batch is saved.
        if (a.draft !== true) {
          const gate = runQualityGate({
            title: a.title,
            content: a.content,
            keyTakeaways: Array.isArray(a.keyTakeaways) ? a.keyTakeaways.map(String) : [],
            primaryKeyword: typeof a.primaryKeyword === 'string' ? a.primaryKeyword : a.slug || '',
            topic: a.title,
            fieldNotes: typeof a.fieldNotes === 'string' ? a.fieldNotes : '',
          });
          if (!gate.passed) {
            return res.status(400).json({
              error: 'Quality gate blocked publish',
              blockers: gate.blockers,
              warnings: gate.warnings,
              article: { title: a.title, slug: a.slug },
              qualityGate: gate,
            });
          }
        }
        seen.add(a.slug);
      }
    }
    if (key === 'categories') {
      const seen = new Set<string>();
      for (const c of value) {
        const ok = c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.slug === 'string';
        if (!ok) return res.status(400).json({ error: 'Ada kategori dengan data tidak lengkap.' });
        if (!SLUG_RE.test(c.slug) || RESERVED_SLUGS.has(c.slug)) {
          return res.status(400).json({ error: `Slug kategori "${c.name}" tidak valid atau dicadangkan sistem (${c.slug}).` });
        }
        if (seen.has(c.slug)) return res.status(400).json({ error: `Slug kategori duplikat: ${c.slug}` });
        seen.add(c.slug);
      }
    }
    await store.put(CONTENT_KEYS[key], JSON.stringify(value));
    saved.push(key);
  }
  res.json({ success: true, saved });
});

// -------------------------------------------------------------
// API: Health Check
// -------------------------------------------------------------
// Unggah gambar (sudah dikompres di browser). Disimpan di KV, disajikan di /img/<id>.<ext>
const IMAGE_TYPES: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' };
app.post('/api/admin/images', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { data, contentType } = req.body || {};
  if (typeof data !== 'string' || !IMAGE_TYPES[contentType]) {
    return res.status(400).json({ error: 'Format gambar tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' });
  }
  if (data.length > 3_000_000) {
    return res.status(413).json({ error: 'Gambar terlalu besar (maksimal sekitar 2 MB setelah dikompres).' });
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    return res.status(400).json({ error: 'Data gambar tidak valid.' });
  }
  const id = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, '0')).join('');
  await store.put('briefzy:img:' + id, JSON.stringify({ t: contentType, d: data }));
  res.json({ url: `/img/${id}.${IMAGE_TYPES[contentType]}` });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    domain: 'briefzy.me',
    geminiEnabled: !!aiClient,
    adminConfigured: !!getAdminToken() || ADMIN_OPEN_WHEN_UNSET,
    storageReady: store.available(),
    adsensePublisherId,
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// API: Visitor BYOK Gemini Proxy (Zero Owner Cost, Strictly Visitor-Key Only)
// -------------------------------------------------------------
app.post('/api/visitor/gemini/generate', async (req, res) => {
  const visitorApiKey = req.headers['x-visitor-api-key'] as string;
  if (!visitorApiKey || typeof visitorApiKey !== 'string' || !visitorApiKey.trim()) {
    return res.status(401).json({
      error: 'Visitor Gemini API Key is required. Please activate your free key in the reader tools.',
      requiresKey: true,
    });
  }

  const { prompt, systemInstruction } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const client = new GoogleGenAI({
      apiKey: visitorApiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-visitor',
        },
      },
    });

    const response = await client.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || 'You are an intelligent, plain-English research companion for Briefzy (briefzy.me). Provide clear, practical analysis matched to the article topic.',
      },
    });

    return res.json({
      text: response.text || '',
    });
  } catch (error: any) {
    console.error('Visitor Gemini API error:', error?.message);
    return res.status(500).json({
      error: error?.message || 'Failed to process request with your Gemini Key. Please check your key in Google AI Studio.',
    });
  }
});

app.post('/api/visitor/gemini/test', async (req, res) => {
  const visitorApiKey = req.headers['x-visitor-api-key'] as string;
  if (!visitorApiKey || typeof visitorApiKey !== 'string' || !visitorApiKey.trim()) {
    return res.status(400).json({ valid: false, message: 'No API key provided.' });
  }

  try {
    const client = new GoogleGenAI({
      apiKey: visitorApiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-visitor',
        },
      },
    });

    const response = await client.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: 'Reply with the single word: "READY"',
    });

    return res.json({
      valid: true,
      message: 'Gemini API key is verified and active!',
      preview: response.text?.slice(0, 30),
    });
  } catch (err: any) {
    return res.status(400).json({
      valid: false,
      message: err?.message || 'API key is invalid or Google AI Studio quota exhausted.',
    });
  }
});

// -------------------------------------------------------------
// Mount Vite middlewares in development or serve static in prod
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Briefzy server running on port ${PORT} [http://0.0.0.0:${PORT}]`);
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });
}

startServer();
