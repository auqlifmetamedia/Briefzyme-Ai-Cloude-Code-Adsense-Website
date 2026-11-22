// Membuat functions/_lib/api.ts dari server.ts (route /api/* saja).
// Jalankan ulang setiap kali server.ts diubah:  npm run sync-api
import fs from 'node:fs';

const src = fs.readFileSync('server.ts', 'utf8').split('\n');
const start = src.findIndex((l) => l.includes('API: Automated SEO Article Generator')) - 1;
const end = src.findIndex((l) => l.includes('Mount Vite middlewares')) - 1;
if (start < 0 || end < 0) throw new Error('Penanda di server.ts tidak ditemukan');

let body = src.slice(start, end).join('\n');
body = body
  .replace('process.env.ADSENSE_PUB_ID || ', '')
  .replace('process.env.CUSTOM_ADS_TXT || ', '');

const header = `// FILE HASIL GENERATE dari server.ts — jangan diedit manual (jalankan: npm run sync-api)
import { GoogleGenAI } from '@google/genai';
import { createApp, dispatch } from './express-shim';
import { RESERVED_SLUGS } from '../../src/utils/routes';
import { isLive } from '../../src/utils/publishState';
import { expandOutlineToArticle, generateArticleFromOutlineAI, translateArticleWithAI, buildDefaultOutline, normalizeHeadlineTitleCase, TARGET_LANGS } from '../../src/utils/articleGeneratorEngine';
import type { ModelCaller } from '../../src/utils/articleGeneratorEngine';
import { buildTopicImagePrompt, buildTopicAltText, generateTopicVisualSvg, buildYouTubeSearchQueries, svgToDataUrl, deriveArticleVisualization } from '../../src/utils/topicVisuals';
import { detectTemplatedHeadingEchoes } from '../../src/utils/articleEnhancer';

const app = createApp();
let aiClient: GoogleGenAI | null = null;
let initialized = false;
let ENV: any = {};

// Penyimpanan konten = Cloudflare KV (binding BRIEFZY_KV, lihat wrangler.toml)
const store = {
  available: () => !!ENV.BRIEFZY_KV,
  async get(key: string): Promise<string | null> {
    return ENV.BRIEFZY_KV ? ((await ENV.BRIEFZY_KV.get(key)) as string | null) : null;
  },
  async put(key: string, value: string): Promise<void> {
    if (!ENV.BRIEFZY_KV) throw new Error('KV namespace BRIEFZY_KV belum terpasang (lihat wrangler.toml).');
    await ENV.BRIEFZY_KV.put(key, value);
  },
};
const getAdminToken = () => (ENV.ADMIN_TOKEN as string) || '';
const ADMIN_OPEN_WHEN_UNSET = false;

function initEnv(env: any) {
  if (initialized) return;
  initialized = true;
  const apiKey = env?.GEMINI_API_KEY;
  if (apiKey) {
    try {
      aiClient = new GoogleGenAI({ apiKey });
    } catch (err) {
      console.error('Failed to initialize GoogleGenAI client:', err);
    }
  }
}

export async function handle(request: Request, env: any): Promise<Response> {
  ENV = env || {};
  initEnv(env);
  return dispatch(app, request);
}

`;
fs.writeFileSync('functions/_lib/api.ts', header + body + '\n');
console.log('functions/_lib/api.ts dibuat dari server.ts');
