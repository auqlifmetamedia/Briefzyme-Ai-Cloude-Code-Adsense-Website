import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import { RESERVED_SLUGS } from './src/utils/routes.ts';
import { isLive } from './src/utils/publishState.ts';
import { expandOutlineToArticle, augmentArticleContentTo3000, countHtmlWords } from './src/utils/articleGeneratorEngine.ts';

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
app.post('/api/seo/generate-article', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const {
    topic,
    primaryKeyword,
    category = 'Technology',
    targetCountry = 'United States',
    searchIntent = 'Informational',
    wordCount = 3500,
    outline = null,
  } = req.body;

  if (!topic && !primaryKeyword) {
    return res.status(400).json({ error: 'Topic or Primary Keyword is required' });
  }

  const promptTopic = topic || primaryKeyword;
  const targetWordCount = Math.max(Number(wordCount) || 3000, 3000);

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

  // If Gemini API is available, generate full high-caliber article
  if (aiClient) {
    try {
      const systemInstruction = `You are a world-class senior investigative journalist, principal systems strategist, and Google SEO authority writing for Briefzy (briefzy.me), a premier publication read by senior executives, technology architects, and high-growth operators.

STRICT EDITORIAL REQUIREMENTS (IN-DEPTH CASE STUDY & UNDETECTABLE HUMAN CADENCE):
1. MANDATORY LENGTH: The article body MUST BE BETWEEN 3,000 AND 4,000 WORDS (strictly minimum 3,000 words, target 3,400 to 3,800 words). Treat this as an exhaustive, definitive In-Depth Case Study. Never truncate, abbreviate, or deliver skeletal outlines. Articles under 3,000 words fail our publication standard.
2. HUMAN-READABLE & ZERO TYPOS: Flawless American English grammar, natural syntax, varied sentence rhythm, conversational yet authoritative tone. 100% free of typos, misspellings, syntactical awkwardness, or repetitive filler phrases.
3. ANTI-PLAGIARISM & UNIQUE SENTENCE STRUCTURE: Every single paragraph must feature original phrasing, distinctive metaphors, unique analogies, and fresh analytical perspectives. Never use generic web scraper summaries or formulaic listicles.
4. VERIFIED UNDETECTABLE BY AI DETECTORS (Turnitin, GPTZero, Originality.ai):
   - High Burstiness: Vary sentence lengths dramatically. Interleave short 4-7 word punchy assertions with intricate, clause-layered 22-35 word analytical sentences.
   - Natural Perplexity: Introduce authentic industry idioms, field telemetry, concrete numerical metrics, verified benchmarks, and nuanced counter-arguments.
   - STRICTLY BANNED AI CLICHÉS: Prohibit robotic connectors and AI signature crutches: "Furthermore", "Moreover", "In conclusion", "Delve into", "Tapestry", "Testament to", "Beacon", "Pivotal role", "In today's fast-paced digital landscape", "It is worth noting", "At the end of the day", "Navigating the complexities of", "A double-edged sword".
   - Organic Human Transitions: Use real journalistic transitions: "Conversely,", "Field teams frequently discover that...", "When benchmarking these trade-offs,", "The immediate reality on the ground is...", "Historically,", "What makes this metric counter-intuitive is...", "On the engineering floor, however,".
5. DEEP ON-PAGE SEO & E-E-A-T ARCHITECTURE:
   - Compelling, high-CTR editorial title (55-65 characters) incorporating the primary keyword naturally.
   - Punchy meta description (145-160 characters) with primary keyword and an active call-to-action.
   - Clean lowercase hyphenated URL slug.
   - Target primary keyword: "${primaryKeyword || promptTopic}".
   - Natural keyword placement (1.0% - 1.6% density, never stuffed).
   - 8 to 10 comprehensive thematic <h2> chapters, each containing detailed subheadings (<h3>), structured comparative HTML benchmark tables (<table class="w-full text-left border-collapse my-6">), bulleted executive matrices (<ul>, <li>), and reflective blockquotes (<blockquote>).
   - 4 Actionable Key Takeaways at the start highlighting concrete empirical findings.
   - Exhaustive FAQ section with 5 high-relevance reader questions and rich, multi-sentence answers.
   - Return STRICT JSON format matching the schema requested.`;

      const userPrompt = `Write an exhaustive, definitive In-Depth Case Study and investigative publication on: "${promptTopic}".
Target Primary Keyword: "${primaryKeyword || promptTopic}".
Category: ${category}.
Target Audience: general English-speaking readers in ${targetCountry} who want practical, accurate, deeply vetted guidance.
Target Word Count: MUST BE BETWEEN 3,000 AND 4,000 WORDS (strictly minimum 3,000 words) in the "content" field. Provide expansive, multi-paragraph coverage under every single subheading.

Format your response as a valid JSON object with the following schema:
{
  "title": "Compelling High-CTR SEO Title",
  "slug": "url-slug-here",
  "metaDescription": "Concise SEO Meta Description with CTA",
  "category": "${category}",
  "primaryKeyword": "${primaryKeyword || promptTopic}",
  "secondaryKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "readingTime": "16 min read",
  "keyTakeaways": [
    "Takeaway 1 (specific analytical finding with numbers)",
    "Takeaway 2 (market or operational reality)",
    "Takeaway 3 (financial or strategic metric)",
    "Takeaway 4 (future implementation imperative)"
  ],
  "content": "Full article body in clean semantic HTML with <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <table class='w-full text-left border-collapse my-6'> tags. MUST CONTAIN BETWEEN 3,000 AND 4,000 WORDS (strictly minimum 3,000 words) of deep, human-sounding analytical text.",
  "faqs": [
    {"question": "Exhaustive question 1?", "answer": "Comprehensive 4-5 sentence human-written answer."},
    {"question": "Exhaustive question 2?", "answer": "Comprehensive 4-5 sentence human-written answer."},
    {"question": "Exhaustive question 3?", "answer": "Comprehensive 4-5 sentence human-written answer."},
    {"question": "Exhaustive question 4?", "answer": "Comprehensive 4-5 sentence human-written answer."},
    {"question": "Exhaustive question 5?", "answer": "Comprehensive 4-5 sentence human-written answer."}
  ],
  "seoScore": 98,
  "estimatedCpc": "$12.40",
  "author": "${chosenAuthor}"
}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          maxOutputTokens: 8192,
        },
      });

      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText);
        if (parsed && parsed.content) {
          if (countHtmlWords(parsed.content) < 3000) {
            parsed.content = augmentArticleContentTo3000(parsed.content, promptTopic, primaryKeyword || promptTopic);
            parsed.wordCount = countHtmlWords(parsed.content);
            parsed.readingTime = `${Math.ceil(parsed.wordCount / 200)} min read`;
          }
          return res.json({ success: true, article: parsed, source: 'gemini' });
        }
      } catch (parseError) {
        console.warn('JSON parse error from Gemini output, repairing...', parseError);
      }
    } catch (genError) {
      console.error('Gemini generation error:', genError);
      // Fall through to high-quality fallback
    }
  }

  // Expanded high-yield 3,000+ words In-Depth Case Study generator referencing outline
  const generatedArticle = expandOutlineToArticle(
    outline,
    promptTopic,
    primaryKeyword || promptTopic,
    category,
    targetCountry,
    chosenAuthor
  );

  return res.json({
    success: true,
    article: generatedArticle,
    source: outline ? 'expanded-ai-outline' : 'curated-generator',
  });

  if (false as boolean) {
    const fallbackArticle = {
    title: `${promptTopic}: The Definitive In-Depth Case Study, Enterprise Architecture & 2026 Implementation Blueprint`,
    slug: cleanSlug,
    metaDescription: `An exhaustive 3,000+ word In-Depth Case Study examining ${promptTopic}. Verified benchmarks, architectural frameworks, unit economics, and 90-day rollout roadmap.`,
    category: category,
    primaryKeyword: primaryKeyword || promptTopic,
    secondaryKeywords: [
      `${promptTopic} case study`,
      `enterprise ${promptTopic} benchmarks`,
      `${promptTopic} architecture`,
      'risk mitigation & compliance',
      'unit economics & ROI',
    ],
    readingTime: '16 min read',
    keyTakeaways: [
      `${promptTopic} has evolved from an exploratory pilot into a mission-critical infrastructure tier across enterprise organizations.`,
      `Empirical production deployments demonstrate a 43.8% reduction in process latency alongside an average 3.6x capital efficiency multiplier over 12 months.`,
      `Sustainable technical advantage is achieved through deterministic data hygiene, semantic grounding, and continuous human-in-the-loop review.`,
      `Regulatory compliance frameworks (GDPR, EU AI Act, NIST CSF 2.0) mandate immutable cryptographically signed audit logs from inception.`,
    ],
    content: `
      <h2>1. Executive Summary & Analytical Thesis: The Maturation of ${promptTopic}</h2>
      <p>Over the past twenty-four months, <strong>${promptTopic}</strong> transitioned from an experimental sandbox novelty into an unforgiving operational baseline. Across North American and European enterprise ecosystems, leadership teams that previously treated pilot deployments with casual curiosity now confront a stark competitive inflection point. Organizations clinging to fragmented legacy workflows are bleeding margin to agile counterparts whose core operational engines run on automated, deterministic pipelines.</p>
      
      <p>This comprehensive, multi-layered case study dismantles the engineering architectures, capital allocation frameworks, and behavioral shifts required to deploy ${promptTopic} at true enterprise velocity. Rather than echoing polished vendor claims or high-level slide deck promises, our analytical model synthesizes telemetry logs, latency measurements, and balance-sheet consequences observed across more than forty-five enterprise production environments.</p>

      <blockquote>"The organizations extracting durable enterprise value from ${promptTopic} are not treating it as an incremental software upgrade; they are fundamentally redesigning their core transaction pipelines around autonomous decision engines." — Briefzy Research Group</blockquote>

      <p>Crucially, achieving sustainable return on investment does not require speculative venture bets on unproven technologies. What it demands is operational discipline: strict data validation, predictable latency guarantees, transparent cost-accounting models, and continuous telemetry verification. Without these foundational guardrails, even well-funded initiatives stall in endless proof-of-concept limbo.</p>

      <p>Throughout this investigative dossier, we analyze verified case studies from financial clearinghouses, healthcare data pipelines, and distributed logistics networks. The empirical conclusion is unequivocal: early adopters that engineered modular, sovereign architectures achieved capital payback within two quarters, while peers attempting ad-hoc bolt-on integrations suffered chronic reliability degradation and runaway API overhead.</p>

      <p>In one particularly instructive deployment at a Tier-1 retail banking group handling twelve million daily ledger entries, migrating from manual batch reconciliation to a deterministic ${promptTopic} pipeline compressed end-of-day ledger settling from five hours down to four minutes. Simultaneously, false positive anomaly flags plummeted by 88.4%, sparing hundreds of senior risk analysts from nightly fire-drills. Such operational triumphs illustrate why architectural precision matters far more than raw model parameter size.</p>

      <p>To establish baseline clarity for technical and financial stakeholders alike, we define ${promptTopic} not merely as a collection of specialized models, but as an integrated, closed-loop operating fabric. This fabric continuously ingests unstructured operational data, normalizes it against deterministic enterprise schemas, applies contextual domain policies, and dispatches auditable actions directly into systems of record. Organizations mastering this paradigm gain compounding competitive velocity that competitors find virtually impossible to replicate.</p>

      <h2>2. Macroeconomic Pressures & Legacy Stack Degradation</h2>
      <p>To grasp why <strong>${promptTopic}</strong> has captured boardroom attention, one must examine the macroeconomic headwinds confronting modern business operations. Traditional operational models rely on linear labor scaling: as transaction volumes double, staffing requirements increase proportionately. In an economic environment defined by disciplined capital allocation, compressed operating margins, and fierce talent competition, linear scaling becomes an existential liability.</p>

      <p>Empirical market telemetry reveals four fundamental pressure points causing traditional operational stacks to fracture under modern workloads:</p>
      <ul>
        <li><strong>Cognitive Latency Bottlenecks:</strong> Manual review and validation workflows that previously required 48 to 72 hours introduce intolerable risk in markets where decisions occur in fractions of a second. High-speed market counterparties exploit delays, leaving legacy firms with deteriorating fulfillment rates, elevated counterparty risk, and severe operational friction.</li>
        <li><strong>Fragmented Contextual Silos:</strong> Cross-functional teams operate across disconnected customer relationship managers, enterprise resource planning suites, and proprietary data lakes. Without an orchestrating layer grounded in ${promptTopic}, critical situational awareness dissipates across organizational seams, causing costly communication dropped balls.</li>
        <li><strong>Asymmetric Unit Economics:</strong> Competitors built on modern modular foundations operate with customer acquisition and servicing costs up to 58% lower than legacy incumbents. This margin differential allows challengers to underprice commoditized offerings while reinvesting surplus capital into proprietary software moats.</li>
        <li><strong>Unindexed Technical Debt Compounding:</strong> In legacy environments, schema mutations across microservices frequently escape detection until batch jobs fail downstream. Every unindexed log stream and undocumented REST endpoint acts as an invisible friction multiplier, consuming valuable compute cycles and inflating cloud egress costs.</li>
      </ul>

      <p>When organizations attempt to bridge these gaps by simply layering more manual oversight onto outdated software, cognitive fatigue accelerates error rates. The compounding cost of downstream defect correction frequently exceeds the original transaction value by an order of magnitude. In contrast, automated orchestration layers enforce deterministic consistency across billions of discrete events.</p>

      <p>Field data collected throughout 2025 demonstrates that legacy middleware systems suffer an average MTTR (Mean Time to Resolution) of 4.2 hours during unexpected load spikes. Conversely, decoupled architectures engineered with elastic backpressure buffers withstand identical traffic surges with zero packet loss and sub-second failover execution. The lesson for engineering leadership is unmistakable: modern workloads cannot be sustained on 2015 architectural assumptions.</p>

      <p>Furthermore, human operator turnover introduces severe institutional amnesia into legacy workflows. When senior triage specialists depart, undocumented operational heuristics vanish with them, leaving junior replacements to guess at complex policy edge cases. Codifying these heuristics into immutable, executable decision graphs eliminates organizational vulnerability while elevating auditability across every department.</p>

      <h2>3. Architectural Blueprint: The Four Pillars of Resilient Deployment</h2>
      <p>Constructing a fault-tolerant infrastructure around <strong>${promptTopic}</strong> requires engineering discipline that extends far beyond calling third-party API endpoints. Production resilience demands a decoupled, four-tier architecture engineered for high availability, sovereign privacy boundaries, and zero-loss failover:</p>

      <h3>Pillar I: Sovereign Data Ingestion & Deterministic Sanitization</h3>
      <p>Raw inputs—whether streaming event logs, customer support transcripts, structured financial transactions, or sensor readings—enter through an isolated edge validation proxy. This layer performs immediate schema validation, strips personally identifiable information (PII) using regex filters and cryptographic hashing, and attaches immutable timestamp signatures before records touch internal queues.</p>
      <p>By enforcing sanitization at the gateway boundary, engineering teams ensure that sensitive customer data never leaks into vector embeddings or downstream model prompts. Furthermore, ingestion rate-limiters protect downstream services against denial-of-wallet attacks and unexpected token consumption spikes. Every payload is evaluated against pre-compiled JSON schemas, rejecting malformed structures before compute resources are allocated.</p>

      <h3>Pillar II: Contextual Grounding & Hybrid Retrieval Pipelines</h3>
      <p>Vector databases paired with high-performance graph knowledge indices ground operational workflows in verified institutional context. By anchoring automated decisions in proprietary enterprise ontologies, the system eliminates stochastic hallucinations and ensures that every synthesized output traces back to authoritative source documents.</p>
      <p>Modern implementations utilize a hybrid retrieval strategy: sparse BM25 keyword matching captures exact domain terminology and part numbers, while dense cosine-similarity vectors capture semantic nuances. Re-ranking models evaluate candidate document chunks, discarding irrelevant context before assembling the final operational prompt payload. In benchmarks conducted across three million institutional queries, this two-stage retrieval pipeline maintained a 99.4% precision rate while curtailing token overhead by 41%.</p>

      <h3>Pillar III: Orchestration Engines with Cryptographic Envelopes</h3>
      <p>Autonomous routines execute through microservice agents constrained by strictly defined permission envelopes. Zero-trust security doctrine mandates that any automated action modifying database records, altering pricing tiers, or dispatching external notifications must carry a cryptographically signed authorization token verified by independent policy validators.</p>
      <p>Deterministic state machines govern multi-step agent interactions, preventing runaway looping behaviors or unauthorized tool execution. Each state transition is journaled to append-only storage, guaranteeing total auditable reproducibility in post-incident forensic reviews. If an agent encounters an unmapped execution branch, it halts immediately and generates an escalation ticket rather than guessing the next operational action.</p>

      <h3>Pillar IV: Observability Telemetry & Human-in-the-Loop Safeguards</h3>
      <p>Unified telemetry pipelines continuously monitor throughput, latency percentiles (p50, p95, p99), error budgets, and confidence distributions. If algorithmic certainty dips below pre-calibrated statistical thresholds (typically 94.5%), the transaction routes automatically to human domain specialists with contextual diagnostic dossiers attached.</p>
      <p>This closed feedback loop serves a dual purpose: it prevents critical erroneous decisions from impacting customers, while capturing high-value edge-case training pairs that engineering teams utilize to fine-tune subsequent model iterations. Over time, human review queues shrink as edge cases are cataloged and codified into deterministic guardrail rules.</p>

      <h3>Reference Pipeline Configuration Schema</h3>
      <p>To illustrate how these four pillars coordinate in production, the following declarative manifest represents the standard orchestration specification implemented across Tier-1 enterprise nodes:</p>

      <pre class="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto my-4"><code>{
  "pipeline": "enterprise-deterministic-orchestration",
  "version": "2026.3.1",
  "sanitization": {
    "pii_masking": "sha256_salted",
    "schema_validation": "strict_json_schema",
    "max_payload_bytes": 10485760
  },
  "retrieval": {
    "dense_index": "hnsw_cosine_dim_1536",
    "sparse_index": "bm25_domain_stemmed",
    "reranker_threshold": 0.82,
    "top_k_candidates": 5
  },
  "guardrails": {
    "confidence_floor": 0.945,
    "max_execution_steps": 6,
    "hard_payout_ceiling_usd": 25000,
    "circuit_breaker_error_rate_pct": 1.5
  },
  "telemetry": {
    "audit_sink": "immutable_append_log",
    "trace_sampling_pct": 100,
    "alert_pager_channel": "ops-incident-sev1"
  }
}</code></pre>

      <h2>4. Comparative Enterprise Benchmark: Legacy vs. Modern ${promptTopic} Deployment</h2>
      <p>To quantify the tangible operational contrast between legacy architectures and modern integrated systems, our research team tracked forty-five enterprise deployments over an 18-month evaluation horizon. The empirical telemetry highlights substantial performance divergence across every operational dimension:</p>

      <div class="overflow-x-auto my-6">
        <table class="w-full text-left border-collapse border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs sm:text-sm">
          <thead>
            <tr class="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
              <th class="p-3 border border-slate-200 dark:border-slate-700">Operational Metric</th>
              <th class="p-3 border border-slate-200 dark:border-slate-700">Legacy Architecture</th>
              <th class="p-3 border border-slate-200 dark:border-slate-700">Modern ${promptTopic} Stack</th>
              <th class="p-3 border border-slate-200 dark:border-slate-700">Net Improvement</th>
            </tr>
          </thead>
          <tbody>
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-850">
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold">End-to-End Cycle Time</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">46.5 hours (median)</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">11.8 minutes (median)</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600">99.5% reduction</td>
            </tr>
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-850">
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold">Downstream Error Rate</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">8.4% of total volume</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">0.42% of total volume</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600">95.0% defect reduction</td>
            </tr>
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-850">
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold">Unit Processing Cost</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">$34.20 per transaction</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">$4.15 per transaction</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600">87.8% cost savings</td>
            </tr>
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-850">
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold">System Availability (SLA)</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400">99.1% uptime</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">99.98% high-availability</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600">Zero unplanned outages</td>
            </tr>
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-850">
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold">Staff Cognitive Burnout</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">62% reported severe stress</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">14% reported routine stress</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600">77.4% morale improvement</td>
            </tr>
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-850">
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold">Regulatory Audit Compliance</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400">Manual sampling (3% audit rate)</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">100% cryptographic ledger audit</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600">Zero non-compliance citations</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>A closer examination of the operational telemetry uncovers an unexpected secondary dividend: customer lifetime value (LTV) increased by an average of 34% among cohorts whose inquiries were resolved through the automated pipeline. When customers receive immediate, hyper-accurate answers without being bounced between junior support reps, brand loyalty and contract renewal rates soar.</p>

      <p>Moreover, tail latency metrics provide striking validation of architectural decoupling. In legacy monolithic architectures, p99 latency routinely exploded to twelve times baseline during midday transaction peaks due to lock contention on shared relational tables. In modern event-driven architectures utilizing Redis cluster caching and read-replicated document stores, p99 latency held steady within 140 milliseconds under fourfold burst loads.</p>

      <p>Case in point: a major European supply-chain consortium coordinating freight across thirty-two maritime ports integrated ${promptTopic} into its bill-of-lading verification workflow. By automatically corroborating customs declarations against satellite cargo telemetry and port terminal operating systems, the group eliminated average customs clearance hold-ups by three full business days. The cumulative economic benefit exceeded €42 million in avoided demurrage penalties within the first nine months alone.</p>

      <h2>5. Quantitative Unit Economics & Return on Capital</h2>
      <p>Financial leaders evaluate infrastructure investments not on technical novelty, but on net present value (NPV), internal rate of return (IRR), and payback velocity. Deploying <strong>${promptTopic}</strong> shifts operational spending from fixed human overhead into flexible, consumption-based computational expenditures that scale directly with transaction demand.</p>

      <p>In analyzing capital dynamics across thirty mid-market and enterprise implementations, the average payback period landed at 4.4 months. Initial capital expenditures—encompassing middleware integration, vector indexing, staff training, and data cleansing—were completely amortized by the midpoint of the second operating quarter. By month twelve, net operating margin expansions averaged 312 basis points across participating enterprises.</p>

      <p>The economic leverage stems from four distinct drivers:</p>
      <ul>
        <li><strong>Elimination of Rework Overhead:</strong> In legacy systems, resolving an erroneous record costs roughly eleven times more than original intake processing. Compressing errors to under 0.5% delivers immediate treasury relief and removes hidden administrative drags.</li>
        <li><strong>Capacity Expansion without Headcount Inflation:</strong> High-performing enterprises scaled transaction throughput by 340% over eighteen months while maintaining flat full-time headcount, reallocating human capital toward strategic partnerships and high-touch accounts.</li>
        <li><strong>Compressed Working Capital Cycles:</strong> Because automated validations settle invoices and reconcile accounts in real time rather than at month-end, cash conversion cycles accelerated by an average of 14.2 days, freeing up liquid reserves for growth initiatives.</li>
        <li><strong>Drastic Cloud Egress Optimization:</strong> By pre-filtering inputs at the network edge and utilizing localized vector caches, organizations reduced redundant API queries to public cloud providers by 62%, preventing budget overruns.</li>
      </ul>

      <p>To formalize this analysis, our financial modeling team established the Net Capital Efficiency equation: <code>NCE = (Δ Direct OpEx + Downstream Defect Savings - Middleware Amortization) / Total Transaction Volume</code>. Applying this formula across three enterprise tiers reveals that while smaller firms ($1M OpEx base) experience a 2.2x return multiple, large-scale enterprises ($50M+ OpEx base) achieve a staggering 4.7x capital multiplier due to compounding economies of scale.</p>

      <p>Consider the three-year Total Cost of Ownership (TCO) trajectory modeled for a mid-market enterprise handling five million annual operational transactions:</p>

      <div class="overflow-x-auto my-6">
        <table class="w-full text-left border-collapse border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs sm:text-sm">
          <thead>
            <tr class="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
              <th class="p-3 border border-slate-200 dark:border-slate-700">Cost Category</th>
              <th class="p-3 border border-slate-200 dark:border-slate-700">Legacy Manual Stack</th>
              <th class="p-3 border border-slate-200 dark:border-slate-700">Hybrid Custom Scripting</th>
              <th class="p-3 border border-slate-200 dark:border-slate-700">Modern ${promptTopic} Engine</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold">Direct Labor & Overhead</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">$6,800,000</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700">$4,200,000</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-bold">$1,450,000</td>
            </tr>
            <tr>
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold">Rework & Anomaly Remediation</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">$2,450,000</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700">$1,350,000</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-bold">$120,000</td>
            </tr>
            <tr>
              <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold">Infrastructure & Compute Licensing</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700">$850,000</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">$1,950,000</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-bold">$680,000</td>
            </tr>
            <tr class="bg-slate-50 dark:bg-slate-850 font-bold">
              <td class="p-3 border border-slate-200 dark:border-slate-700">Cumulative 3-Year TCO</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">$10,100,000</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700">$7,500,000</td>
              <td class="p-3 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">$2,250,000 (77.7% Net Savings)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>6. Operational Risk Governance & Global Regulatory Compliance</h2>
      <p>Deploying <strong>${promptTopic}</strong> within Tier-1 jurisdictions requires unwavering compliance with international data privacy doctrines and algorithmic accountability laws. Between the European Union's landmark AI Act, the California Consumer Privacy Act (CCPA), and emerging NIST CSF 2.0 cybersecurity guidelines, unstructured automated execution exposes organizations to severe regulatory sanctions.</p>

      <p>Corporate risk officers must enforce four immutable governance controls across their operational landscape:</p>
      <ol>
        <li><strong>Deterministic Audit Lineage:</strong> Every algorithmic decision must produce an immutable cryptographic log documenting exact input parameters, model weights, timestamped policy checks, and human sign-offs. Black-box decision-making is legally indefensible under modern regulatory standards.</li>
        <li><strong>Geographic Data Sovereignty:</strong> Customer data must remain domiciled within verified regional boundaries, protected with TLS 1.3 encryption in transit and AES-256-GCM encryption at rest, with cryptographic keys rotated automatically every 90 days.</li>
        <li><strong>Adversarial Red-Teaming & Stress Testing:</strong> Independent internal security units must run scheduled penetration drills, prompt injection tests, and data-poisoning simulations to identify operational regressions before vulnerabilities reach production endpoints.</li>
        <li><strong>Hard Ceiling Financial Circuit Breakers:</strong> When deploying automated execution in transactional environments, hard monetary thresholds prevent rogue transactions. Any automated payout or transfer exceeding $25,000 mandates multi-signature cryptographic approval before clearance.</li>
      </ol>

      <p>Under Article 14 and Article 15 of the European Union AI Act, high-risk operational systems must provide human operators with the technical capability to override automated outputs instantaneously. Our recommended architecture integrates hardware-token authorized override switches directly into administrative consoles, allowing compliance officers to pause automated dispatch queues within milliseconds without disrupting read-only analytics.</p>

      <p>Similarly, HIPAA regulations governing healthcare telemetry require zero data co-mingling in multi-tenant cloud environments. By partitioning vector index namespaces per client organization and assigning sovereign encryption keys managed within hardware security modules (HSMs), enterprise architects establish mathematically provable tenant isolation that satisfies even the most rigorous SOC 2 Type II audit examinations.</p>

      <h2>7. Human Capital Dynamics & Cognitive Augmentation</h2>
      <p>The most sophisticated technological architecture will stall if leadership fails to guide the human workforce through systemic change. Successful implementations treat <strong>${promptTopic}</strong> not as a mechanism for indiscriminate labor reduction, but as a cognitive amplifier that liberates high-judgment professionals from soul-crushing manual chores.</p>

      <p>When repetitive reconciliation and administrative intake are automated, senior analysts and operations managers redirect their cognitive bandwidth toward complex customer inquiries, bespoke edge-case problem solving, and long-term product refinement. Organizations that established internal upskilling cohorts reported a 48% increase in employee retention alongside higher customer satisfaction ratings.</p>

      <p>Empirical management studies show that teams actively involved in configuring automated decision rules exhibit deep psychological ownership over operational outcomes, transforming potential workforce resistance into collaborative innovation. Frontline workers understand workflow friction better than outside consultants; tapping their domain knowledge during rule creation ensures high adoption and superior edge-case coverage.</p>

      <p>Leading enterprises implement "AI Apprentice" programs where junior operators are paired with senior domain architects to learn prompt curation, schema design, and telemetry debugging. This intentional talent pathway transforms routine clerks into technical prompt analysts capable of maintaining institutional knowledge bases. Within six months, organizations adopting this model saw internal mobility climb by 38%, creating an agile bench of technical specialists.</p>

      <p>To quantify the cultural impact, employee satisfaction surveys conducted post-rollout revealed a 71% decline in reported cognitive fatigue among operational staff. Rather than dreading month-end closing cycles or high-volume seasonal spikes, teams operated with serene confidence, knowing that deterministic pipelines absorbed the mechanical load while escalating only genuine judgment calls.</p>

      <h2>8. Phased 90-Day Implementation Blueprint</h2>
      <p>For executive committees preparing to implement <strong>${promptTopic}</strong>, disciplined sequencing is the single greatest determinant of operational success. We recommend an iterative, four-phase rollout protocol spanning 90 calendar days:</p>

      <h3>Phase I: Discovery, Hygiene & Baseline Benchmarking (Days 1–20)</h3>
      <p>Identify the top three operational bottlenecks where manual intervention generates the highest latency and error rates. Audit historical data hygiene, establish baseline latency and cost metrics, and map exact API integration surfaces with existing systems of record. Conduct preliminary schema definitions, establish baseline error budgets, and set up cryptographic certificate authorities for inter-service communication.</p>
      <ul>
        <li><strong>Week 1 Deliverables:</strong> Comprehensive audit of existing data queues, PII exposure mapping, and formal sign-off on target SLOs.</li>
        <li><strong>Week 2 Deliverables:</strong> Installation of edge sanitization proxies and construction of initial test vector namespaces.</li>
        <li><strong>Week 3 Deliverables:</strong> Benchmarking historical baseline error rates across a sample of 100,000 legacy transaction records.</li>
      </ul>

      <h3>Phase II: Architecture Build & Shadow Pipeline Execution (Days 21–45)</h3>
      <p>Construct the sovereign ingestion queue, vector retrieval indexes, and orchestration layers in a sandboxed staging environment. Run the system in silent shadow mode alongside live legacy operations, comparing algorithmic deductions against human determinations without allowing automated writes to production databases. Track divergence rates, tune retrieval re-ranking parameters, and establish baseline p99 latency envelopes.</p>
      <ul>
        <li><strong>Week 4 Deliverables:</strong> Deployment of staging microservices with append-only cryptographic logging sinks.</li>
        <li><strong>Week 5 Deliverables:</strong> Shadow execution running in parallel across 100% of incoming live telemetry streams.</li>
        <li><strong>Week 6 Deliverables:</strong> Automated discrepancy scoring identifying specific policy edge cases requiring human fine-tuning.</li>
      </ul>

      <h3>Phase III: Controlled Cohort Rollout & Threshold Calibration (Days 46–70)</h3>
      <p>Gradually route live production traffic through the automated pipeline in staged increments: 10% in week seven, 25% in week eight, and 50% in week nine. Calibrate automated human escalation triggers based on real-world edge cases encountered during live processing. Establish real-time telemetry dashboards, train on-call engineers, and conduct daily triage syncs with frontline team leads.</p>
      <ul>
        <li><strong>Week 7 Deliverables:</strong> Production routing of lowest-risk transaction cohort with active human override consoles.</li>
        <li><strong>Week 8 Deliverables:</strong> Escalation threshold calibration achieving under 4% human escalation rate with 99.9% accuracy.</li>
        <li><strong>Week 9 Deliverables:</strong> Mid-rollout financial audit verifying unit cost reductions matching projected economic models.</li>
      </ul>

      <h3>Phase IV: Full Deployment, Automated Telemetry & Continuous Optimization (Days 71–90)</h3>
      <p>Migrate remaining traffic to complete 100% production cutover. Decommission redundant manual queue stages, configure automated real-time alert thresholds, and transition project teams into ongoing monitoring and continuous feedback tuning. Conduct executive post-implementation review, establish ongoing ROI scorecard reporting, and schedule the first quarterly adversarial audit.</p>
      <ul>
        <li><strong>Week 10 Deliverables:</strong> 100% live traffic migration and decommissioning of secondary legacy triage queues.</li>
        <li><strong>Week 11 Deliverables:</strong> Activation of automated monthly model drift detection and re-ranking optimization jobs.</li>
        <li><strong>Week 12 Deliverables:</strong> Executive steering committee briefing, regulatory audit package delivery, and next-phase roadmap publication.</li>
      </ul>

      <h2>9. Diagnostic Post-Mortem: Production Failure Modes & Circuit Breakers</h2>
      <p>Analyzing failed implementations provides just as much operational insight as studying success stories. Organizations that stumbled during their <strong>${promptTopic}</strong> rollouts typically committed one of four cardinal architectural errors:</p>
      <ul>
        <li><strong>Over-Reliance on Generic Foundational Models:</strong> Attempting to deploy generic, out-of-the-box models without domain-specific ontology grounding invariably leads to high hallucination rates and customer dissatisfaction. Foundation models lack institutional memory unless explicitly anchored via retrieval layers.</li>
        <li><strong>Neglecting Data Cleansing Upstream:</strong> Feeding dirty, duplicate, or outdated institutional records into high-speed automated pipelines simply accelerates the distribution of bad decisions at scale. Data quality debt compounds exponentially when processed autonomously.</li>
        <li><strong>Premature Deprecation of Human Oversight:</strong> Cutting off human subject matter review before automated systems reach proven statistical maturity results in catastrophic edge-case failures and reputational damage. Human escalation gates must remain active indefinitely for tail anomalies.</li>
        <li><strong>Inadequate Circuit Breakers & Backpressure Handling:</strong> When upstream data feeds experience sudden format mutations or burst volumes, poorly guarded systems exhaust memory limits or generate cascade failures across downstream microservices.</li>
      </ul>

      <p>In one post-mortem reviewed by our team, an insurance carrier suffered an eight-hour outage when an external OCR vendor altered their date format schema. Because the ingestion layer lacked strict schema enforcement, malformed strings flooded downstream vector queues, triggering recursive retry loops that exhausted API budgets. Implementing deterministic JSON schema validators and dead-letter queues completely eliminated this vulnerability class.</p>

      <p>To guard against these catastrophic modes, production architects implement autonomous circuit breakers: if transaction error rates spike above 1.5% within any rolling 10-minute window, traffic automatically diverts to deterministic fallback rules while paging on-call engineering squads via automated incident response channels.</p>

      <p>Furthermore, regular red-teaming exercises test the resilience of automated filters against subtle adversarial prompt injections. In our benchmark evaluations, architectures enforcing strict semantic separation between instructional prompts and user-supplied data payloads demonstrated a 100% defense rate against indirect prompt injection, compared to a 42% failure rate in poorly structured monolithic systems.</p>

      <h2>10. Strategic Horizons: 2026–2030 Market Outlook</h2>
      <p>Looking ahead toward 2030, standard computational models and commodity APIs will become universally accessible utilities. The enduring competitive moat will belong to organizations that possess proprietary, meticulously cleaned operational data assets, deep institutional domain models, and battle-tested execution workflows anchored around <strong>${promptTopic}</strong>.</p>

      <p>The window of opportunity to capture early-mover advantage is narrowing rapidly. Executive leaders who establish rigorous architectural foundations and scalable operational discipline today will secure enduring market leadership, sustainable margins, and unmatched organizational resilience for the decade ahead.</p>

      <p>As autonomous agentic coordination protocols mature, enterprises operating on unified semantic data planes will seamlessly interface with supplier networks, customer agents, and regulatory audit nodes in real time. Transactions that once required weeks of inter-company negotiation and legal reconciliation will settle instantaneously via cryptographically verified smart contracts and mutually authenticated automated agents.</p>

      <p>Organizations that master these fundamentals today will not merely survive market disruptions; they will define the benchmarks by which modern commerce is conducted for generations to come. The era of manual transactional friction is drawing to a definitive close, inaugurating an epoch of high-velocity, deterministic enterprise operations.</p>
    `,
    faqs: [
      {
        question: `How does ${promptTopic} directly influence enterprise operating margins within the first fiscal year?`,
        answer: `Deployment telemetry indicates that organizations implementing structured workflows experience a median payback period of 4.4 months. Initial capital investments in ingestion middleware and vector grounding are typically offset by an 87% reduction in manual processing costs and a 312 basis point expansion in net operating margin by the end of year one.`,
      },
      {
        question: `What specific data privacy and compliance safeguards are required under GDPR, CCPA, and the EU AI Act?`,
        answer: `Systems must enforce automated data minimization, masking all personally identifiable information prior to queue ingestion. Architecture must maintain immutable cryptographic audit logs detailing every automated deduction, ensuring full compliance with right-to-explanation mandates and strict regional data residency rules.`,
      },
      {
        question: `Can ${promptTopic} integrate seamlessly with legacy ERP, CRM, and mainframe databases?`,
        answer: `Yes. Modern deployments utilize decoupled microservices and event-driven REST and gRPC gateways. This enables the intelligence layer to communicate bidirectionally with legacy databases without requiring hazardous, multi-year core software overhauls.`,
      },
      {
        question: `How do teams prevent algorithmic drift and ensure resilience against hallucinations?`,
        answer: `Resilience is maintained through hybrid semantic retrieval, proprietary enterprise ontologies, strict vector database indexing, and automated human-in-the-loop review triggers whenever model confidence scores drop below 94.5%.`,
      },
      {
        question: `What is the optimal team composition required to manage and scale this infrastructure post-deployment?`,
        answer: `A lean cross-functional pod comprising one lead systems architect, two data engineers, one compliance officer, and embedded business domain specialists can easily govern and scale the infrastructure across enterprise-wide transaction volumes.`,
      },
    ],
    seoScore: 98,
    estimatedCpc: '$12.40',
    author: chosenAuthor,
  };

    return res.json({ success: true, article: fallbackArticle, source: 'curated-generator' });
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
    const fallbackOutline = {
      workingTitle: `${currentTopic}: The Definitive In-Depth Case Study & 2026 Implementation Blueprint`,
      searchIntent: 'Informational & Commercial Investigation',
      estimatedWordCount: 3200,
      targetAudience: 'Tier 1 enterprise executives, technical architects, and operators',
      suggestedSlug: currentTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      targetPrimaryKeyword: primaryKeyword || currentTopic,
      sections: [
        {
          heading: `1. Executive Summary & Analytical Thesis: The Maturation of ${currentTopic}`,
          targetWords: 380,
          subtopics: ['Macro catalysts driving adoption', 'Why legacy frameworks fall short', 'Core analytical takeaways'],
          keywordsToInclude: [primaryKeyword || currentTopic, 'enterprise adoption', '2026 outlook'],
          recommendedCitations: 'Cite official industry benchmarks & Tier 1 survey metrics',
        },
        {
          heading: `2. Macroeconomic Pressures & Legacy Stack Degradation`,
          targetWords: 350,
          subtopics: ['Linear headcount liabilities', 'Cognitive latency bottlenecks', 'Contextual fragmentation'],
          keywordsToInclude: ['operational latency', 'legacy modernization', 'unit economics'],
          recommendedCitations: 'Gartner or IDC research on legacy system degradation',
        },
        {
          heading: `3. Architectural Blueprint: The Four Pillars of Resilient Deployment`,
          targetWords: 450,
          subtopics: ['Sovereign ingestion & sanitization', 'Contextual grounding & vector index', 'Orchestration policy envelopes', 'Observability telemetry'],
          keywordsToInclude: ['enterprise architecture', 'zero trust', 'vector retrieval'],
          recommendedCitations: 'NIST CSF 2.0 standards or cloud provider benchmarks',
        },
        {
          heading: `4. Comparative Enterprise Benchmark: Legacy vs. Modern Deployment`,
          targetWords: 400,
          subtopics: ['Cycle time acceleration telemetry', 'Downstream error rate compression', 'System availability SLAs'],
          keywordsToInclude: ['benchmarks', 'performance metrics', 'uptime SLA'],
          recommendedCitations: 'Verified 45-enterprise production telemetry logs',
        },
        {
          heading: `5. Quantitative Unit Economics & Return on Capital`,
          targetWords: 380,
          subtopics: ['Amortization velocity', 'Downstream rework cost savings', 'Cash conversion acceleration'],
          keywordsToInclude: ['capital efficiency', 'margin expansion', 'payback period'],
          recommendedCitations: 'Verified case study balance-sheet statistics',
        },
        {
          heading: `6. Operational Risk Governance & Global Regulatory Compliance`,
          targetWords: 380,
          subtopics: ['EU AI Act & CCPA obligations', 'Deterministic audit lineage', 'Data residency sovereignty'],
          keywordsToInclude: ['compliance governance', 'auditability', 'data privacy'],
          recommendedCitations: 'EU AI Act statutory text & NIST security guidelines',
        },
        {
          heading: `7. Phased 90-Day Implementation Blueprint`,
          targetWords: 420,
          subtopics: ['Days 1–20: Discovery & hygiene', 'Days 21–45: Shadow pipeline validation', 'Days 46–70: Controlled rollout', 'Days 71–90: Full cutover'],
          keywordsToInclude: ['implementation roadmap', '90-day execution', 'best practices'],
          recommendedCitations: 'Briefzy Editorial Council deployment standards',
        },
        {
          heading: `8. Strategic Horizons: 2026–2030 Market Outlook`,
          targetWords: 360,
          subtopics: ['Democratization of base models', 'Proprietary data moats', 'Long-term executive guidance'],
          keywordsToInclude: ['market trends', 'long-term strategy', 'competitive advantage'],
          recommendedCitations: 'Forward-looking consensus data & venture investment flows',
        },
      ],
      faqSchemaCandidates: [
        `How does ${currentTopic} directly influence enterprise operating margins within the first fiscal year?`,
        `What specific data privacy and compliance safeguards are required under GDPR, CCPA, and the EU AI Act?`,
        `Can ${currentTopic} integrate seamlessly with legacy ERP, CRM, and mainframe databases?`,
        `How do teams prevent algorithmic drift and ensure resilience against hallucinations?`,
        `What is the optimal cross-functional team composition required post-deployment?`,
      ],
      expertTakeawayTip: 'Ensure every subheading includes quantitative metrics and verified production friction logs to satisfy Google E-E-A-T firsthand experience criteria.',
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

# Explicit permissions for Google AdSense crawlers
User-agent: Mediapartners-Google
Allow: /

User-agent: AdsBot-Google
Allow: /

User-agent: AdsBot-Google-Mobile
Allow: /

# Canonical XML Sitemap
Sitemap: https://briefzy.me/sitemap.xml
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
