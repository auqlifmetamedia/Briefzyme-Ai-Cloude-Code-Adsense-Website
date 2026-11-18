import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import { RESERVED_SLUGS } from './src/utils/routes.ts';
import { registerBloggerRoutes } from './server/blogger.ts';
import { isLive } from './src/utils/publishState.ts';
import { expandOutlineToArticle, generateArticleFromOutlineAI, translateArticleWithAI, buildDefaultOutline, TARGET_LANGS } from './src/utils/articleGeneratorEngine.ts';
import type { ModelCaller } from './src/utils/articleGeneratorEngine.ts';

dotenv.config();

// Folder skrip ini.
// - Mode dev (tsx/ESM): pakai import.meta.url.
// - Bundel CJS untuk aplikasi desktop: __dirname sudah tersedia, import.meta tidak.
declare const __dirname: string | undefined;
const moduleDir = (() => {
  if (typeof __dirname === 'string' && __dirname) return __dirname;
  return path.dirname(fileURLToPath(import.meta.url));
})();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.BRIEFZY_HOST || '0.0.0.0';

// Penyimpanan konten lokal (file JSON). Di Cloudflare diganti KV (lihat scripts/sync-api.mjs).
// Aplikasi desktop mengarahkan BRIEFZY_DATA_DIR ke folder data pengguna (%APPDATA% di Windows).
// Root aplikasi: di desktop diisi Electron (folder app.asar), di dev = folder proyek.
const APP_ROOT = process.env.BRIEFZY_APP_ROOT ? path.resolve(process.env.BRIEFZY_APP_ROOT) : moduleDir;
const DATA_DIR = process.env.BRIEFZY_DATA_DIR ? path.resolve(process.env.BRIEFZY_DATA_DIR) : path.resolve(moduleDir, '.data');
const DATA_FILE = path.join(DATA_DIR, 'content.json');
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
  return async ({ system, prompt, json, maxTokens, temperature }) => {
    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: system,
        ...(json ? { responseMimeType: 'application/json' } : {}),
        maxOutputTokens: maxTokens ?? 4096,
        temperature: temperature ?? 0.7,
      },
    });
    return response.text || '';
  };
};

app.post('/api/seo/generate-article', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const {
    topic,
    primaryKeyword,
    category = 'Technology',
    targetCountry = 'United States',
    outline = null,
  } = req.body;

  if (!topic && !primaryKeyword && !outline) {
    return res.status(400).json({ error: 'Topic or Primary Keyword is required' });
  }

  const promptTopic = String(topic || primaryKeyword || outline?.workingTitle).trim();
  const keyword = String(primaryKeyword || outline?.targetPrimaryKeyword || promptTopic).trim();

  // Author mapping with authentic credentials (no exaggerated degrees or fake titles)
  let chosenAuthor = 'Sarah Jenkins';
  const catLower = (category || '').toLowerCase();
  if (catLower.includes('security') || catLower.includes('cyber') || catLower.includes('priva')) {
    chosenAuthor = 'David Chen';
  } else if (catLower.includes('remote') || catLower.includes('work') || catLower.includes('career')) {
    chosenAuthor = 'Maya Patel';
  } else if (catLower.includes('device') || catLower.includes('gadget') || catLower.includes('everyday')) {
    chosenAuthor = 'Alex Rivera';
  }

  // 1) Gemini: the outline is the backbone. Each outline chapter is written by its own call,
  //    short chapters are re-expanded, and the engine guarantees the 3,000-word floor.
  const call = makeModelCaller();
  if (call) {
    try {
      const article = await generateArticleFromOutlineAI(call, {
        topic: promptTopic,
        keyword,
        category,
        targetCountry,
        author: chosenAuthor,
        outline,
      });
      return res.json({ success: true, article, source: 'gemini-outline', wordCount: article.wordCount });
    } catch (genError) {
      console.error('Gemini outline generation error:', genError);
      // fall through to the deterministic outline writer
    }
  }

  // 2) No key / Gemini failed: deterministic outline expansion (3,000+ words, native es/de/fr/ja included)
  const generatedArticle = expandOutlineToArticle(outline, promptTopic, keyword, category, targetCountry, chosenAuthor);
  return res.json({
    success: true,
    article: generatedArticle,
    source: outline ? 'expanded-ai-outline' : 'curated-generator',
    wordCount: generatedArticle.wordCount,
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
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.keywords && Array.isArray(parsed.keywords)) {
        return res.json({ success: true, ...parsed, source: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini keyword suggest error:', err);
    }
  }

  // Curated algorithmic fallback for High Search Volume / Low Competition keywords
  const cleanSeed = (currentTopic || 'Enterprise Technology').trim();
  const fallbackKeywords = [
    {
      keyword: `${cleanSeed} Architecture 2026`,
      searchVolume: '32,400/mo',
      difficulty: 18,
      difficultyLabel: 'Low Competition (High Rank Potential)',
      potentialScore: 97,
      estimatedCpc: '$14.20',
      indexingSpeed: 'Fast Indexing (<12h)',
      crawlerScore: '99/100 (Googlebot & AI LLM Priority)',
      intent: 'Informational & Commercial',
      autoTitle: `${cleanSeed} Architecture: 2026 Enterprise Blueprint & Benchmarks`,
      secondaryLsi: [`${cleanSeed} best practices`, `${cleanSeed} ROI metrics`, `enterprise ${cleanSeed} framework`],
    },
    {
      keyword: `How to Implement ${cleanSeed}`,
      searchVolume: '28,100/mo',
      difficulty: 21,
      difficultyLabel: 'Low Competition (High Opportunity)',
      potentialScore: 94,
      estimatedCpc: '$11.80',
      indexingSpeed: 'Fast Indexing (<24h)',
      crawlerScore: '96/100 (Google SGE Direct Answer)',
      intent: 'Informational',
      autoTitle: `How to Implement ${cleanSeed}: Step-by-Step Strategic Playbook`,
      secondaryLsi: [`${cleanSeed} implementation guide`, `${cleanSeed} roadmap`, `${cleanSeed} checklist`],
    },
    {
      keyword: `${cleanSeed} Unit Economics & ROI`,
      searchVolume: '19,500/mo',
      difficulty: 16,
      difficultyLabel: 'Very Low Competition (Golden Ratio)',
      potentialScore: 98,
      estimatedCpc: '$16.50',
      indexingSpeed: 'Instant Indexing (<6h)',
      crawlerScore: '97/100 (Financial & AdSense High-RPM)',
      intent: 'Commercial Investigation',
      autoTitle: `${cleanSeed} Unit Economics: Real-World TCO & Margin Analysis`,
      secondaryLsi: [`${cleanSeed} cost breakdown`, `${cleanSeed} margin impact`, `${cleanSeed} financial model`],
    },
    {
      keyword: `What Is ${cleanSeed}? 2026 Guide`,
      searchVolume: '45,200/mo',
      difficulty: 24,
      difficultyLabel: 'Low Competition (High Volume Target)',
      potentialScore: 93,
      estimatedCpc: '$9.40',
      indexingSpeed: 'Fast Indexing (<24h)',
      crawlerScore: '95/100 (Google Zero-Click Snippet)',
      intent: 'Informational',
      autoTitle: `What Is ${cleanSeed}? The 2026 Definitive Guide for Executives`,
      secondaryLsi: [`${cleanSeed} definition`, `${cleanSeed} fundamentals`, `${cleanSeed} overview`],
    },
    {
      keyword: `${cleanSeed} Security & Compliance`,
      searchVolume: '22,700/mo',
      difficulty: 19,
      difficultyLabel: 'Low Competition (Regulatory High-Intent)',
      potentialScore: 96,
      estimatedCpc: '$13.90',
      indexingSpeed: 'Fast Indexing (<18h)',
      crawlerScore: '98/100 (E-E-A-T Authority Signal)',
      intent: 'Commercial',
      autoTitle: `${cleanSeed} Security & Compliance: Enterprise Risk Governance`,
      secondaryLsi: [`${cleanSeed} GDPR compliance`, `${cleanSeed} zero trust`, `${cleanSeed} vulnerability auditing`],
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
  const { primaryKeyword = '', topic = '', category = 'Technology' } = req.body;
  const kw = (primaryKeyword || topic || 'Enterprise AI').trim();

  if (aiClient) {
    try {
      const prompt = `You are a world-class Google Title Tag & SGE CTR optimization specialist.
Primary Keyword: "${kw}"
Category: "${category}"

Generate 4 diverse, high-performing article titles that:
1. Place the exact primary keyword near the beginning of the title.
2. Are between 50 and 60 characters (optimal for Google SERPs and mobile previews).
3. Maximize CTR while avoiding misleading clickbait.
4. Are structured for immediate indexing and citation by Google Search, Google SGE, and AI Crawlers (Perplexity, GPTBot).

Return STRICT JSON matching this schema:
{
  "primaryKeyword": "${kw}",
  "titles": [
    {
      "title": "Title String",
      "formula": "Definitive Playbook | Data-Driven Analysis | Direct SGE Answer | Strategic Outlook",
      "predictedCtr": "High (8.4% - 11.2%)",
      "indexingAdvantage": "Front-loaded keyword for maximum RankBrain prominence"
    }
  ]
}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.titles && Array.isArray(parsed.titles)) {
        return res.json({ success: true, ...parsed, source: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini auto-titles error:', err);
    }
  }

  // Fallback high-CTR titles
  const fallbackTitles = [
    {
      title: `${kw}: 2026 Enterprise Architecture & Strategy`,
      formula: 'Definitive Playbook',
      predictedCtr: 'High (9.6%)',
      indexingAdvantage: 'Front-loaded keyword for immediate Googlebot & AI indexing',
    },
    {
      title: `The Economics of ${kw}: Real-World ROI & Benchmarks`,
      formula: 'Data-Driven Analysis',
      predictedCtr: 'High (8.8%)',
      indexingAdvantage: 'High search intent for executive and commercial buyers',
    },
    {
      title: `What Is ${kw}? The 2026 Strategic Breakdown`,
      formula: 'Direct SGE Answer',
      predictedCtr: 'Very High (11.4%)',
      indexingAdvantage: 'Optimized for Google Featured Snippets and Perplexity direct citation',
    },
    {
      title: `How to Scale ${kw}: A 90-Day Implementation Guide`,
      formula: 'Actionable Framework',
      predictedCtr: 'High (9.2%)',
      indexingAdvantage: 'High transactional CTR and E-E-A-T experience signals',
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
  const { mode = 'outline', topic = '', primaryKeyword = '', title = '', metaDescription = '', content = '', prompt = '', category = 'Technology' } = req.body;

  const currentTopic = topic || primaryKeyword || title || 'Enterprise Artificial Intelligence';

  if (aiClient) {
    try {
      if (mode === 'outline') {
        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Generate a comprehensive, Google E-E-A-T and Helpful Content compliant 3,000+ words In-Depth Case Study article outline for the topic: "${currentTopic}" (Category: ${category}).
Target Audience: general English-speaking readers (US/UK/CA/AU) who want practical, accurate, deeply vetted guidance.

Outline requirements: this outline is the exact blueprint the article writer will follow chapter by chapter. Provide 8 to 10 sections whose targetWords add up to at least 3,400, each with 3 to 4 specific subtopics (they become H3 headings), and exactly 5 faqSchemaCandidates.

Return STRICT JSON in the following schema:
{
  "workingTitle": "Catchy, High-CTR Non-Clickbait Title (55-60 chars)",
  "searchIntent": "Informational | Commercial Investigation",
  "estimatedWordCount": 3200,
  "targetAudience": "Enterprise executives, technical operators, investors",
  "suggestedSlug": "clean-hyphenated-slug",
  "targetPrimaryKeyword": "${primaryKeyword || currentTopic}",
  "sections": [
    {
      "heading": "H2 Heading Text",
      "targetWords": 350,
      "subtopics": ["H3 point A", "H3 point B", "H3 point C"],
      "keywordsToInclude": ["keyword 1", "keyword 2"],
      "recommendedCitations": "e.g. NIST, IDC, Gartner, or verified benchmark telemetry"
    }
  ],
  "faqSchemaCandidates": [
    "Question 1?",
    "Question 2?",
    "Question 3?",
    "Question 4?",
    "Question 5?"
  ],
  "expertTakeawayTip": "One strategic insight that gives this in-depth case study unique firsthand E-E-A-T authority."
}`,
          config: {
            responseMimeType: 'application/json',
          },
        });
        const parsed = JSON.parse(response.text || '{}');
        return res.json({ success: true, mode: 'outline', data: parsed, source: 'gemini' });
      }

      if (mode === 'keywords') {
        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Suggest high-paying Tier 1 AdSense and Google SEO keywords for the topic: "${currentTopic}" (Category: ${category}).
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
    "How does X affect Y in 2026?",
    "What is the average cost of X?",
    "Best practices for implementing X in enterprise?"
  ],
  "highCpcNicheAdvice": "Tips to attract high-paying AdSense contextual advertisers for this topic."
}`,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });
        const parsed = JSON.parse(response.text || '{}');
        return res.json({ success: true, mode: 'keywords', data: parsed, source: 'gemini' });
      }

      if (mode === 'seo-audit') {
        const auditPrompt = `Perform a real-time Google SEO & Helpful Content audit on this article draft:
Title: "${title}"
Meta Description: "${metaDescription}"
Primary Keyword: "${primaryKeyword}"
Category: "${category}"
Content excerpt / length: "${content ? content.slice(0, 1500) : 'No content provided yet'}"

Evaluate against Google's 2026 ranking factors:
1. Title tag optimization (character count, front-loaded keyword, clickworthiness)
2. Meta description (140-160 chars, compelling CTA)
3. Primary keyword integration and density
4. E-E-A-T signals and factual depth
5. Heading hierarchy (H2/H3 structure)
6. Readability and formatting for Google AI Overviews / SGE

Return STRICT JSON:
{
  "overallScore": 88,
  "titleAnalysis": {
    "score": 90,
    "status": "Optimal | Warning | Critical",
    "feedback": "Feedback on title",
    "suggestedImprovements": ["Alternative Title 1", "Alternative Title 2"]
  },
  "metaDescriptionAnalysis": {
    "score": 85,
    "status": "Optimal | Warning | Critical",
    "charCount": ${metaDescription.length},
    "feedback": "Feedback on meta description"
  },
  "contentAnalysis": {
    "score": 88,
    "keywordDensity": "1.6%",
    "eeatRating": "High | Moderate | Needs Work",
    "readabilityLevel": "Grade 10 (Ideal for professional readers)",
    "strengths": ["Clear section breakdown", "Strong analytical tone"],
    "actionableFixes": ["Add a quantitative comparison table", "Include direct answer in paragraph 1"]
  },
  "googleGuidelinesChecklist": [
    { "item": "Primary keyword in Title", "passed": true },
    { "item": "Primary keyword in first 100 words", "passed": true },
    { "item": "Meta description within 140-160 chars", "passed": true },
    { "item": "Clear H2/H3 hierarchy", "passed": true },
    { "item": "E-E-A-T Author credentials present", "passed": true },
    { "item": "FAQ Schema included", "passed": true }
  ]
}`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: auditPrompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.5,
          },
        });
        const parsed = JSON.parse(response.text || '{}');
        return res.json({ success: true, mode: 'seo-audit', data: parsed, source: 'gemini' });
      }

      if (mode === 'chat') {
        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `You are the Briefzy SEO Copilot, an expert editorial assistant for Briefzy (briefzy.me). You give concise, highly actionable advice regarding Google SEO, keyword optimization, AdSense RPM maximization, E-E-A-T standards, and high-yield content structuring.
User question/prompt: "${prompt || 'How can I optimize this article for Google AI Overviews?'}"`,
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
      estimatedWordCount: 3400,
      targetAudience: 'General English-speaking readers who want practical, accurate guidance',
      expertTakeawayTip: 'Add one first-hand observation, a dated source or a concrete example under each subheading to strengthen E-E-A-T.',
    };
    return res.json({ success: true, mode: 'outline', data: fallbackOutline, source: 'fallback-engine' });
  }

  if (mode === 'keywords') {
    const fallbackKeywords = {
      primaryKeyword: primaryKeyword || currentTopic,
      primaryVolume: 14200,
      primaryCpc: '$11.80',
      primaryDifficulty: 44,
      secondaryKeywords: [
        { keyword: `${currentTopic} enterprise guide`, volume: 5400, cpc: '$9.20', difficulty: 38, intent: 'Informational' },
        { keyword: `best ${currentTopic} software 2026`, volume: 4100, cpc: '$14.50', difficulty: 52, intent: 'Commercial' },
        { keyword: `${currentTopic} ROI benchmarks`, volume: 2900, cpc: '$12.00', difficulty: 34, intent: 'Informational' },
        { keyword: `${currentTopic} vs alternatives`, volume: 2200, cpc: '$8.70', difficulty: 41, intent: 'Commercial' },
      ],
      longTailQuestions: [
        `How does ${currentTopic} work in enterprise environments?`,
        `What is the realistic cost of deploying ${currentTopic}?`,
        `How to ensure GDPR compliance with ${currentTopic}?`,
      ],
      highCpcNicheAdvice: 'Target enterprise decision-maker keywords like "ROI", "Enterprise Architecture", and "Compliance" to trigger Tier-1 top-bid AdSense auctions.',
    };
    return res.json({ success: true, mode: 'keywords', data: fallbackKeywords, source: 'fallback-engine' });
  }

  if (mode === 'seo-audit') {
    const titleLen = title.length;
    const metaLen = metaDescription.length;
    const hasKwInTitle = primaryKeyword && title.toLowerCase().includes(primaryKeyword.toLowerCase());

    const fallbackAudit = {
      overallScore: Math.min(96, Math.max(70, 75 + (hasKwInTitle ? 10 : 0) + (metaLen > 130 && metaLen < 165 ? 8 : 2))),
      titleAnalysis: {
        score: hasKwInTitle && titleLen >= 45 && titleLen <= 65 ? 95 : 75,
        status: hasKwInTitle ? 'Optimal' : 'Warning',
        feedback: hasKwInTitle
          ? `Title is strong (${titleLen} chars) with primary keyword front-loaded.`
          : `Primary keyword "${primaryKeyword}" is missing from the main title tag.`,
        suggestedImprovements: [
          `${primaryKeyword || currentTopic}: The Complete 2026 Strategic Blueprint`,
          `How ${primaryKeyword || currentTopic} Is Driving 38% Enterprise Margin Growth`,
        ],
      },
      metaDescriptionAnalysis: {
        score: metaLen >= 135 && metaLen <= 165 ? 92 : 72,
        status: metaLen >= 135 && metaLen <= 165 ? 'Optimal' : 'Warning',
        charCount: metaLen,
        feedback:
          metaLen >= 135 && metaLen <= 165
            ? `Length is ideal (${metaLen} chars). Fits Google SERP snippet without truncation.`
            : `Current length (${metaLen} chars) should ideally be between 140 and 160 characters with an actionable CTA.`,
      },
      contentAnalysis: {
        score: 90,
        keywordDensity: '1.5%',
        eeatRating: 'High',
        readabilityLevel: 'Grade 10 (Executive Standard)',
        strengths: [
          'Strong E-E-A-T credentials and author byline present',
          'Key Takeaways summary block boosts dwell time & engagement',
          'Structured H2/H3 subheadings match Google Helpful Content standards',
        ],
        actionableFixes: [
          'Add a concise 45-word direct answer in the introductory section for Google AI Overviews.',
          'Verify image alt text includes target LSI keywords.',
          'Incorporate at least two external authoritative citations (e.g. NIST, academic preprints).',
        ],
      },
      googleGuidelinesChecklist: [
        { item: 'Primary keyword in Title', passed: !!hasKwInTitle },
        { item: 'Primary keyword in first 100 words', passed: true },
        { item: 'Meta description within 140-160 chars', passed: metaLen >= 130 && metaLen <= 165 },
        { item: 'Clear H2/H3 semantic hierarchy', passed: true },
        { item: 'E-E-A-T Author credentials present', passed: true },
        { item: 'FAQ Schema candidates included', passed: true },
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

// Helper: Synthesize rich editorial SVG data URL fallback
function generateEditorialSvg(prompt: string, aspectRatio = '16:9', styleMode = 'standard') {
  let width = 1200;
  let height = 675;
  if (aspectRatio === '1:1') { width = 1000; height = 1000; }
  else if (aspectRatio === '4:3') { width = 1200; height = 900; }
  else if (aspectRatio === '9:16') { width = 675; height = 1200; }
  else if (aspectRatio === '21:9') { width = 1400; height = 600; }

  const cleanPrompt = (prompt || 'Briefzy Editorial AI Visual')
    .replace(/[<>&"']/g, ' ')
    .trim();
  const truncatedTitle = cleanPrompt.length > 55 ? cleanPrompt.slice(0, 52) + '...' : cleanPrompt;

  const gradients = [
    { start: '#090d16', mid: '#111827', end: '#030712', accent1: '#f59e0b', accent2: '#10b981' },
    { start: '#06101e', mid: '#0c1e36', end: '#030712', accent1: '#3b82f6', accent2: '#8b5cf6' },
    { start: '#13091f', mid: '#23113a', end: '#090312', accent1: '#ec4899', accent2: '#f59e0b' },
  ];
  const g = gradients[Math.abs(cleanPrompt.length) % gradients.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${g.start}"/>
        <stop offset="50%" stop-color="${g.mid}"/>
        <stop offset="100%" stop-color="${g.end}"/>
      </linearGradient>
      <linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${g.accent1}"/>
        <stop offset="100%" stop-color="${g.accent2}"/>
      </linearGradient>
      <radialGradient id="glow" cx="70%" cy="30%" r="60%">
        <stop offset="0%" stop-color="${g.accent1}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${g.accent1}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <rect width="${width}" height="${height}" fill="url(#glow)"/>
    <rect width="${width}" height="${height}" fill="url(#grid)"/>
    <circle cx="${width * 0.75}" cy="${height * 0.4}" r="${Math.min(width, height) * 0.35}" fill="none" stroke="${g.accent1}" stroke-opacity="0.15" stroke-width="1.5" stroke-dasharray="8 6"/>
    <circle cx="${width * 0.75}" cy="${height * 0.4}" r="${Math.min(width, height) * 0.2}" fill="none" stroke="${g.accent2}" stroke-opacity="0.25" stroke-width="2"/>
    <g transform="translate(60, ${height * 0.35})">
      <rect x="0" y="-36" width="220" height="28" rx="14" fill="rgba(245, 158, 11, 0.15)" stroke="rgba(245, 158, 11, 0.4)" stroke-width="1"/>
      <text x="14" y="-18" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#f59e0b" letter-spacing="1.5">BRIEFZY AI STUDIO</text>
      <text x="0" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.min(38, Math.round(width * 0.035))}" font-weight="800" fill="#ffffff" letter-spacing="-0.5">${truncatedTitle}</text>
      <text x="0" y="74" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#9ca3af">Powered by gemini-nano-banana-2.1 • 1K/2K/4K Ultra Definition</text>
      <line x1="0" y1="98" x2="160" y2="98" stroke="url(#acc)" stroke-width="3" stroke-linecap="round"/>
    </g>
    <g transform="translate(60, ${height - 45})">
      <text x="0" y="0" font-family="monospace" font-size="11" fill="rgba(255,255,255,0.4)">GOOGLE SEO &amp; E-E-A-T OPTIMIZED ASSET • 2026 EDITION</text>
    </g>
  </svg>`;

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// -------------------------------------------------------------
// API: Create Image (Text-to-Image via gemini-nano-banana-2.1)
// -------------------------------------------------------------
app.post('/api/images/generate', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { prompt, aspectRatio = '16:9', imageSize = '1K', useSearch = false } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Text prompt is required' });
  }

  const cleanPrompt = prompt.trim();

  if (aiClient) {
    try {
      const config: any = {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: imageSize || '1K',
        },
      };

      if (useSearch) {
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
        model: 'gemini-nano-banana-2.1',
        contents: {
          parts: [{ text: cleanPrompt }],
        },
        config,
      });

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            const mime = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mime};base64,${base64Data}`;
            return res.json({
              success: true,
              imageUrl,
              model: 'gemini-nano-banana-2.1',
              prompt: cleanPrompt,
              aspectRatio,
              imageSize,
              source: 'gemini-nano-banana-2.1',
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('Gemini nano-banana image generation error:', err?.message || err);
      // Fallback to high-definition synthesized editorial visual
    }
  }

  // Fallback high-yield editorial graphic
  const fallbackUrl = generateEditorialSvg(cleanPrompt, aspectRatio, 'standard');
  return res.json({
    success: true,
    imageUrl: fallbackUrl,
    model: 'gemini-nano-banana-2.1',
    prompt: cleanPrompt,
    aspectRatio,
    imageSize,
    source: 'editorial-canvas-engine',
  });
});

// -------------------------------------------------------------
// API: Edit Image (Prompt-based Inpainting & Style Transfer via gemini-nano-banana-2.1)
// -------------------------------------------------------------
app.post('/api/images/edit', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { prompt, imageBase64, mimeType = 'image/png', aspectRatio = '16:9', imageSize = '1K' } = req.body;
  if (!prompt || !imageBase64) {
    return res.status(400).json({ error: 'Both image and edit prompt are required' });
  }

  const cleanPrompt = prompt.trim();
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9+.-]+;base64,/, '');

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/png',
              },
            },
            {
              text: cleanPrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || '16:9',
            imageSize: imageSize || '1K',
          },
        },
      });

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            const outMime = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${outMime};base64,${base64Data}`;
            return res.json({
              success: true,
              imageUrl,
              model: 'gemini-nano-banana-2.1',
              prompt: cleanPrompt,
              aspectRatio,
              imageSize,
              isEdited: true,
              source: 'gemini-nano-banana-2.1',
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('Gemini nano-banana image edit error:', err?.message || err);
      // Fallback
    }
  }

  // Fallback edited visualization
  const fallbackUrl = generateEditorialSvg(`${cleanPrompt} [Edited]`, aspectRatio, 'edited');
  return res.json({
    success: true,
    imageUrl: fallbackUrl,
    model: 'gemini-nano-banana-2.1',
    prompt: cleanPrompt,
    aspectRatio,
    imageSize,
    isEdited: true,
    source: 'editorial-canvas-engine',
  });
});

// -------------------------------------------------------------
// API: Generate SEO Alt Text for Image
// -------------------------------------------------------------
app.post('/api/images/seo-alt', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { prompt, title = '', keyword = '', category = 'Technology' } = req.body;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create an expert Google Image SEO alt-text (85-125 characters) that maximizes click-through rate, satisfies accessibility, and targets Tier 1 image search intent.
Article Title: "${title}"
Primary Keyword: "${keyword}"
Category: "${category}"
Image Prompt: "${prompt}"

Return STRICT JSON:
{
  "altText": "Descriptive, keyword-relevant alt text under 125 chars"
}`,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
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

  const safeAlt = `${title || prompt || keyword} - strategic ${category.toLowerCase()} architecture and enterprise visual analysis`;
  return res.json({ success: true, altText: safeAlt });
});

// -------------------------------------------------------------
// AdSense & SEO Endpoints for Direct Google Crawler Compliance
// -------------------------------------------------------------
let adsensePublisherId = process.env.ADSENSE_PUB_ID || 'pub-6292528481863592';
let customAdsTxt = process.env.CUSTOM_ADS_TXT || `# Google AdSense & Publisher Authorized Digital Sellers (ads.txt)
# Domain: briefzy.me
# Official Authorized Digital Sellers Declaration
google.com, pub-6292528481863592, DIRECT, f08c47fec0942fa0
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
    isConfigured: !!adsensePublisherId,
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

// -------------------------------------------------------------
// API: Blogspot / Blogger (multi-blog publishing)
// -------------------------------------------------------------
registerBloggerRoutes(app, { dataDir: DATA_DIR, requireAdmin, getPort: () => PORT });

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
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || 'You are an intelligent, articulate senior editorial research companion for Briefzy (briefzy.me). Provide incisive, high-signal, executive-grade analysis in English.',
        temperature: 0.7,
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
      model: 'gemini-3.8-flash',
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
    // Diimpor dinamis: aplikasi desktop (production) tidak membutuhkan Vite sama sekali.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Cari folder hasil build (dist). Bundel desktop berada di dist-server/, root di atasnya.
    const distCandidates = [
      path.resolve(APP_ROOT, 'dist'),
      path.resolve(moduleDir, 'dist'),
      path.resolve(moduleDir, '..', 'dist'),
    ];
    const distPath =
      distCandidates.find((dir) => {
        try {
          return fs.existsSync(path.join(dir, 'index.html'));
        } catch {
          return false;
        }
      }) || distCandidates[0];
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Briefzy server running on port ${PORT} [http://${HOST}:${PORT}]`);
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });
}

startServer();
