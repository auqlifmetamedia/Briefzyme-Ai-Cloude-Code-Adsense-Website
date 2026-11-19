// FILE HASIL GENERATE dari server.ts — jangan diedit manual (jalankan: npm run sync-api)
import { GoogleGenAI } from '@google/genai';
import { createApp, dispatch } from './express-shim';
import { RESERVED_SLUGS, articlePathOf } from '../../src/utils/routes';
import { isLive } from '../../src/utils/publishState';
import { expandOutlineToArticle, generateArticleFromOutlineAI, translateArticleWithAI, buildDefaultOutline, TARGET_LANGS } from '../../src/utils/articleGeneratorEngine';
import type { ModelCaller } from '../../src/utils/articleGeneratorEngine';
import { initialArticles } from '../../src/data/mockArticles';
import { initialCategories } from '../../src/data/mockCategories';

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

// "Internal links" standard: hubungkan artikel baru ke artikel lama yang benar-benar relevan secara
// alami, bukan link random. Cocokkan berdasarkan primaryKeyword/judul artikel lain yang disebut secara
// natural di teks, lalu jadikan kemunculan pertama sebagai link — maksimal `maxLinks` per artikel supaya
// nggak jadi link-stuffing.
function insertInternalLinks(contentHtml: string, currentSlug: string, articles: any[], categories: any[], maxLinks = 4): string {
  if (!articles?.length) return contentHtml;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const candidates = articles
    .filter((a) => a?.slug && a.slug !== currentSlug && (a.primaryKeyword || a.title))
    .map((a) => ({ a, anchor: String(a.primaryKeyword || a.title) }))
    .filter(({ anchor }) => anchor.length >= 6 && anchor.length <= 60)
    // artikel lebih panjang kata kuncinya duluan, supaya match paling spesifik menang
    .sort((x, y) => y.anchor.length - x.anchor.length);

  let html = contentHtml;
  let inserted = 0;
  for (const { a, anchor } of candidates) {
    if (inserted >= maxLinks) break;
    // Jangan nempel link di dalam tag HTML/attribute, dan jangan dobel-link teks yang sudah jadi <a>.
    const re = new RegExp(`(<a[^>]*>[^<]*<\\/a>)|(<[^>]*>)|\\b(${esc(anchor)})\\b`, 'i');
    let didInsert = false;
    html = html.replace(re, (whole, existingLink, tag, plainMatch) => {
      if (existingLink || tag) return whole; // skip things we must not touch
      if (plainMatch && !didInsert) {
        didInsert = true;
        const href = articlePathOf({ slug: a.slug, category: a.category }, categories);
        return `<a href="${href}">${plainMatch}</a>`;
      }
      return whole;
    });
    if (didInsert) inserted++;
  }
  return html;
}

app.post('/api/seo/generate-article', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const {
    topic,
    primaryKeyword,
    category = 'Productivity & AI Tools',
    targetCountry = 'United States',
    outline = null,
    authorName = '',
  } = req.body;

  if (!topic && !primaryKeyword && !outline) {
    return res.status(400).json({ error: 'Topic or Primary Keyword is required' });
  }

  const promptTopic = String(topic || primaryKeyword || outline?.workingTitle).trim();
  const keyword = String(primaryKeyword || outline?.targetPrimaryKeyword || promptTopic).trim();

  // Expanded category writer rotation with zero academic degrees or titles
  let chosenAuthor = typeof authorName === 'string' && authorName.trim() ? authorName.trim() : '';
  if (!chosenAuthor) {
    const catLower = (category || '').toLowerCase();
    const pickFrom = (pool: string[]) => {
      const seed = promptTopic.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      return pool[seed % pool.length];
    };
    if (catLower.includes('security') || catLower.includes('cyber') || catLower.includes('priva')) {
      chosenAuthor = pickFrom(['David Chen', 'Rachel Torres', 'Marcus Reid', 'Elena Novak']);
    } else if (catLower.includes('remote') || catLower.includes('work') || catLower.includes('career')) {
      chosenAuthor = pickFrom(['Maya Patel', 'Lucas Meyer', 'Sofia Alvarez', 'Chloe Martin']);
    } else if (catLower.includes('how-to') || catLower.includes('device') || catLower.includes('tech')) {
      chosenAuthor = pickFrom(['Alex Rivera', 'Nadia Kowalski', 'Kevin Okafor', 'Omar Farooq']);
    } else {
      chosenAuthor = pickFrom(['Sarah Jenkins', 'Daniel Brooks', 'Priya Nair', 'Hannah Kim', 'Trevor Hall']);
    }
  }

  // Artikel yang sudah ada dimuat sekali di sini supaya bisa dipasangin internal link yang relevan.
  const [existingArticles, existingCategories] = await Promise.all([
    readCollection('articles'),
    readCollection('categories'),
  ]);
  const articlesForLinking = existingArticles ?? initialArticles;
  const categoriesForLinking = existingCategories ?? initialCategories;
  const withInternalLinks = (article: any) => ({
    ...article,
    content: insertInternalLinks(article.content, article.slug, articlesForLinking, categoriesForLinking),
  });

  // 1) Gemini: the outline is the backbone. Each outline chapter is written by its own call,
  //    short chapters are re-expanded, and the engine guarantees the 3,000-word floor.
  const call = makeModelCaller();
  if (call) {
    try {
      const article = withInternalLinks(await generateArticleFromOutlineAI(call, {
        topic: promptTopic,
        keyword,
        category,
        targetCountry,
        author: chosenAuthor,
        outline,
      }));
      return res.json({ success: true, article, source: 'gemini-outline', wordCount: article.wordCount });
    } catch (genError) {
      console.error('Gemini outline generation error:', genError);
      // fall through to the deterministic outline writer
    }
  }

  // 2) No key / Gemini failed: deterministic outline expansion (3,000+ words, native es/de/fr/ja included)
  const generatedArticle = withInternalLinks(expandOutlineToArticle(outline, promptTopic, keyword, category, targetCountry, chosenAuthor));
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
  // DULU: volume/difficulty/cpc/trend/demografi dihitung dari hash string keyword dan ditampilkan
  // seolah data riset kata kunci asli. Itu karangan murni — dihapus. Tanpa integrasi keyword-research
  // (GSC/Ahrefs/SEMrush/dll.) beneran, kita jujur bilang datanya nggak ada, bukan nebak angka.
  res.json({
    keyword: clean,
    dataAvailable: false,
    note: 'Real search volume, CPC and difficulty require a connected keyword-research tool (Google Search Console, Ahrefs, SEMrush, etc.). This app does not estimate or fabricate those numbers.',
    suggestedLsi: [`how ${clean} works`, `${clean} vs alternatives`, `${clean} cost`, `is ${clean} worth it`],
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
      const prompt = `You are an editorial topic-planning assistant for Briefzy, following Google's helpful-content guidance.
Topic: "${currentTopic}" (Category: "${category}").
Suggest 5 keyword angles that real readers searching this topic would use, and for each one a title that would make a genuinely good, specific, benefit-stating article — no invented search-volume, CPC, difficulty, or "crawler score" numbers (we have no keyword-research tool connected, so we never fabricate those).

Rules for "autoTitle": specific about what the reader gets, no hype words (Ultimate, Definitive, Enterprise Blueprint, Playbook, Strategic Breakdown), no forced year/"Enterprise" unless the topic genuinely calls for it.

Return STRICT JSON matching this schema:
{
  "seedTopic": "${currentTopic}",
  "keywords": [
    {
      "keyword": "a real phrase people search",
      "intent": "Informational | Commercial | Transactional",
      "whyItMatters": "one short, honest sentence on why a reader searches this — not a sales pitch",
      "autoTitle": "Specific, benefit-stating title under 60 chars",
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

  // Fallback tanpa Gemini: tanpa angka karangan, tanpa judul template "Enterprise/ROI/Blueprint".
  const cleanSeed = (currentTopic || 'this topic').trim();
  const fallbackKeywords = [
    {
      keyword: `how does ${cleanSeed} work`,
      intent: 'Informational',
      whyItMatters: 'Readers who are new to the topic and want a plain explanation.',
      autoTitle: `How ${cleanSeed} Works, in Plain English`,
      secondaryLsi: [`${cleanSeed} basics`, `${cleanSeed} explained`, `${cleanSeed} for beginners`],
    },
    {
      keyword: `how to get started with ${cleanSeed}`,
      intent: 'Informational',
      whyItMatters: 'Readers ready to act but unsure of the first concrete step.',
      autoTitle: `How to Get Started With ${cleanSeed}: A Step-by-Step Guide`,
      secondaryLsi: [`${cleanSeed} setup`, `${cleanSeed} first steps`, `${cleanSeed} checklist`],
    },
    {
      keyword: `${cleanSeed} cost`,
      intent: 'Commercial',
      whyItMatters: 'Readers weighing whether the cost is worth it before committing.',
      autoTitle: `What ${cleanSeed} Actually Costs`,
      secondaryLsi: [`${cleanSeed} pricing`, `${cleanSeed} budget`, `is ${cleanSeed} worth it`],
    },
    {
      keyword: `${cleanSeed} vs alternatives`,
      intent: 'Commercial',
      whyItMatters: 'Readers comparing options before deciding.',
      autoTitle: `${cleanSeed} vs the Alternatives: Which Fits Your Situation`,
      secondaryLsi: [`${cleanSeed} alternatives`, `${cleanSeed} comparison`, `choosing between ${cleanSeed} options`],
    },
    {
      keyword: `${cleanSeed} risks`,
      intent: 'Informational',
      whyItMatters: 'Readers who want to know what can go wrong before they commit.',
      autoTitle: `The Real Risks of ${cleanSeed} (and How to Avoid Them)`,
      secondaryLsi: [`${cleanSeed} mistakes`, `${cleanSeed} safety`, `${cleanSeed} pitfalls`],
    },
  ];

  return res.json({
    success: true,
    seedTopic: currentTopic,
    keywords: fallbackKeywords,
    source: 'fallback-engine',
    note: 'No search-volume/CPC/difficulty numbers are shown — connect a real keyword-research tool for those.',
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
      const prompt = `You are a title editor for Briefzy, following Google's guidance that a good title is specific, states the real benefit, and is never exaggerated or misleading.
Primary Keyword: "${kw}"
Category: "${category}"

Generate 4 diverse, honest article titles that:
1. Work the primary keyword in naturally (front-loading is fine, but never at the cost of sounding natural).
2. Stay under 60 characters.
3. Each promise something the article can genuinely deliver — no unearned superlatives (Ultimate, Definitive, Best-Ever), no fake urgency, no vague "Strategic Breakdown"/"Enterprise Blueprint" padding.
4. Are clear enough on their own that a reader knows exactly what they'll learn before clicking.

Return STRICT JSON matching this schema:
{
  "primaryKeyword": "${kw}",
  "titles": [
    {
      "title": "Title String",
      "angle": "what this title promises, in one short honest phrase (e.g. 'plain-English explainer', 'step-by-step how-to', 'honest cost comparison')"
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

  // Fallback titles — specific and honest, no hype suffixes, no fabricated CTR predictions.
  const fallbackTitles = [
    { title: `What Is ${kw}? A Plain-English Explainer`, angle: 'plain-English explainer' },
    { title: `How ${kw} Actually Works`, angle: 'how-it-works explainer' },
    { title: `${kw}: What It Costs and Whether It's Worth It`, angle: 'honest cost/value breakdown' },
    { title: `How to Get Started With ${kw}, Step by Step`, angle: 'step-by-step how-to' },
  ];

  return res.json({
    success: true,
    primaryKeyword: kw,
    titles: fallbackTitles,
    source: 'fallback-engine',
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
          contents: `You are planning an article for Briefzy, following Google's guidance on helpful, reliable, people-first content. Topic: "${currentTopic}" (Category: ${category}).

First work out who actually searches for this and what problem they are trying to solve RIGHT NOW — do not assume "enterprise executives" or "investors" unless the topic genuinely is a B2B/finance topic. Infer the real audience and intent from the topic itself.

Outline requirements (this is the exact blueprint the writer will follow chapter by chapter):
- 6 to 9 sections, each addressing one concrete sub-problem the reader has, with 2 to 4 specific subtopics (H3s) each.
- targetWords should add up to what this topic genuinely needs to be answered well — do not pad with filler sections just to hit a word count.
- "recommendedCitations" for each section must name a type of source that is ACTUALLY relevant and checkable for that specific claim (e.g. the vendor's own documentation, a government/regulatory page, a standards body, a named academic study) — never a generic placeholder like "Gartner/IDC" unless the topic is genuinely enterprise market research.
- faqSchemaCandidates: exactly 5 questions a real reader of THIS topic would type into Google — not a generic "What is X and who is it for?" template.

Return STRICT JSON in the following schema:
{
  "workingTitle": "Specific, benefit-stating title (no more than 60 chars). It must describe what the reader actually gets. Do not use hype words (Ultimate, Definitive, Enterprise Blueprint, Playbook, 2026 Strategic Breakdown) and do not add a year or 'Enterprise' unless the topic genuinely is enterprise/dated.",
  "searchIntent": "Informational | Commercial Investigation | Transactional",
  "estimatedWordCount": 1800,
  "targetAudience": "describe the REAL audience for this specific topic, in plain words",
  "suggestedSlug": "clean-hyphenated-slug",
  "targetPrimaryKeyword": "${primaryKeyword || currentTopic}",
  "sections": [
    {
      "heading": "H2 Heading Text, phrased as the reader's actual question or sub-problem",
      "targetWords": 350,
      "subtopics": ["H3 point A", "H3 point B", "H3 point C"],
      "keywordsToInclude": ["keyword 1", "keyword 2"],
      "recommendedCitations": "a genuinely relevant, checkable source type for this exact claim"
    }
  ],
  "faqSchemaCandidates": [
    "Question 1?",
    "Question 2?",
    "Question 3?",
    "Question 4?",
    "Question 5?"
  ],
  "expertTakeawayTip": "One concrete, specific insight or example for this exact topic (not a generic authority claim)."
}`,
          config: {
            responseMimeType: 'application/json',
          },
        });
        const parsed = JSON.parse(response.text || '{}');
        return res.json({ success: true, mode: 'outline', data: parsed, source: 'gemini' });
      }

      if (mode === 'keywords') {
        // Nggak ada integrasi keyword-research beneran (Ahrefs/SEMrush/GSC) di sini, jadi kita TIDAK
        // minta model ngarang search volume/CPC/difficulty — angka presisi tanpa sumber itu fabrikasi.
        // Yang diminta: variasi keyword & pertanyaan nyata yang relevan secara topik, tanpa angka.
        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `For the topic "${currentTopic}" (Category: ${category}), suggest keyword variations and real reader questions that would genuinely help someone searching for this — no invented numbers.
Return STRICT JSON:
{
  "primaryKeyword": "${primaryKeyword || currentTopic}",
  "secondaryKeywords": [
    { "keyword": "string", "intent": "Informational | Commercial | Transactional", "why": "one short phrase on why a real reader would search this" }
  ],
  "longTailQuestions": [
    "a real question someone searching this topic would type into Google"
  ],
  "note": "If you want real search-volume/CPC numbers, connect a keyword-research tool (Google Search Console, Ahrefs, SEMrush, etc.) — this assistant does not fabricate those figures."
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
          contents: `You are the Briefzy Editorial Copilot, an assistant for Briefzy (briefzy.me). You give concise, actionable advice grounded in Google's helpful-content guidance: originality, completeness, accuracy, real sourcing, author transparency, and genuine reader benefit — never advice aimed at gaming search rankings or ad revenue at the expense of content quality.
User question/prompt: "${prompt || 'How can I make this article more genuinely helpful for readers?'}"`,
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
    // Fallback tanpa angka karangan — tanpa Gemini/keyword-research tool, kita jujur nggak punya data itu.
    const fallbackKeywords = {
      primaryKeyword: primaryKeyword || currentTopic,
      secondaryKeywords: [
        { keyword: `how does ${currentTopic} work`, intent: 'Informational' },
        { keyword: `${currentTopic} vs alternatives`, intent: 'Commercial' },
        { keyword: `${currentTopic} cost`, intent: 'Commercial' },
        { keyword: `is ${currentTopic} worth it`, intent: 'Informational' },
      ],
      longTailQuestions: [
        `How does ${currentTopic} actually work?`,
        `What does ${currentTopic} cost in practice?`,
        `What are the real risks of ${currentTopic}?`,
      ],
      note: 'No keyword-research tool is connected, so no search-volume/CPC/difficulty numbers are shown — connect Google Search Console or a similar tool for real figures instead of guessing.',
    };
    return res.json({ success: true, mode: 'keywords', data: fallbackKeywords, source: 'fallback-engine' });
  }

  if (mode === 'seo-audit') {
    // Dulu banyak field di sini hardcoded (score: 90, eeatRating: 'High', beberapa "passed: true" tanpa
    // ngecek apa pun) — itu audit palsu yang selalu bilang "lolos". Sekarang tiap item dicek dari
    // `content`/`title`/`metaDescription` yang beneran dikirim; yang nggak bisa dicek otomatis dibilang
    // terus terang "tidak diverifikasi" alih-alih ditebak.
    const titleLen = title.length;
    const metaLen = metaDescription.length;
    const hasKwInTitle = !!(primaryKeyword && title.toLowerCase().includes(primaryKeyword.toLowerCase()));
    const plainContent = String(content || '').replace(/<[^>]*>/g, ' ');
    const first100Words = plainContent.trim().split(/\s+/).slice(0, 100).join(' ').toLowerCase();
    const kwInFirst100 = !!(primaryKeyword && first100Words.includes(primaryKeyword.toLowerCase()));
    const h2Count = (content.match(/<h2[\s>]/gi) || []).length;
    const h3Count = (content.match(/<h3[\s>]/gi) || []).length;
    const hasFaqBlock = /<h2[^>]*>\s*(frequently asked|faq)/i.test(content) || /faqSchema/i.test(content);
    const hasExternalLink = /<a\s[^>]*href="https?:\/\/(?!briefzy\.me)/i.test(content);
    const metaOk = metaLen >= 130 && metaLen <= 165;

    const fallbackAudit = {
      titleAnalysis: {
        status: hasKwInTitle ? 'Pass' : 'Warning',
        feedback: hasKwInTitle
          ? `Title (${titleLen} chars) contains the primary keyword.`
          : `Primary keyword "${primaryKeyword}" was not found in the title — this is a real check against the text you supplied, not a guess.`,
      },
      metaDescriptionAnalysis: {
        status: metaOk ? 'Pass' : 'Warning',
        charCount: metaLen,
        feedback: metaOk
          ? `Length (${metaLen} chars) fits a typical Google SERP snippet.`
          : `Current length (${metaLen} chars) is outside the usual 140-160 char snippet window — this may get truncated or padded.`,
      },
      contentAnalysis: {
        h2Count,
        h3Count,
        hasFaqBlock,
        hasExternalLink,
        note: 'Keyword density, readability grade and E-E-A-T strength are not computed here — those need either a real NLP pass or human editorial judgment, so we do not print a made-up number for them.',
        actionableFixes: [
          ...(h2Count < 3 ? ['Add more H2 sections — this draft has ' + h2Count + ', which is thin structure.'] : []),
          ...(hasExternalLink ? [] : ['No outbound link to an external source was found — link to the primary/official source for any factual claim.']),
          ...(hasFaqBlock ? [] : ['No FAQ section detected — add one made of questions real readers actually ask.']),
        ],
      },
      googleGuidelinesChecklist: [
        { item: 'Primary keyword in title', passed: hasKwInTitle },
        { item: 'Primary keyword appears in the first 100 words', passed: kwInFirst100 },
        { item: 'Meta description within 140-160 chars', passed: metaOk },
        { item: 'At least 3 H2 sections', passed: h2Count >= 3 },
        { item: 'FAQ section present', passed: hasFaqBlock },
        { item: 'At least one external link to a real source', passed: hasExternalLink },
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
let adsensePublisherId = 'pub-8492019382104928';
let customAdsTxt = `# Google AdSense & Publisher Authorized Digital Sellers (ads.txt)
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
# LLMs discovery: https://briefzy.me/llms.txt
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(robotsTxt);
});

// POST /api/seo/ping-indexnow - Notify search engines & AI discovery crawlers of updated URLs
app.post('/api/seo/ping-indexnow', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { urls } = req.body || {};
  const list = Array.isArray(urls) ? urls.map(String).filter(Boolean).slice(0, 50) : [];
  if (!list.length) {
    return res.status(400).json({ error: 'urls array is required' });
  }
  const indexNowKey = 'briefzy-indexnow-v1';
  const payload = {
    host: 'briefzy.me',
    key: indexNowKey,
    keyLocation: `https://briefzy.me/${indexNowKey}.txt`,
    urlList: list.map((u) => (u.startsWith('http') ? u : `https://briefzy.me${u.startsWith('/') ? u : '/' + u}`)),
  };
  let pinged = false;
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    pinged = r.ok || r.status === 202;
  } catch {
    pinged = false;
  }
  return res.json({ success: true, submitted: payload.urlList.length, indexNowAccepted: pinged });
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
// API: Real Visitor & Google Analytics 4 / GTM Telemetry Store
// -------------------------------------------------------------
const ANALYTICS_KEY = 'briefzy:analytics:v1';

interface StoredAnalyticsEvent {
  ts: number;
  sessionId: string;
  path: string;
  title: string;
  category: string;
  referrerHost: string;
  trafficSource: 'google_organic' | 'search' | 'social' | 'referral' | 'direct';
  searchTerm: string;
  country: string;
  device: 'desktop' | 'mobile' | 'tablet';
}

interface StoredAnalyticsStore {
  events: StoredAnalyticsEvent[];
  sessions: Record<
    string,
    {
      lastSeen: number;
      firstSeen: number;
      path: string;
      country: string;
      trafficSource: string;
      device: string;
    }
  >;
}

const COUNTRY_NAME_MAP: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  ID: 'Indonesia',
  SG: 'Singapore',
  MY: 'Malaysia',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  IN: 'India',
  NL: 'Netherlands',
};

function resolveVisitorCountry(req: any, timezone: string, language: string): string {
  const hdrCountry = String(
    req.headers?.['cf-ipcountry'] ||
      req.headers?.['x-appengine-country'] ||
      req.headers?.['x-vercel-ip-country'] ||
      ''
  )
    .trim()
    .toUpperCase();
  if (hdrCountry && hdrCountry !== 'XX' && hdrCountry !== 'T1') {
    return COUNTRY_NAME_MAP[hdrCountry] || hdrCountry;
  }
  const tz = String(timezone || '');
  if (tz.startsWith('America/')) {
    if (/Toronto|Vancouver|Montreal|Edmonton|Winnipeg|Halifax/.test(tz)) return 'Canada';
    return 'United States';
  }
  if (tz.startsWith('Asia/Jakarta') || tz.startsWith('Asia/Makassar') || tz.startsWith('Asia/Jayapura')) return 'Indonesia';
  if (tz.startsWith('Asia/Singapore')) return 'Singapore';
  if (tz.startsWith('Asia/Kuala_Lumpur')) return 'Malaysia';
  if (tz.startsWith('Asia/Tokyo')) return 'Japan';
  if (tz.startsWith('Europe/London')) return 'United Kingdom';
  if (tz.startsWith('Europe/Berlin')) return 'Germany';
  if (tz.startsWith('Europe/Paris')) return 'France';
  if (tz.startsWith('Australia/')) return 'Australia';
  const langParts = String(language || '').split('-');
  if (langParts[1]) {
    const code = langParts[1].toUpperCase();
    return COUNTRY_NAME_MAP[code] || code;
  }
  return 'Global / Unknown';
}

async function readAnalyticsStore(): Promise<StoredAnalyticsStore> {
  const raw = await store.get(ANALYTICS_KEY);
  if (!raw) return { events: [], sessions: {} };
  try {
    const parsed = JSON.parse(raw);
    return {
      events: Array.isArray(parsed?.events) ? parsed.events : [],
      sessions: parsed?.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
    };
  } catch {
    return { events: [], sessions: {} };
  }
}

app.post('/api/analytics/collect', async (req, res) => {
  const ua = String(req.headers?.['user-agent'] || '').toLowerCase();
  if (/bot|crawler|spider|headless|slurp|bingpreview/.test(ua)) {
    return res.json({ ok: true, ignored: 'crawler' });
  }

  const body = req.body || {};
  const sessionId = String(body.sessionId || '').trim().slice(0, 64);
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId required' });
  }

  const now = Date.now();
  const type = body.type === 'heartbeat' ? 'heartbeat' : 'pageview';
  const reqPath = String(body.path || '/').trim().slice(0, 220) || '/';
  const title = String(body.title || 'Briefzy').trim().slice(0, 180);
  const category = String(body.category || 'General').trim().slice(0, 80);
  const referrerHost = String(body.referrerHost || 'direct').trim().slice(0, 100);
  const allowedSources = new Set(['google_organic', 'search', 'social', 'referral', 'direct']);
  const trafficSource = allowedSources.has(body.trafficSource) ? body.trafficSource : 'direct';
  const searchTerm = String(body.searchTerm || '').trim().slice(0, 120);
  const device = body.device === 'mobile' || body.device === 'tablet' ? body.device : 'desktop';
  const country = resolveVisitorCountry(req, String(body.timezone || ''), String(body.language || req.headers?.['accept-language'] || ''));

  const data = await readAnalyticsStore();
  const existingSession = data.sessions[sessionId];
  data.sessions[sessionId] = {
    firstSeen: existingSession?.firstSeen || now,
    lastSeen: now,
    path: reqPath,
    country,
    trafficSource,
    device,
  };

  // Prune sessions older than 7 days to keep storage compact
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  for (const sid of Object.keys(data.sessions)) {
    if ((data.sessions[sid]?.lastSeen || 0) < sevenDaysAgo) {
      delete data.sessions[sid];
    }
  }

  if (type === 'pageview') {
    data.events.push({
      ts: now,
      sessionId,
      path: reqPath,
      title,
      category,
      referrerHost,
      trafficSource,
      searchTerm,
      country,
      device,
    });
    if (data.events.length > 1500) {
      data.events = data.events.slice(-1500);
    }
  }

  await store.put(ANALYTICS_KEY, JSON.stringify(data));
  return res.json({ ok: true });
});

app.get('/api/analytics/summary', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const now = Date.now();
  const fiveMinsAgo = now - 5 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const data = await readAnalyticsStore();
  const events7d = data.events.filter((e) => e.ts >= sevenDaysAgo);
  const events24h = events7d.filter((e) => e.ts >= oneDayAgo);

  const activeSessionIds = Object.keys(data.sessions).filter((sid) => (data.sessions[sid]?.lastSeen || 0) >= fiveMinsAgo);
  const sessions24hSet = new Set(events24h.map((e) => e.sessionId));
  const sessions7dSet = new Set(events7d.map((e) => e.sessionId));

  const sourceCounts = { google_organic: 0, search: 0, social: 0, referral: 0, direct: 0 };
  const countryMap = new Map<string, Set<string>>();
  const pageMap = new Map<string, { path: string; title: string; category: string; views: number; sessions: Set<string> }>();
  const refMap = new Map<string, number>();
  const termMap = new Map<string, number>();
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };

  for (const ev of events7d) {
    if (ev.trafficSource in sourceCounts) {
      sourceCounts[ev.trafficSource as keyof typeof sourceCounts]++;
    } else {
      sourceCounts.direct++;
    }
    if (ev.device in deviceCounts) {
      deviceCounts[ev.device as keyof typeof deviceCounts]++;
    }
    const cSet = countryMap.get(ev.country) || new Set<string>();
    cSet.add(ev.sessionId);
    countryMap.set(ev.country, cSet);

    const pEntry = pageMap.get(ev.path) || {
      path: ev.path,
      title: ev.title,
      category: ev.category,
      views: 0,
      sessions: new Set<string>(),
    };
    pEntry.views++;
    pEntry.title = ev.title || pEntry.title;
    pEntry.category = ev.category || pEntry.category;
    pEntry.sessions.add(ev.sessionId);
    pageMap.set(ev.path, pEntry);

    if (ev.referrerHost && ev.referrerHost !== 'direct') {
      refMap.set(ev.referrerHost, (refMap.get(ev.referrerHost) || 0) + 1);
    }
    if (ev.searchTerm) {
      termMap.set(ev.searchTerm, (termMap.get(ev.searchTerm) || 0) + 1);
    }
  }

  const total7d = events7d.length;
  const googleOrganicPct = total7d > 0 ? Math.round(((sourceCounts.google_organic + sourceCounts.search) / total7d) * 1000) / 10 : 0;

  const totalUnique7d = Math.max(1, sessions7dSet.size);
  const topCountries = Array.from(countryMap.entries())
    .map(([country, set]) => ({
      country,
      sessions: set.size,
      pct: Math.round((set.size / totalUnique7d) * 100),
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 6);

  const topPages = Array.from(pageMap.values())
    .map((p) => ({
      path: p.path,
      title: p.title,
      category: p.category,
      views: p.views,
      uniqueSessions: p.sessions.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const topReferrers = Array.from(refMap.entries())
    .map(([host, count]) => ({ host, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const searchTerms = Array.from(termMap.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const recentEvents = events7d
    .slice(-15)
    .reverse()
    .map((ev) => ({
      ts: ev.ts,
      path: ev.path,
      title: ev.title,
      category: ev.category,
      country: ev.country,
      trafficSource: ev.trafficSource,
      referrerHost: ev.referrerHost,
      device: ev.device,
    }));

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    gaConfig: {
      streamId: '16361244528',
      measurementId: 'G-QHZB8V4TXG',
      gtmId: 'GTM-P8SMG3L3',
      adsensePublisherId,
      isAdSenseConfigured: !!adsensePublisherId && adsensePublisherId !== 'pub-8492019382104928',
    },
    activeReaders: activeSessionIds.length,
    pageviews24h: events24h.length,
    pageviews7d: total7d,
    totalTrackedEvents: data.events.length,
    uniqueSessions24h: sessions24hSet.size,
    uniqueSessions7d: sessions7dSet.size,
    googleOrganicPct,
    sourceBreakdown: sourceCounts,
    deviceBreakdown: deviceCounts,
    topCountries,
    topPages,
    topReferrers,
    searchTerms,
    recentEvents,
    generatedAt: new Date(now).toISOString(),
  });
});

// Blogspot / Blogger (multi-blog publishing) registered in startServer() for Node/Express

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

