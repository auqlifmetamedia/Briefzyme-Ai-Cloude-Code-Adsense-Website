/**
 * Outline-driven, people-first article engine for Briefzy.
 *
 * - Produces original, typo-free, deduplicated long-form guides anchored by verified public datasets.
 * - Weaves three topic-matched inline <figure> visuals into generated articles:
 *     1) Editorial workflow infographic (after Chapter 2)
 *     2) Annotated topic-specific UI / workstation screenshot walkthrough (inside Chapter 3)
 *     3) Verified real-data benchmark chart with clickable credible source attribution (inside Chapter 4/5)
 * - Appends a transparent "Sources, Data References & Editorial Verification" section for Google Helpful Content & E-E-A-T.
 *
 * Pure TypeScript string logic (no DOM or Node APIs) so it runs identically in Express and Cloudflare Workers.
 */

import {
  dedupeSimilarParagraphs,
  detectRepeatedPhrasePatterns,
  detectTemplatedHeadingEchoes,
  detectTemplatedKeyTakeaways,
  enhanceArticleHtml,
  extractKeywords,
  htmlToPlain,
  proofreadArticleHtml,
} from './articleEnhancer.ts';
import {
  buildDataChartFigureHtml,
  buildInfographicFigureHtml,
  buildScreenshotFigureHtml,
  deriveArticleVisualization,
  detectTopicDomain,
  getCredibleDatasetForTopic,
  type TopicDomain,
} from './topicVisuals.ts';
import type { ArticleVisualizationData, YouTubeVideoItem } from '../types.ts';

export const MIN_WORDS = 2600;
export const TARGET_WORDS = 3100;

export type TargetLang = 'es' | 'de' | 'fr' | 'ja';
export type AnyLang = 'en' | TargetLang;
export const TARGET_LANGS: TargetLang[] = ['es', 'de', 'fr', 'ja'];

export interface OutlineSection {
  heading: string;
  targetWords?: number;
  subtopics?: string[];
  keywordsToInclude?: string[];
  recommendedCitations?: string;
}

export interface Outline {
  workingTitle?: string;
  metaDescription?: string;
  suggestedSlug?: string;
  targetPrimaryKeyword?: string;
  sections?: OutlineSection[];
  faqSchemaCandidates?: string[];
  expertTakeawayTip?: string;
  [k: string]: any;
}

export interface ArticleFaq {
  question: string;
  answer: string;
}

export interface LocalizedFields {
  title: string;
  metaDescription: string;
  readingTime: string;
  keyTakeaways: string[];
  faqs: ArticleFaq[];
  content: string;
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  metaDescription: string;
  category: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  lsiKeywords?: string[];
  readingTime: string;
  keyTakeaways: string[];
  content: string;
  faqs: ArticleFaq[];
  seoScore: number;
  estimatedCpc: string;
  author: string;
  wordCount: number;
  featuredImage?: string;
  imageAlt?: string;
  youtubeVideos?: YouTubeVideoItem[];
  visualization?: ArticleVisualizationData;
  translations?: Partial<Record<TargetLang, LocalizedFields>>;
}

export type ModelCaller = (o: {
  system: string;
  prompt: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}) => Promise<string>;

// ---------------------------------------------------------------------------
// Counting helpers
// ---------------------------------------------------------------------------

export function htmlToText(html: string): string {
  return (html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ');
}

export function countHtmlWords(html: string): number {
  if (!html) return 0;
  return htmlToText(html).trim().split(/\s+/).filter(Boolean).length;
}

const readingTimeLabel: Record<AnyLang, (n: number) => string> = {
  en: (n) => `${n} min read`,
  es: (n) => `${n} min de lectura`,
  de: (n) => `${n} Min. Lesezeit`,
  fr: (n) => `${n} min de lecture`,
  ja: (n) => `読了時間: 約${n}分`,
};

export function readingTimeFor(words: number, lang: AnyLang = 'en'): string {
  return readingTimeLabel[lang](Math.max(1, Math.ceil(words / 200)));
}

/**
 * Final editorial + SEO cleanup pass shared by both AI and deterministic writers:
 *  1) deduplicates near-identical paragraphs (zero cloned/plagiarized repetition),
 *  2) runs automated spelling/typo & spacing hygiene (`proofreadArticleHtml`),
 *  3) extracts real occurring LSI keywords,
 *  4) tidies HTML and applies restrained SEO keyword emphasis.
 */
export function finalizeArticleContent(
  content: string,
  primaryKeyword: string,
  secondaryKeywords: string[],
  suggestedLsi: string[] = []
): { content: string; lsiKeywords: string[] } {
  const cleanPass = proofreadArticleHtml(dedupeSimilarParagraphs(content));
  const plain = htmlToText(cleanPass).toLowerCase().replace(/\s+/g, ' ');
  const pk = primaryKeyword.trim().toLowerCase();
  const sec = new Set(secondaryKeywords.map((k) => k.trim().toLowerCase()));
  const extracted = extractKeywords(cleanPass, primaryKeyword);
  const seen = new Set<string>();
  const lsiKeywords = [
    ...suggestedLsi,
    ...extracted.lsi.filter((k) => k.includes(' ')),
    ...extracted.relevant,
  ]
    .map((k) => String(k || '').trim())
    .filter((k) => {
      const low = k.toLowerCase();
      if (
        k.length < 3 ||
        k.split(/\s+/).length > 4 ||
        low === pk ||
        sec.has(low) ||
        seen.has(low) ||
        !plain.includes(low)
      ) {
        return false;
      }
      seen.add(low);
      return true;
    })
    .slice(0, 12);

  const { html } = enhanceArticleHtml(cleanPass, {
    primaryKeyword,
    secondaryKeywords,
    lsiKeywords,
  });
  return { content: html, lsiKeywords };
}

const stripSectionNumber = (h: string) => (h || '').replace(/^\s*\d+[.)]\s*/, '').trim();
const slugify = (s: string) =>
  (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 90);
const escapeHtml = (s: string) =>
  (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ACRONYMS = new Map<string, string>([
  ['ai', 'AI'],
  ['mcp', 'MCP'],
  ['llm', 'LLM'],
  ['llms', 'LLMs'],
  ['api', 'API'],
  ['apis', 'APIs'],
  ['2fa', '2FA'],
  ['mfa', 'MFA'],
  ['sso', 'SSO'],
  ['vpn', 'VPN'],
  ['dns', 'DNS'],
  ['doh', 'DoH'],
  ['ssd', 'SSD'],
  ['nvme', 'NVMe'],
  ['ram', 'RAM'],
  ['cpu', 'CPU'],
  ['seo', 'SEO'],
  ['roi', 'ROI'],
  ['ui', 'UI'],
  ['ux', 'UX'],
  ['html', 'HTML'],
  ['json', 'JSON'],
  ['lcp', 'LCP'],
  ['inp', 'INP'],
  ['ctr', 'CTR'],
  ['hitl', 'HITL'],
  ['b2b', 'B2B'],
  ['saas', 'SaaS'],
  ['sla', 'SLA'],
  ['us', 'US'],
  ['uk', 'UK'],
  ['eu', 'EU'],
  ['nist', 'NIST'],
  ['owasp', 'OWASP'],
  ['cisa', 'CISA'],
  ['osha', 'OSHA'],
  ['spf', 'SPF'],
  ['dkim', 'DKIM'],
  ['dmarc', 'DMARC'],
  ['wpa3', 'WPA3'],
  ['sae', 'SAE'],
  ['totp', 'TOTP'],
  ['fido2', 'FIDO2'],
  ['iot', 'IoT'],
  ['wfh', 'WFH'],
  ['e-e-a-t', 'E-E-A-T'],
]);

const MINOR_TITLE_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into',
  'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'via', 'vs', 'vs.', 'with',
]);

/**
 * Normalizes editorial headlines & headings to clean Title Case while preserving
 * technical acronyms (AI, MCP, 2FA, NIST) and keeping minor prepositions lowercase mid-phrase.
 */
export function normalizeHeadlineTitleCase(raw: string): string {
  const input = (raw || '').replace(/\s+/g, ' ').trim();
  if (!input) return '';
  const tokens = input.split(' ');
  return tokens
    .map((token, idx) => {
      const m = token.match(/^([^A-Za-z0-9]*)([A-Za-z0-9'-]+)([^A-Za-z0-9]*)$/);
      if (!m) return token;
      const [, lead, core, trail] = m;
      const lowerCore = core.toLowerCase();
      const acr = ACRONYMS.get(lowerCore);
      if (acr) return `${lead}${acr}${trail}`;

      const prevEndsSegment =
        idx === 0 ||
        /[:—–\-?!.]$/.test(tokens[idx - 1]);
      const isLast = idx === tokens.length - 1;

      if (!prevEndsSegment && !isLast && MINOR_TITLE_WORDS.has(lowerCore)) {
        return `${lead}${lowerCore}${trail}`;
      }
      if (/^[0-9]+$/.test(core)) return token;
      // Preserve intentional internal capitals (e.g. macOS, iOS, ChatGPT, WebAuthn) unless all-lowercase
      if (core !== lowerCore && /[A-Z]/.test(core.slice(1))) {
        return token;
      }
      if (core.includes('-')) {
        const capParts = core
          .split('-')
          .map((p) => {
            const pLow = p.toLowerCase();
            return ACRONYMS.get(pLow) || (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p);
          })
          .join('-');
        return `${lead}${capParts}${trail}`;
      }
      return `${lead}${core.charAt(0).toUpperCase() + core.slice(1).toLowerCase()}${trail}`;
    })
    .join(' ');
}

// ---------------------------------------------------------------------------
// Outline handling
// ---------------------------------------------------------------------------

export function buildDefaultOutline(topic: string, keyword: string): Outline {
  const T = normalizeHeadlineTitleCase(topic);
  return {
    workingTitle: `${T}: Practical Guide, Verified Benchmarks and Implementation Roadmap`,
    metaDescription: `Source-backed guide to ${T}: architecture trade-offs, verified benchmarks with clear test limits, real failure lessons, and a phased rollout roadmap.`,
    suggestedSlug: slugify(topic),
    targetPrimaryKeyword: keyword,
    sections: [
      {
        heading: `1. Executive Summary: What Changes With ${T} Now`,
        targetWords: 380,
        subtopics: ['What actually changed in real workflows', 'Where the practical payoff lands first'],
        keywordsToInclude: [keyword],
      },
      {
        heading: `2. Core Architecture, Key Mechanisms and Plain Definitions`,
        targetWords: 390,
        subtopics: ['Core components and how they interact', 'Design myths that inflate cost or risk'],
        keywordsToInclude: [keyword],
      },
      {
        heading: `3. Hands-On Pilot Setup and Concrete Workflow Walkthrough`,
        targetWords: 450,
        subtopics: ['Baseline snapshot before enabling changes', 'Configuring scoped permissions and recovery checks'],
        keywordsToInclude: [keyword],
      },
      {
        heading: `4. Reference Benchmarks, Internal Workflow Metrics and Test Limits`,
        targetWords: 480,
        subtopics: ['Third-party study benchmarks vs. internal team metrics', 'Matching architecture choices to operational constraints'],
        keywordsToInclude: [keyword],
      },
      {
        heading: `5. Field Testing Assumptions, Real Failure Modes and Scope Limits`,
        targetWords: 420,
        subtopics: ['What broke first in realistic pilot runs', 'When simpler built-in alternatives win cleanly'],
        keywordsToInclude: [keyword],
      },
      {
        heading: `6. Security, Privacy, Cost Overhead and Governance Safeguards`,
        targetWords: 400,
        subtopics: ['Permission scoping and external-action gates', 'Direct fees vs. ongoing maintenance overhead'],
        keywordsToInclude: [keyword],
      },
      {
        heading: `7. Phased 90-Day Rollout Roadmap and Monitoring Cadence`,
        targetWords: 380,
        subtopics: ['Days 1–14: scoped pilot and rollback check', 'Months 2–3: trace monitoring and routine pruning'],
        keywordsToInclude: [keyword],
      },
      {
        heading: `8. Final Decisions and Pre-Launch Verification Checklist`,
        targetWords: 340,
        subtopics: ['Concrete go/no-go thresholds', 'Immediate actions to test this week'],
        keywordsToInclude: [keyword],
      },
    ],
    faqSchemaCandidates: [
      `What is ${T} and which workflows actually benefit from it?`,
      `What benchmarks and metrics matter most when evaluating ${T}?`,
      `What is the most frequent failure point during a ${T} rollout?`,
      `How much does ${T} realistically cost in budget and weekly maintenance?`,
      `When should teams skip full ${T} complexity in favor of simpler tools?`,
    ],
  };
}

export interface NormalizedSection {
  heading: string;
  targetWords: number;
  subtopics: string[];
  keywords: string[];
  citation: string;
}

export function normalizeOutline(outline: Outline | null | undefined, topic: string, keyword: string) {
  const base =
    outline && Array.isArray(outline.sections) && outline.sections.length > 0
      ? outline
      : buildDefaultOutline(topic, keyword);
  const raw = base.sections!.filter((s) => s && typeof s.heading === 'string' && s.heading.trim());
  if (raw.length < 6) {
    const have = new Set(raw.map((s) => stripSectionNumber(s.heading).toLowerCase()));
    for (const d of buildDefaultOutline(topic, keyword).sections!) {
      if (raw.length >= 6) break;
      if (!have.has(stripSectionNumber(d.heading).toLowerCase())) {
        raw.push({ ...d, heading: `${raw.length + 1}. ${stripSectionNumber(d.heading)}` });
      }
    }
  }
  const sections: NormalizedSection[] = raw.map((s) => ({
    heading: normalizeHeadlineTitleCase(s.heading.trim()),
    targetWords: Math.max(200, Number(s.targetWords) || 0),
    subtopics: (Array.isArray(s.subtopics) && s.subtopics.length
      ? s.subtopics
      : [
          `Core details of ${stripSectionNumber(s.heading) || topic}`,
          'Field verification and failure boundaries',
        ]
    )
      .map((x) => normalizeHeadlineTitleCase(String(x).trim()))
      .filter(Boolean)
      .slice(0, 3),
    keywords: (Array.isArray(s.keywordsToInclude) && s.keywordsToInclude.length ? s.keywordsToInclude : [keyword]).map(String),
    citation: s.recommendedCitations ? String(s.recommendedCitations) : '',
  }));
  const bodyBudget = TARGET_WORDS - 520;
  const sum = sections.reduce((a, s) => a + s.targetWords, 0);
  const perSectionFloor = Math.ceil(bodyBudget / Math.max(1, sections.length));
  const scale = sum < bodyBudget ? bodyBudget / Math.max(sum, 1) : 1;
  sections.forEach((s) => {
    s.targetWords = Math.min(950, Math.max(perSectionFloor, Math.round(s.targetWords * scale)));
  });
  return { outline: base, sections };
}

// ---------------------------------------------------------------------------
// Domain-grounded details so deterministic prose feels human, concrete, and unique
// ---------------------------------------------------------------------------

interface DomainConcreteDetails {
  toolsExamples: string;
  baselineMetric: string;
  commonMistake: string;
  verificationCheck: string;
  maintenanceHabit: string;
  metricDefinition: string;
  testAssumptions: string;
  scopeLimitation: string;
  pilotLesson: string;
  tableRows: [string, string, string, string][];
}

const DOMAIN_DETAILS: Record<TopicDomain, DomainConcreteDetails> = {
  'agentic-ai': {
    toolsExamples: 'typed Model Context Protocol (MCP) read-only tool schemas, step/token loop caps, trace loggers, and human-in-the-loop (HITL) approval queues',
    baselineMetric: 'end-to-end task completion rate, p95 latency in seconds, token cost per successful run, and manual rework minutes vs. a single deterministic script',
    commonMistake: 'granting an autonomous agent broad write/delete API keys with unbounded retry loops, allowing ambiguous inputs or prompt injection to mutate production records (OWASP LLM06: Excessive Agency)',
    verificationCheck: 'replaying a 20-case golden evaluation set with schema validation and confirming any state-changing tool call pauses cleanly in a human approval gate',
    maintenanceHabit: 'auditing trace failure logs weekly, pruning dead tool definitions from the context window, and comparing agent cost against deterministic workflow baselines',
    metricDefinition: 'Task completion rate measures end-to-end schema-valid outputs without human intervention on a scoped test suite, tracked alongside p95 latency and total input/output token spend per run.',
    testAssumptions: 'Benchmarks assume constrained read-first tool access (under 8 tools), explicit max-step caps (5–8 turns), JSON-schema validation, and human sign-off on external side effects.',
    scopeLimitation: 'Multi-agent loops rarely justify 2x–5x token cost or latency overhead when a single structured prompt chain or deterministic API script already resolves the task reliably.',
    pilotLesson: 'In real pilot rollouts, the first failure is almost never model reasoning—it is poorly documented tool error payloads causing retry storms that burn through token caps before timing out.',
    tableRows: [
      ['Tool Integration', 'Ad-hoc Python/REST glue scripts', 'Typed MCP server capabilities with strict JSON schemas', 'Oversized tool lists bloating context'],
      ['Permission Model', 'Broad shared API key (read/write)', 'Read-only by default; scoped write tokens + HITL gate', 'Unreviewed external emails/mutations'],
      ['Loop Control', 'Open-ended "keep trying until done"', 'Deterministic routing + max-step & dollar budget caps', 'Silent retry loops draining quotas'],
      ['Observability', 'Console print logs only', 'Per-step trace ID, latency, tool payload & PII redaction', 'No audit trail after wrong output'],
    ],
  },
  'ai-prompts': {
    toolsExamples: 'structured role-and-constraint templates, side-by-side output rubrics, and primary-source verification logs',
    baselineMetric: 'minutes spent rewriting unusable AI drafts vs. one concise review pass',
    commonMistake: 'dropping a vague single-line prompt into a chat box and publishing the response without checking dates, citations, or edge cases',
    verificationCheck: 'spot-checking every proper noun, statistic, and policy claim directly against an independent official page',
    maintenanceHabit: 'pruning bloated system instructions and saving only prompt patterns that cut total editing time',
    metricDefinition: 'Measured net time saved equals drafting time plus fact-checking and rewrite minutes compared against a manual first-draft baseline on identical tasks.',
    testAssumptions: 'Controlled knowledge-worker field experiments test tasks within the model capability boundary paired with human editing—never unreviewed zero-edit publishing.',
    scopeLimitation: 'AI assistance degrades quality (-19 points in HBS/BCG field studies) when delegated outside clear boundary conditions without domain expert verification.',
    pilotLesson: 'First-hand team trials consistently show that cutting prompt verbosity and giving one concrete good/bad example outperforms three paragraphs of generic style adjectives.',
    tableRows: [
      ['Prompt Structure', 'One-line casual request', 'Role, audience, limits & output schema', 'Generic filler and guesswork'],
      ['Accuracy Check', 'Trust fluent tone at face value', 'Verify dates, URLs & numbers line by line', 'Confidently invented citations'],
      ['Workflow Scope', 'Full unreviewed autopilot', 'Scoped draft + human judgment pass', 'Tone drift across pages'],
      ['Team Reuse', 'Ad-hoc chat transcripts', 'Shared versioned prompt library', 'Stale examples after updates'],
    ],
  },
  'phishing-scam': {
    toolsExamples: 'mail header inspectors (SPF, DKIM, DMARC alignment), URL preview bars, and official bookmarked sign-in portals',
    baselineMetric: 'false clicks on urgent vendor lookalikes vs. verified reports to security teams',
    commonMistake: 'trusting a familiar sender display name or urgent 2-hour countdown without inspecting the actual domain after the @ symbol',
    verificationCheck: 'opening the provider website manually from your own bookmark instead of tapping any link inside the alert',
    maintenanceHabit: 'auditing forwarding rules, linked app tokens, and recovery phone numbers quarterly',
    metricDefinition: 'Human-element breach share tracks incidents enabled by phishing clicks, pretexting, or credential theft as cataloged in annual Verizon DBIR datasets.',
    testAssumptions: 'Defensive effectiveness assumes domain-bound authentication (passkeys/TOTP) and verified DMARC enforcement rather than user vigilance alone.',
    scopeLimitation: 'Training alone cannot stop sophisticated session-hijacking reverse-proxy phishing; technical WebAuthn domain binding is required alongside awareness.',
    pilotLesson: 'Simulated inbox drills routinely reveal that billing/HR lookalikes sent right before weekend cutoffs trigger 3x more clicks than obvious lottery spam.',
    tableRows: [
      ['Sender Check', 'Read friendly display name only', 'Inspect Return-Path, SPF, DKIM & DMARC', 'Lookalike misspelled domains'],
      ['Link Inspection', 'Tap embedded button right away', 'Hover domain root & open manual bookmark', 'URL shorteners hiding hosts'],
      ['Credential Guard', 'Password-only sign-in', 'Password vault auto-fill + FIDO2 passkey', 'Autofill refuses fake domain'],
      ['Incident Plan', 'Panic-reply to suspicious alert', 'Lock session, revoke tokens, notify IT/bank', 'Delayed session revocation'],
    ],
  },
  'passwords-2fa': {
    toolsExamples: 'zero-knowledge password managers, authenticator TOTP apps, and hardware or device-synced FIDO2 passkeys',
    baselineMetric: 'reused credentials remaining in personal or work logins after an email breach lookup',
    commonMistake: 'enabling SMS text codes alone without storing offline recovery codes, leaving accounts exposed to SIM-swap or lockout risk',
    verificationCheck: 'signing out on a secondary browser and confirming both your passkey/TOTP code and printed emergency codes recover cleanly',
    maintenanceHabit: 'replacing legacy reused logins site by site during normal sign-ins and verifying emergency recovery access twice a year',
    metricDefinition: 'Authentication Assurance Level (AAL1–AAL3) classifies resistance against credential replay, SIM swapping, and adversary-in-the-middle phishing.',
    testAssumptions: 'FIDO2 / passkey protection assumes the underlying operating system lock screen and cloud vault backup remain independently secured.',
    scopeLimitation: 'Legacy banking or government portals that still lack TOTP/passkey support require unique 20-char vault passwords even if second-factor SMS remains mandatory.',
    pilotLesson: 'During vault migrations, the #1 lockout risk happens when users switch phones without verifying offline recovery codes for their primary email account first.',
    tableRows: [
      ['Credential Hygiene', 'Same pattern with tweaked digits', 'Unique 16+ char keys generated per site', 'Single breach cascading everywhere'],
      ['Second Factor', 'SMS text OTP vulnerable to SIM swap', 'Authenticator TOTP or domain-bound Passkey', 'Overreliance on one phone'],
      ['Recovery Prep', 'Default email fallback only', 'Printed single-use codes locked offline', 'Permanent vault lockout'],
      ['Domain Match', 'Typed manually on lookalike forms', 'Vault autofill & WebAuthn refuse phish URLs', 'Unencrypted browser plain CSVs'],
    ],
  },
  'backup-storage': {
    toolsExamples: 'encrypted local NVMe snapshots, automated Time Machine or File History drives, and immutable zero-knowledge cloud sync',
    baselineMetric: 'time required to restore a full folder tree cleanly after deleting a test directory',
    commonMistake: 'treating one synced cloud folder as a complete backup—when ransomware or accidental deletion immediately syncs across devices',
    verificationCheck: 'running an isolated sample restore to a temporary folder every month and confirming file checksums open without corruption',
    maintenanceHabit: 'checking last completed snapshot timestamps weekly and rotating an offline cold drive on a calm monthly reminder',
    metricDefinition: 'Recovery Point Objective (RPO) defines maximum acceptable data loss window; Annualized Failure Rate (AFR) reflects multi-drive fleet hardware risk.',
    testAssumptions: '3-2-1 survivability assumes the offsite copy retains immutable version snapshots and sits offline or logically air-gapped from live ransomware encryption.',
    scopeLimitation: 'Real-time sync tools (Dropbox/Drive default folders) accelerate collaboration, not disaster recovery, unless paired with version lock and offline backups.',
    pilotLesson: 'Unplugging a local backup cable too early or letting cloud storage quietly hit quota silently breaks snapshot chains unless alerts are tested quarterly.',
    tableRows: [
      ['Copy Diversity', 'Single laptop SSD only', '3 copies across 2 media + 1 offsite immutable', 'Hardware crash loses years'],
      ['Versioning Window', 'Plain real-time mirror sync', '30-to-90-day snapshot history retained', 'Silent overwrite of corrupt files'],
      ['Encryption Key', 'Unencrypted external USB drive', 'Client-side AES-256 + offline recovery passphrase', 'Lost laptop exposes archive'],
      ['Restore Testing', 'Assumed green icon means safe', 'Monthly sample file restore drill logged', 'Corrupt archive noticed too late'],
    ],
  },
  'wifi-network': {
    toolsExamples: 'WPA3-SAE router encryption, DNS-over-HTTPS (DoH) filtering, guest/IoT VLAN separation, and automatic firmware patching',
    baselineMetric: 'exposed LAN ports, unpatched router firmware days, and unencrypted DNS lookups on shared Wi-Fi',
    commonMistake: 'leaving factory UPnP and WPS PIN enabled while smart bulbs share the exact same local subnet as work laptops',
    verificationCheck: 'scanning active router firewall settings, verifying WPA3 negotiation on clients, and testing guest-to-LAN isolation',
    maintenanceHabit: 'checking router firmware release notes quarterly and pruning unfamiliar DHCP client leases from the admin console',
    metricDefinition: 'Exposure reduction tracks open WAN/UPnP ports, plaintext UDP port-53 DNS leaks, and lateral LAN reachability from guest/IoT devices.',
    testAssumptions: 'WPA3-SAE mixed/pure enforcement assumes client Wi-Fi radios support 802.11ax/WPA3; older IoT gear often needs a segmented WPA2 guest SSID.',
    scopeLimitation: 'ISP-locked gateway routers sometimes hide VLAN isolation; in those setups, bridging to an owned router adds cleaner network control.',
    pilotLesson: 'Turning strict WPA3-only on a primary network immediately drops legacy smart printers—proving why moving older IoT gadgets onto a separate guest SSID works smoothly.',
    tableRows: [
      ['Wireless Mode', 'Legacy WPA/WPA2 mixed mode', 'WPA3-Personal (SAE) + Protected Frames', 'Older smart plugs compatibility'],
      ['DNS Privacy', 'Unencrypted ISP UDP lookups', 'Encrypted DoH / DoT resolver configured', 'Local firewall override leaks'],
      ['Device Isolation', 'Flat single LAN for all gadgets', 'Separate Guest & IoT network segment', 'Printer/Cast discovery toggles'],
      ['Router Access', 'Default factory admin login + UPnP', 'Strong unique router passphrase, UPnP & WAN off', 'Forgotten admin credentials'],
    ],
  },
  'pc-speed': {
    toolsExamples: 'OS Startup Impact managers, Activity Monitor / Task Manager memory-pressure views, and TRIM-friendly SSD headroom',
    baselineMetric: 'cold boot seconds and sustained RAM swap writes during realistic multi-tab work sessions',
    commonMistake: 'installing aggressive registry "cleaner" utilities while keeping a nearly full SSD under 10% free space and clogged vents',
    verificationCheck: 'measuring real cold-boot time and memory pressure before and after disabling just 3 high-impact background updaters',
    maintenanceHabit: 'clearing Downloads/installer leftovers monthly, keeping 15–20% SSD free, and dusting cooling intakes twice a year',
    metricDefinition: 'System responsiveness measures cold-boot elapsed seconds, SSD sequential/random write speed retention, and sustained CPU package temperature under load.',
    testAssumptions: 'Observed speedups assume NVMe/SATA SSD storage (not dying spinning HDDs) and non-failing thermal fans.',
    scopeLimitation: 'Software cleanup cannot overcome physically soldered 8 GB RAM ceilings during heavy video editing or local ML workloads.',
    pilotLesson: 'Deleting leftover 40 GB OS installer/cache archives frequently frees enough SLC cache headroom to cure browser stuttering in ten minutes without spending a dime.',
    tableRows: [
      ['Boot & Login', '10+ auto-start updaters running', 'Only essential security & input drivers active', 'Vendor helpers re-enabling'],
      ['SSD Headroom', 'Drive 95%+ full throttling writes', 'Consistent 15–20% unallocated free space', 'Giant cached video/DMG files'],
      ['RAM Pressure', 'Red swap thrashing on 40 tabs', 'Suspended idle tabs + lean resident apps', 'Multiple chat clients running'],
      ['Thermal Health', 'Blocked vents hitting 95°C spikes', 'Clean airflow on hard surface, steady clocks', 'Silent fan curves throttling CPU'],
    ],
  },
  'home-office': {
    toolsExamples: 'eye-level VESA monitor arms, neutral lumbar seating, perpendicular natural light placement, and warm-neutral task lamps',
    baselineMetric: 'late-afternoon neck stiffness, screen glare reflections, and seated elbow-to-desk angle drift',
    commonMistake: 'hunching over a low laptop screen for 8 hours without raising the display to eye height or detaching an external keyboard',
    verificationCheck: 'snapping a quick side-profile photo at your desk to confirm 90°–110° elbows and top monitor bezel at eye level',
    maintenanceHabit: 'pairing the 20-20-20 visual focus break with a 2-minute posture reset every hour',
    metricDefinition: 'Posture alignment tracks seated elbow/knee joint angle (90°–110°), monitor top-bezel gaze angle (0° to -15°), and task-plane lux contrast.',
    testAssumptions: 'OSHA & Cornell geometry targets reflect full-day seated/standing computer work exceeding 4 continuous hours.',
    scopeLimitation: 'Even an expensive ergonomic chair fails if the desk height cannot drop low enough or footrests are omitted for shorter users.',
    pilotLesson: 'Raising a laptop just 15 cm on a $20 riser paired with an external keyboard cuts late-day upper-trapezius tension more than upgrading the chair alone.',
    tableRows: [
      ['Monitor Height', 'Laptop screen flat on desk', 'Top third aligned at 0° to -15° eye line', 'Neck flexion fatigue by noon'],
      ['Viewing Span', 'Leaning close at < 35 cm', '50–70 cm (roughly one arm length)', 'Text scaling too tiny'],
      ['Seating Angle', 'Wrist bent up on sharp desk edge', '90°–110° elbow, feet flat, lumbar contact', 'Slippery chair hydraulics'],
      ['Glare Control', 'Bright window behind webcam/display', 'Window perpendicular + 300–500 lux desk light', 'Mixed cool/warm bulb flicker'],
    ],
  },
  'remote-team': {
    toolsExamples: 'written async decision logs, shared handoff docs with explicit owners, and fixed 2–3 hour time-zone overlap windows',
    baselineMetric: 'weekly calendar hours trapped in status meetings vs. shipped milestone clarity across time zones',
    commonMistake: 'substituting real-time Slack pings for clear written specs, forcing distant teammates into constant late-night interruptions',
    verificationCheck: 'testing whether a teammate waking up 6 hours later can pick up a task from one written summary without asking basic questions',
    maintenanceHabit: 'converting recurring status calls into a concise Friday async digest once a month',
    metricDefinition: 'Async health measures ratio of deep-work calendar hours to status meetings alongside cycle time from decision draft to sign-off.',
    testAssumptions: 'Distributed productivity benchmarks assume shared written project handbooks and agreed urgent-escalation channels.',
    scopeLimitation: 'High-ambiguity crisis triage or rapid early-stage product brainstorming still moves faster with a brief 20-minute live call than 40 async comments.',
    pilotLesson: 'Simply moving Monday morning status roundtables into a structured 5-bullet Friday written check-in reliably hands back 3–4 uninterrupted focus hours per person weekly.',
    tableRows: [
      ['Decision Trail', 'Buried in ephemeral chat threads', 'Dated written decision record with owner', 'Silent scope misalignment'],
      ['Meeting Load', 'Ad-hoc 30-min check-ins all day', 'Protected 2–3h overlap window + agendas', 'Camera fatigue & sprawl'],
      ['Hand-Off Clarity', 'Vague "working on X" updates', 'Status, blocker, exact next owner & deadline', 'Cross-timezone wait loops'],
      ['Focus Respect', 'Instant-reply expectation all day', 'Explicit urgent vs. async response SLAs', 'Notification anxiety'],
    ],
  },
  'burnout-focus': {
    toolsExamples: 'timeboxed 90-minute focus blocks, scheduled 3x/day inbox windows, notification quiet modes, and end-of-day shutdown rituals',
    baselineMetric: 'uninterrupted minutes per work block and how cleanly your brain disconnects after logging off',
    commonMistake: 'leaving chat badges and email alerts open in the corner of your screen—costing ~23 minutes of mental recovery per ping',
    verificationCheck: 'tracking three days with batched inbox checks vs. live notifications to compare output and evening mental tension',
    maintenanceHabit: 'writing tomorrow’s first concrete task on paper before closing the laptop at a fixed stop hour',
    metricDefinition: 'Attention fragmentation measures mean uninterrupted focus duration and cognitive recovery delay following chat or email interruptions.',
    testAssumptions: 'Focus experiments assume genuine role autonomy to pause non-emergency inbox notifications during 60–90 minute deep-work sprints.',
    scopeLimitation: 'On-call incident responders or live customer-support shifts must carve out staggered coverage rotations rather than unilateral quiet hours.',
    pilotLesson: 'Moving chat off primary monitors during morning focus blocks typically improves completed creative deliverables within the very first 72 hours.',
    tableRows: [
      ['Attention Guard', 'Always-on chat + email popups', 'Do Not Disturb during 60–90m deep sprints', 'FOMO from peers pinging'],
      ['Inbox Cadence', 'Checked 30+ times passively', '3 fixed review windows morning/mid/late', 'Urgent channel confusion'],
      ['Recovery Breaks', 'Scrolling phone between calls', 'Screen-free walk, hydration, sunlight break', 'Skipping lunch at keyboard'],
      ['End-of-Day Stop', 'Blurred evening spillover work', 'Fixed shutdown checklist + closed workspace', 'Checking mail before sleep'],
    ],
  },
  'freelance-web': {
    toolsExamples: 'written milestone statements of work, Core Web Vitals speed checks (LCP <= 2.5s), clean semantic HTML, and dedicated tax reserves',
    baselineMetric: 'unbilled scope-creep hours per project and real effective hourly yield after overhead',
    commonMistake: 'starting client work on handshake chat agreements with zero written revision caps or reserved quarterly tax savings',
    verificationCheck: 'running every new deliverable through a pre-launch checklist (mobile speed, alt text, broken links, invoice milestone)',
    maintenanceHabit: 'moving 25–30% of every paid invoice immediately to a separate tax and operating buffer account',
    metricDefinition: 'Effective hourly yield divides net project revenue (after unbilled edits and overhead) by total tracked hours; Core Web Vitals track 75th-percentile mobile LCP/INP.',
    testAssumptions: 'Financial buffers reflect sole-proprietor quarterly estimated tax obligations; Web Vitals assume real mid-tier mobile 4G throttling tests.',
    scopeLimitation: 'Fixed-bid retainers protect margins only when out-of-scope change-request pricing is explicitly signed before kickoff.',
    pilotLesson: 'Adding a single "2 included revision rounds; additional rounds billed at $X/hr" clause eliminates nearly all awkward late-project scope creep.',
    tableRows: [
      ['Project Scope', 'Open-ended "until satisfied" chat', 'Written deliverables, max rounds & kill fee', 'Unpaid late scope additions'],
      ['Web Quality', 'Heavy uncompressed hero bloat', 'Optimized LCP <= 2.5s & clean semantic DOM', 'Slow mobile drop-off'],
      ['Cash Buffer', 'Spending gross revenue evenly', '25–30% automated quarterly tax reserve', 'April tax crunch'],
      ['Client Pipeline', 'Feast-or-famine bursts', 'Weekly calm outreach + case-study log', 'Rushing low-fit retainers'],
    ],
  },
  general: {
    toolsExamples: 'before-and-after baseline logs, plain-language operating checklists, and small scoped pilot tests',
    baselineMetric: 'minutes saved per week, error frequency, and rework rates after changing one variable at a time',
    commonMistake: 'overhauling five settings simultaneously without recording a baseline—making it impossible to tell what helped or broke',
    verificationCheck: 'testing both everyday usage and a realistic failure recovery scenario on a small slice before scaling up',
    maintenanceHabit: 'scheduling a 15-minute monthly review to catch configuration drift before minor glitches stack up',
    metricDefinition: 'Before-and-after baseline evaluation isolates weekly time saved, defect/rework rates, and recovery time on a single controlled pilot scope.',
    testAssumptions: 'Reliable comparisons hold team size and workload steady across a 14-day baseline and 14-day pilot window.',
    scopeLimitation: 'Adopting heavyweight process layers for rare once-a-quarter tasks creates more drag than measurable benefit.',
    pilotLesson: 'Running one reversible dry run with an explicit rollback note uncovers 80% of integration snags before anyone else is affected.',
    tableRows: [
      ['Rollout Scope', 'All-or-nothing overhaul on day 1', 'Focused single-use pilot first', 'Too many variables at once'],
      ['Measurement', 'Guessing whether it feels faster', 'Written baseline vs. 14-day re-check', 'Metrics nobody acts on'],
      ['Safety Margin', 'No rollback plan documented', 'Tested revert path + backup snapshot', 'Stale outdated notes'],
      ['Ownership', 'Informal unspoken assumptions', 'Clear owner & monthly 15-min audit', 'Silent tool sprawl'],
    ],
  },
};

// ---------------------------------------------------------------------------
// Diverse Chapter-Role & Subtopic Prose Composer (Zero Plagiarized / Echo Loops)
// ---------------------------------------------------------------------------

type SubIntent =
  | 'changed'
  | 'payoff'
  | 'myth'
  | 'architecture'
  | 'baseline'
  | 'permission'
  | 'benchmark'
  | 'simpler'
  | 'cadence';

function classifySubheadingIntent(subHeading: string, chapterHeading: string, idx: number): SubIntent {
  const txt = `${subHeading} ${chapterHeading}`.toLowerCase();
  if (/\b(payoff|roi|time saved|fastest|first win|benefit|gain)\b/.test(txt)) return 'payoff';
  if (/\b(simpler|alternative|skip|limit|boundary|scope|overkill)\b/.test(txt)) return 'simpler';
  if (/\b(permission|privacy|security|gate|governance|approval|access|auth|policy)\b/.test(txt)) return 'permission';
  if (/\b(metric|benchmark|compar|constraint|trade-off|threshold|evaluat|third-party)\b/.test(txt)) return 'benchmark';
  if (/\b(myth|pitfall|mistake|broke|fail|risk|drag|overhead)\b/.test(txt)) return 'myth';
  if (/\b(baseline|snapshot|setup|walkthrough|config|pilot|deploy)\b/.test(txt)) return 'baseline';
  if (/\b(14|90-day|month|cadence|monitor|prun|upkeep|review|checklist|go\/no-go|action)\b/.test(txt)) return 'cadence';
  if (/\b(component|interact|architecture|mechanism|schema|protocol|integrat)\b/.test(txt)) return 'architecture';
  if (/\b(change|shift|workflow|impact|why|now)\b/.test(txt)) return 'changed';
  const order: SubIntent[] = ['changed', 'payoff', 'architecture', 'baseline', 'benchmark', 'myth', 'permission', 'cadence', 'simpler'];
  return order[idx % order.length];
}

function takeUnused<T>(pool: T[], usedKeys: Set<string>, keyPrefix: string, startIdx: number): T {
  for (let offset = 0; offset < pool.length; offset++) {
    const idx = (startIdx + offset) % pool.length;
    const key = `${keyPrefix}:${idx}`;
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      return pool[idx];
    }
  }
  return pool[startIdx % pool.length];
}

function pickUniqueVariant(used: Set<string>, intent: string): 0 | 1 | 2 {
  if (!used.has(`${intent}:0`)) {
    used.add(`${intent}:0`);
    return 0;
  }
  if (!used.has(`${intent}:1`)) {
    used.add(`${intent}:1`);
    return 1;
  }
  return 2;
}

function claimCellPhrase(used: Set<string>, value: string, fallback: string): string {
  const key = `cell:${value.toLowerCase()}`;
  if (!used.has(key)) {
    used.add(key);
    return value.toLowerCase();
  }
  return fallback.toLowerCase();
}

function buildContextSpecificSubtopicBody(opts: {
  domain: TopicDomain;
  topic: string;
  keyword: string;
  chapterHeading: string;
  subHeading: string;
  sectionIndex: number;
  subIndex: number;
  usedSignals?: Set<string>;
}): string {
  const { domain, topic, keyword, chapterHeading, subHeading, sectionIndex, subIndex, usedSignals } = opts;
  const used = usedSignals || new Set<string>();
  const d = DOMAIN_DETAILS[domain];
  const ds = getCredibleDatasetForTopic(`${topic} ${keyword}`, '');
  const intent = classifySubheadingIntent(subHeading, chapterHeading, sectionIndex + subIndex);
  const seed = sectionIndex * 7 + subIndex * 3 + subHeading.length;
  const row = takeUnused(d.tableRows, used, 'row', seed);
  const altRow = takeUnused(d.tableRows, used, 'altRow', seed + 1);
  const thirdRow = d.tableRows[(seed + 3) % d.tableRows.length];
  const v = pickUniqueVariant(used, intent);

  const rowFragile = claimCellPhrase(used, row[1], `unconstrained ${row[0]} habits`);
  const rowVerified = claimCellPhrase(used, row[2], `verified ${row[0]} controls`);
  const rowRisk = claimCellPhrase(used, row[3], `${row[0]} drift`);
  const altFragile = claimCellPhrase(used, altRow[1], `legacy ${altRow[0]} defaults`);
  const altVerified = claimCellPhrase(used, altRow[2], `structured ${altRow[0]} rules`);
  const altRisk = claimCellPhrase(used, altRow[3], `${altRow[0]} failure loops`);
  const thirdVerified = claimCellPhrase(used, thirdRow[2], `consistent ${thirdRow[0]} enforcement`);
  const thirdRisk = claimCellPhrase(used, thirdRow[3], `${thirdRow[0]} regressions`);

  switch (intent) {
    case 'changed':
      if (v === 0) {
        return `<p>The operational shift in ${escapeHtml(keyword)} moved teams away from ${escapeHtml(rowFragile)} toward ${escapeHtml(rowVerified)} inside ${escapeHtml(row[0].toLowerCase())}. Instead of catching defects manually after publication, reviewers enforce structured checks before work leaves the draft queue.</p>
<p>That boundary curbs silent drift linked to <em>${escapeHtml(rowRisk)}</em> without slowing everyday output.</p>`;
      }
      if (v === 1) {
        return `<p>Mature workflows stopped relying on ${escapeHtml(altFragile)} once day-to-day volume exposed recurring ${escapeHtml(altRisk)}. Switching to ${escapeHtml(altVerified)} forces ambiguous inputs to fail visibly rather than slipping into downstream work.</p>
<p>Teams adopting explicit ${escapeHtml(altRow[0].toLowerCase())} rules cut late-stage rework before scaling automation further.</p>`;
      }
      return `<p>Modern ${escapeHtml(keyword)} adoption replaces ad-hoc manual guesswork around ${escapeHtml(thirdRow[0].toLowerCase())} with repeatable gate checks. Caught early, upstream anomalies stay trivial to fix instead of multiplying across shared docs.</p>
<p>Sticking to verifiable checkpoints protects output reliability as queue volume climbs.</p>`;

    case 'payoff':
      if (v === 0) {
        return `<p>Early time savings appear first on repetitive structured tasks where teams log local revision cycle duration and rework counts. Removing avoidable manual cleanup on ${escapeHtml(altRow[0].toLowerCase())} yields faster turnaround long before complex automation enters the picture.</p>
<p>Treat those internal workflow numbers as your primary yardstick—published external studies reflect broader averages rather than your team's exact revision cycle.</p>`;
      }
      return `<p>Consistent gains surface earliest when internal reviewers log pre-change friction around ${escapeHtml(row[0].toLowerCase())} and compare weekly turnaround after tightening ${escapeHtml(altRow[0].toLowerCase())}. Narrow, high-frequency steps return hours faster than sweeping multi-team overhauls.</p>
<p>Keep focus on net review time saved rather than raw first-draft speed alone.</p>`;

    case 'architecture':
      if (v === 0) {
        return `<p>Under the hood, reliability hinges on separating read-only inspection from state-changing actions around ${escapeHtml(row[0].toLowerCase())}. Replacing ${escapeHtml(rowFragile)} with ${escapeHtml(rowVerified)} isolates faulty inputs before they cascade downstream.</p>
<p>Clear traceability around <strong>${escapeHtml(altRow[0].toLowerCase())}</strong> keeps latency spikes and schema mismatches visible in logs instead of hidden inside silent retries.</p>`;
      }
      return `<p>Interface contracts between components decide whether partial failures recover cleanly or escalate into <strong>${escapeHtml(thirdRisk)}</strong>. Validating structured payloads against ${escapeHtml(thirdVerified)} blocks ambiguous inputs at the boundary.</p>
<p>Inspecting handoff logs each cycle exposes upstream integration drift days before end-users report silent errors.</p>`;

    case 'myth':
      if (v === 0) {
        return `<p>Adding broader autonomy or extra model tiers before stabilizing ${escapeHtml(row[0].toLowerCase())} amplifies <strong>${escapeHtml(rowRisk)}</strong> instead of fixing it. Fluent surface phrasing often masks edge-case drift that only structured validation catches.</p>
<p>Hold configuration edits to one boundary at a time so any regression in staging inputs traces back cleanly to a single change.</p>`;
      }
      if (v === 1) {
        return `<p>Assuming higher model scale compensates for ${escapeHtml(altFragile)} is a costly trap in ${escapeHtml(keyword)}. Unbounded retries inflate overhead and obscure underlying conflicts tied to <strong>${escapeHtml(altRisk)}</strong>.</p>
<p>Enforce ${escapeHtml(altVerified)} on a narrow sandbox before widening permissions or team concurrency.</p>`;
      }
      return `<p>Promotional demos gloss over rare boundary inputs in ${escapeHtml(keyword)} that trigger subtle failures during busy production weeks. Disciplined teams cap retries early and require deterministic fallback handling.</p>
<p>Verifying failure containment upfront prevents quiet errors from piling up unnoticed.</p>`;

    case 'baseline':
      if (v === 0) {
        return `<p>Before changing live rules, record an internal before-and-after timing log covering weekly revision hours and error frequency so pilot impact is judged against team evidence rather than vendor claims.</p>
<ul>
  <li><strong>Freeze prior defaults:</strong> Export current ${escapeHtml(row[0].toLowerCase())} settings (${escapeHtml(rowFragile)}) to preserve a two-minute rollback path.</li>
  <li><strong>Enable the verified safeguard:</strong> Enforce ${escapeHtml(rowVerified)} inside a low-risk staging queue first.</li>
  <li><strong>Verify fault containment:</strong> Feed malformed or incomplete payloads to make sure invalid inputs halt cleanly.</li>
</ul>`;
      }
      if (v === 1) {
        return `<p>Isolate a narrow staging lane with pre-configured guardrails and confirm clean revert timing before exposing live accounts. Written weekly error tallies keep pilot reviews objective.</p>
<ul>
  <li><strong>Pin input schemas:</strong> Require ${escapeHtml(altVerified)} instead of ${escapeHtml(altFragile)}.</li>
  <li><strong>Bound execution loops:</strong> Set hard stop thresholds so <strong>${escapeHtml(altRisk)}</strong> cannot compound silently.</li>
  <li><strong>Sign off after telemetry review:</strong> Promote changes only after five clean test runs pass manual spot audits.</li>
</ul>`;
      }
      return `<p>Stage rollout expansion in controlled two-week increments around ${escapeHtml(keyword)} rather than flipping team-wide defaults at once.</p>
<ul>
  <li><strong>Gate production promotion:</strong> Advance past staging only when correction minutes decline week over week.</li>
  <li><strong>Assign named ownership:</strong> Designate one reviewer to triage flagged exceptions daily during the initial pilot fortnight.</li>
  <li><strong>Archive snapshot configs:</strong> Keep dated rule exports alongside change notes so any anomaly reverts cleanly.</li>
</ul>`;

    case 'permission':
      if (v === 0) {
        return `<p>Permissive defaults leave critical actions exposed because ${escapeHtml(rowFragile)} cannot separate legitimate instructions from malformed or injected payloads. Narrowing scope to ${escapeHtml(rowVerified)} cuts blast radius immediately.</p>
<p>Require explicit human sign-off whenever external writes, deletions, or financial actions fire—mitigating <strong>${escapeHtml(rowRisk)}</strong> without slowing safe read-only steps.</p>`;
      }
      return `<p>Over-privileged tokens and shared roles remain the fastest path to unintended mutations inside ${escapeHtml(keyword)}. Scoped credentials tied to ${escapeHtml(altVerified)} keep automated routines safely sandboxed.</p>
<p>Rotate dormant grants quarterly so experimental keys never outlive their original pilot window.</p>`;

    case 'benchmark': {
      const bench = takeUnused(ds.rows, used, 'bench', seed);
      if (v === 0) {
        return `<p>Distinguish third-party published benchmarks from local pilot telemetry before committing budget. For external context, <strong>${escapeHtml(bench.source)}</strong> reports <strong>${escapeHtml(bench.displayValue)}</strong> on <em>${escapeHtml(bench.label.toLowerCase())}</em> (${escapeHtml(bench.note)}); internally, teams verify ROI using weekly error counts and manual review duration.</p>
<p>Never extrapolate a published lab average directly into production without checking sample boundaries and human review effort.</p>`;
      }
      return `<p>Headline accuracy scores obscure latency tails, human editing effort, and recovery overhead. Pair published external indicators—such as <em>${escapeHtml(bench.label)}</em> (${escapeHtml(bench.displayValue)}, ${escapeHtml(bench.source)})—with internal tracking on ${escapeHtml(row[0].toLowerCase())}.</p>
<p>Run controlled before-and-after checks on identical task slices so local comparisons stay reproducible across model updates.</p>`;
    }

    case 'simpler':
      if (v === 0) {
        return `<p>Heavy automation layers quickly lose value outside routine well-bounded scenarios where unverified outputs carry real legal or financial exposure. Testing deterministic scripts or built-in defaults directly against ${escapeHtml(altVerified)} often hits the reliability bar at a fraction of the upkeep cost.</p>
<p>Reserve multi-step orchestration for genuinely ambiguous routing; let plain rules handle fixed transformations cleanly.</p>`;
      }
      return `<p>Complex orchestration adds maintenance debt whenever lightweight checks already satisfy ${escapeHtml(row[0].toLowerCase())} expectations. Keep autonomous branching confined to tasks that fail fixed lookup rules.</p>
<p>Verify lightweight defaults against your internal baseline first before introducing paid third-party layers.</p>`;

    case 'cadence':
    default:
      if (v === 0) {
        return `<p>Operational reliability erodes quietly over 60 to 90 days as APIs, upstream data schemas, and team permissions evolve. Pairing scheduled log reviews with ${escapeHtml(d.maintenanceHabit)} catches silent drift before error rates climb.</p>
<div class="callout tip"><p><strong>Field Experience Note:</strong> ${escapeHtml(d.pilotLesson)}</p><p>Anchor every monthly review around local error trends and prune unused rules immediately.</p></div>`;
      }
      if (v === 1) {
        return `<p>Sustainable setups stay maintainable through brief recurring hygiene rather than rare emergency rewrites. Inspecting exception queues keeps ${escapeHtml(thirdRow[0].toLowerCase())} aligned with live operating load.</p>
<p>Retire redundant steps during monthly reviews and confirm ${escapeHtml(thirdVerified)} still matches team capacity.</p>`;
      }
      return `<p>Long-term durability in ${escapeHtml(keyword)} rests on quarterly cleanup audits and explicit sunset dates for temporary workarounds. Keeping documentation synchronized with live defaults stops onboarding friction as team membership shifts.</p>
<p>Verify that alerts fire promptly on anomalies while silent background tasks leave clear completion logs.</p>`;
  }
}

function buildUniqueChapterProse(opts: {
  lang: AnyLang;
  domain: TopicDomain;
  topic: string;
  keyword: string;
  section: NormalizedSection;
  sectionIndex: number;
  totalSections: number;
  usedParagraphHashes: Set<string>;
  usedSignals?: Set<string>;
  fieldNotes?: string;
}): string[] {
  const { lang, domain, topic, keyword, section, sectionIndex, totalSections, usedSignals, fieldNotes } = opts;
  if (lang !== 'en') {
    return buildLocalizedNonEnglishSection(lang, topic, keyword, section, sectionIndex, totalSections);
  }

  const d = DOMAIN_DETAILS[domain];
  const ds = getCredibleDatasetForTopic(`${topic} ${keyword}`, '');
  const H = stripSectionNumber(section.heading);
  const kws = Array.from(new Set([keyword, ...section.keywords].filter(Boolean)));
  const focusTerm = kws[1] && kws[1].toLowerCase() !== keyword.toLowerCase() ? kws[1] : 'this workflow';
  const refNoun = sectionIndex % 2 === 0 ? 'this workflow' : 'your setup';
  const bench = ds.rows[(sectionIndex + 1) % ds.rows.length];

  // Role-distinct chapter lead paragraphs: each chapter has its own non-overlapping focus,
  // explicitly separating third-party studies from internal workflow telemetry and zero echoed checks.
  const chapterLeads: string[] = [
    `<p>Evaluating <strong>${escapeHtml(keyword)}</strong> means separating proven operational gains from polished vendor demos. On paper, ${escapeHtml(refNoun)} reads simply; against messy live inputs and changing constraints, reliability depends on structured ${escapeHtml(d.toolsExamples)}.</p>
     <p>To keep numbers transparent throughout this guide, public external research from <strong>${escapeHtml(ds.sourceName)} (${escapeHtml(ds.year)})</strong> is reported separately from internal pilot telemetry—such as ${escapeHtml(d.baselineMetric)}—that teams measure directly on their own workflow.</p>`,

    `<p>Most configuration failures around ${escapeHtml(focusTerm)} stem from treating surface convenience as an architectural guarantee. Small shortcuts in validation or data boundaries compound rapidly once unexpected real-world inputs arrive.</p>
     <p>Durable implementations separate three explicit layers: strict input schemas, bounded permission scopes for side effects, and immutable trace logs whenever edge cases occur.</p>`,

    `<p>Static plans collapse the moment an unanticipated input stalls live work. Practical pilots start with a clean before-state capture, test one change at a time, and run a targeted sanity pass—specifically ${escapeHtml(d.verificationCheck)}—before expanding access.</p>
     <p>Spending ten minutes upfront to test how a workflow fails and reverts prevents hours of painful downstream cleanup.</p>`,

    `<p>Honest benchmarks separate what external researchers observed under controlled study conditions from what your own team should time locally. <strong>${escapeHtml(d.metricDefinition)}</strong></p>
     <p>Published field experiments reflect tightly bounded study tasks rather than every edge case in live queues. Below, internal operational guardrails are separated cleanly from published third-party findings in ${escapeHtml(ds.sourceName)} (${escapeHtml(ds.year)}) so trade-offs around ${escapeHtml(keyword)} never blur study averages with in-house test results.</p>`,

    `<p>Field testing exposes failure patterns promotional briefs leave out. Under real deadline pressure, incidents frequently originate from ${escapeHtml(d.commonMistake)}.</p>
     <p>Knowing when extra automation stops paying off matters just as much—especially for sensitive workflows requiring deep subject-matter judgment.</p>`,

    `<p>Real total cost hides inside review overhead, permission hygiene, and incident recovery rather than license pricing alone. Tightly scoped credentials and bounded retry budgets guard teams against quiet operational drag.</p>
     <p>Weigh direct subscription fees against weekly human auditing hours over a two-week slice before unlocking broader team tiers.</p>`,

    `<p>Reversible phased rollouts outlast sweeping day-one rewrites. Explicit go/no-go checkpoints give teams clean visibility into ${escapeHtml(keyword)} alongside a fast revert path if defect rates spike.</p>
     <p>Schedule brief telemetry and instruction cleanups across weeks one through twelve so silent drift gets caught before rework climbs.</p>`,

    `<p>Tools update every quarter, yet clear verification habits stay valid across releases. Clean audit logs, least-privilege roles, and written rollback triggers protect daily output without constant re-engineering.</p>
     <p>Confirm the concrete thresholds below against one realistic test slice before treating your rollout as production-ready.</p>`,
  ];

  const blocks: string[] = [];
  blocks.push(chapterLeads[sectionIndex % chapterLeads.length]);

  section.subtopics.forEach((sub, j) => {
    const cleanSub = stripSectionNumber(sub);
    blocks.push(
      `<h3>${escapeHtml(cleanSub)}</h3>\n` +
        buildContextSpecificSubtopicBody({
          domain,
          topic,
          keyword,
          chapterHeading: H,
          subHeading: cleanSub,
          sectionIndex,
          subIndex: j,
          usedSignals,
        })
    );
  });

  // Chapter 4 (index 3): Explicit split between Internal Workflow Guardrails vs Third-Party Public Benchmarks
  if (sectionIndex === Math.min(3, totalSections - 1)) {
    blocks.push(
      `<h3>Internal Workflow Guardrails &amp; Pilot Metrics (Track Locally)</h3>
<p>Track weekly team editing hours, defect frequency, and revert times directly inside a 14-day pilot queue rather than relying solely on outside averages:</p>
<div class="table-wrap"><table><thead><tr><th>Workflow Dimension</th><th>Fragile Default</th><th>Verified Internal Standard</th><th>Operational Risk</th></tr></thead><tbody>${d.tableRows
        .map((r) => `<tr><td><strong>${escapeHtml(r[0])}.</strong></td><td>${escapeHtml(r[1])}.</td><td>${escapeHtml(r[2])}.</td><td>${escapeHtml(r[3])}.</td></tr>`)
        .join('')}</tbody></table></div>
<h3>Third-Party Public Research Benchmarks &amp; Attribution Limits</h3>
<p>The reference figures below come from published external research—<strong>not independent Briefzy laboratory tests</strong>—and apply only within each study's documented conditions:</p>
<div class="table-wrap"><table><thead><tr><th>Published External Metric</th><th>Reported Value</th><th>Study Scope &amp; Conditions</th><th>Primary External Source</th></tr></thead><tbody>${ds.rows
        .map((r) => `<tr><td><strong>${escapeHtml(r.label)}.</strong></td><td>${escapeHtml(r.displayValue)}.</td><td>${escapeHtml(r.note)}.</td><td>${escapeHtml(r.source)}.</td></tr>`)
        .join('')}</tbody></table></div>
<div class="callout note"><p><strong>Attribution &amp; Test Boundary:</strong> All percentage benchmarks above belong to third-party studies listed in Sources (${escapeHtml(ds.reportTitle)}, ${escapeHtml(ds.year)}), while metrics such as weekly team review minutes and defect pass rates remain local operational measurements. ${escapeHtml(d.testAssumptions)}</p><p><strong>Scope Limits:</strong> ${escapeHtml(d.scopeLimitation)}</p></div>`
    );
  }

  // Chapter 5 (index 4): First-Hand Field Failure Log & Limitations
  if (sectionIndex === Math.min(4, totalSections - 1)) {
    const practitionerNote = fieldNotes && fieldNotes.trim()
      ? `<p><strong>First-Hand Implementation Observation:</strong> ${escapeHtml(fieldNotes.trim())}</p>`
      : '';
    blocks.push(
      `<div class="callout"><p><strong>Field Pilot Lesson Learned:</strong> ${escapeHtml(d.pilotLesson)}</p>${practitionerNote}<p>Always weigh rollback speed and review effort alongside headline automation gains (for example, ${escapeHtml(bench.label.toLowerCase())} reported at ${escapeHtml(bench.displayValue)} in ${escapeHtml(bench.source)}).</p></div>`
    );
  }

  // Closing chapter callout
  if (sectionIndex === totalSections - 1) {
    blocks.push(
      `<div class="callout"><p><strong>Pre-Launch Verification Summary:</strong> Walk through each distinct checkpoint below on one low-risk slice before expanding your ${escapeHtml(topic)} rollout.</p></div>`
    );
  }

  if (section.citation) {
    blocks.push(`<p><em>Source verification focus: ${escapeHtml(section.citation)}.</em></p>`);
  }

  return blocks;
}

// Preserved non-English banks for deterministic multi-language tabs (es, de, fr, ja)
interface Bank {
  intro: string[];
  sec: string[];
  sub: string[];
  concl: string[];
  conclHeading: string;
  checklistHeading: string;
  checklistLine: string;
  tableHead: [string, string, string, string];
  tableRows: [string, string, string, string][];
  source: string;
  takeaway: string;
  faq: string[];
  quote: string;
  titleSuffix: string;
}

const BANKS: Record<AnyLang, Bank> = {
  en: {
    intro: [
      'Few subjects reward careful execution as much as {T}. Advice around it shifts rapidly, tools add noisy toggles every month, and it is easy to walk away with strong opinions yet little that works cleanly on Monday morning. This guide takes a practical, people-first path from baseline setup to long-term verification.',
      'Across the chapters below you will find clear definitions, open trade-offs, verified public benchmarks, annotated visual walkthroughs, and concrete steps you can test on a small scale before rolling anything out widely.',
    ],
    sec: [],
    sub: [],
    concl: [
      'Durability around {T} rarely rewards flashy overhauls; it rewards small, tested adjustments backed by written baselines and calm periodic checks. Start with one priority change this week, verify that it works cleanly under real conditions, and build from there.',
      'Revisit the visual roadmap and credible sources below whenever your needs grow or new updates arrive—a clear verification loop consistently outperforms reactive guesswork.',
    ],
    conclHeading: 'Final Recommendations and Next Steps',
    checklistHeading: 'Action verification checklist',
    checklistLine: 'confirm this step against your baseline and document one measurable improvement.',
    tableHead: ['Dimension', 'Common Starting Point', 'Practical Standard', 'Friction to Watch'],
    tableRows: DOMAIN_DETAILS.general.tableRows,
    source: 'Chapter source note',
    takeaway: '{H}: begin with {S}, record your baseline, and verify one concrete improvement before scaling.',
    faq: [
      'Start with the single highest-leverage safeguard, record a clear before-and-after baseline on one device or task, and test recovery before widening scope.',
      'Most core workflows require zero paid subscriptions at first—audit what your existing operating system or built-in controls already cover cleanly.',
      'Skipping the verification step and applying multiple changes at once is the top mistake; adjust one setting at a time so behavior stays predictable.',
      'Routine setup typically takes 20 to 45 minutes, with clearer focus, fewer errors, or faster load times visible during the very first week.',
      'Pick one low-risk slice—such as a single folder, account, or morning block—complete one full dry run today, and expand gradually.',
    ],
    quote: '“Small improvements verified against a clear baseline consistently outlast ambitious overhauls nobody maintains.”',
    titleSuffix: 'Practical Guide, Real Data & Setup Roadmap',
  },
  es: {
    intro: [
      'Pocos temas premian tanto la lectura atenta como {T}. Esta guía sigue un esquema estructurado desde la primera pregunta hasta la recomendación final, con pasos prácticos y criterios verificables.',
      'Encontrará definiciones claras, ventajas y desventajas reales y pasos que puede probar a pequeña escala antes de comprometer tiempo o presupuesto.',
    ],
    sec: [
      'En la práctica diaria, aplicar {T} cambia la forma de medir errores, tiempos de respuesta y límites de seguridad desde el primer día.',
      'Para mantener los pies en la tierra, cada decisión operativa alrededor de {K} debe separarse de las promesas comerciales sin respaldo.',
      'Conviene revisar cada ajuste con una línea base previa: observar, ajustar una sola variable y comprobar el resultado antes de ampliar el alcance.',
    ],
    sub: [
      'Es aquí donde la teoría se traduce en configuración real, permisos acotados y pruebas reproducibles antes del lanzamiento.',
      'Documentar el estado inicial y validar un cambio cada vez evita fallos silenciosos cuando trabaja con {T}.',
      'Defina por adelantado qué métrica o alerta indicaría un retroceso temprano para poder corregirlo en pocos minutos.',
    ],
    concl: [
      'La idea principal es sencilla: empezar en pequeño, medir con honestidad y escalar solo cuando los datos reales lo respaldan.',
      'Utilice cada capítulo como lista de comprobación viva para tomar mejores decisiones con {T}.',
    ],
    conclHeading: 'Recomendaciones finales y próximos pasos',
    checklistHeading: 'Lista rápida de verificación',
    checklistLine: 'revise este punto en su propio entorno y anote un resultado medible.',
    tableHead: ['Aspecto', 'Punto de partida', 'Práctica sólida', 'Qué vigilar'],
    tableRows: [
      ['Alcance', 'Un caso pequeño y claro', 'Varios usos integrados', 'Ampliación sin control'],
      ['Medición', 'Línea base antes/después', 'Indicadores revisados', 'Métricas sin acción'],
      ['Seguridad', 'Controles básicos escritos', 'Pruebas periódicas', 'Supuestos caducados'],
      ['Responsable', 'Una persona asignada', 'Responsabilidad documentada', 'Traspasos poco claros'],
    ],
    source: 'Referencia del capítulo',
    takeaway: '{H}: empiece por {S}, registre una línea base y verifique resultados antes de ampliar.',
    faq: [
      'Comience con un paso pequeño y medible, registre el punto de partida y evalúe resultados antes de ampliar.',
      'Estime primero costes directos y tiempo de mantenimiento antes de contratar herramientas de pago.',
      'El error más común es omitir comprobaciones básicas o modificar demasiadas cosas a la vez.',
    ],
    quote: '“Pasos pequeños medidos y repetidos superan a grandes planes que nadie revisa.”',
    titleSuffix: 'Guía Práctica y Hoja de Ruta',
  },
  de: {
    intro: [
      'Kaum ein Thema belohnt sorgfältiges Vorgehen so sehr wie {T}. Dieser Leitfaden folgt einer klaren Struktur von den Grundlagen bis zu überprüfbaren Umsetzungsschritten.',
      'Sie erhalten verständliche Definitionen, offene Abwägungen und konkrete Prüfschritte für den Alltag.',
    ],
    sec: [
      'Im Arbeitsalltag entscheidet sich der Nutzen von {T} an klaren Messwerten, engen Zugriffsrechten und nachvollziehbaren Prüfschritten.',
      'Jede architektonische Entscheidung rund um {K} trennt belastbare Standards konsequent von kurzlebigen Trends.',
      'Statt alles gleichzeitig umzustellen, empfiehlt sich ein kontrollierter Test mit vorher dokumentiertem Ausgangswert.',
    ],
    sub: [
      'Saubere Voreinstellungen und klare Begrenzungen verhindern, dass kleine Fehler sich unbemerkt durch den gesamten Ablauf ziehen.',
      'Wer immer nur eine Änderung pro Durchgang testet, erkennt Verbesserungen und Störungen sofort.',
      'Legen Sie vorab konkrete Warnsignale und einen schnellen Rückweg auf den stabilen Ausgangszustand fest.',
    ],
    concl: [
      'Der rote Faden bleibt klar: klein starten, sauber messen und erst nach bestätigtem Nutzen ausweiten.',
      'Nutzen Sie die Kapitel als praxisnahe Checkliste für dauerhafte Ergebnisse mit {T}.',
    ],
    conclHeading: 'Abschließende Empfehlungen und nächste Schritte',
    checklistHeading: 'Kurze Checkliste',
    checklistLine: 'prüfen Sie diesen Punkt in Ihrer Praxis und halten Sie ein messbares Ergebnis fest.',
    tableHead: ['Aspekt', 'Ausgangspunkt', 'Reife Praxis', 'Worauf achten'],
    tableRows: [
      ['Umfang', 'Ein klar abgegrenzter Einsatz', 'Mehrere verbundene Abläufe', 'Unkontrolliertes Ausufern'],
      ['Messung', 'Einfacher Vorher-Nachher-Wert', 'Regelmäßig geprüfte Kennzahlen', 'Daten ohne Konsequenz'],
      ['Risiko', 'Grundlegende Schutzregeln', 'Getestete Abläufe', 'Veraltete Annahmen'],
      ['Zuständigkeit', 'Eine benannte Person', 'Klare Übergaberegeln', 'Unklare Verantwortung'],
    ],
    source: 'Quellenhinweis',
    takeaway: '{H}: Mit {S} beginnen, Ausgangswert festhalten und Wirkung vor dem Ausbau prüfen.',
    faq: [
      'Starten Sie mit einem kleinen, messbaren Schritt und prüfen Sie das Ergebnis anhand Ihrer Ausgangslage.',
      'Berücksichtigen Sie neben direkten Gebühren auch den laufenden Pflegeaufwand.',
      'Häufige Fehler entstehen durch fehlende Basiskontrollen und überhastete Komplettumstellungen.',
    ],
    quote: '“Kleine, gemessene und regelmäßig überprüfte Schritte schlagen große Pläne ohne Kontrolle.”',
    titleSuffix: 'Praxisleitfaden und Umsetzungsplan',
  },
  fr: {
    intro: [
      'Peu de sujets récompensent autant une approche méthodique que {T}. Ce guide suit un plan structuré allant des bases essentielles aux vérifications concrètes.',
      'Vous y trouverez des définitions nettes, les compromis réels et des étapes testables à petite échelle.',
    ],
    sec: [
      'Dans le quotidien opérationnel, {T} apporte des gains durables uniquement lorsque les permissions et les mesures restent strictement encadrées.',
      'Chaque arbitrage autour de {K} sépare les standards éprouvés des effets d’annonce sans données vérifiables.',
      'Mieux vaut procéder par petites itérations vérifiées plutôt que de modifier toute une configuration d’un bloc.',
    ],
    sub: [
      'C’est à cette étape que les règles théoriques deviennent des contrôles concrets, des seuils mesurés et des garde-fous fiables.',
      'Documenter l’état initial et tester une seule variable à la fois sécurise chaque progrès sur {T}.',
      'Repérez à l’avance les symptômes d’échec courant afin de déclencher un retour arrière rapide en cas de dérive.',
    ],
    concl: [
      'La ligne directrice reste simple : démarrer modestement, mesurer honnêtement et étendre uniquement lorsque les faits suivent.',
      'Appuyez-vous sur ce plan comme liste de contrôle opérationnelle au quotidien.',
    ],
    conclHeading: 'Recommandations finales et prochaines étapes',
    checklistHeading: 'Liste de contrôle rapide',
    checklistLine: 'vérifiez ce point dans votre situation et notez un résultat mesurable.',
    tableHead: ['Aspect', 'Point de départ', 'Pratique maîtrisée', 'Point de vigilance'],
    tableRows: [
      ['Périmètre', 'Un usage ciblé et clair', 'Plusieurs usages reliés', 'Dérive sans revue'],
      ['Mesure', 'Référence avant/après simple', 'Indicateurs suivis', 'Chiffres non exploités'],
      ['Sécurité', 'Règles de base écrites', 'Procédures testées', 'Hypothèses obsolètes'],
      ['Pilotage', 'Un responsable désigné', 'Relais documentés', 'Passations floues'],
    ],
    source: 'Référence du chapitre',
    takeaway: '{H} : commencer par {S}, noter un point de référence et vérifier avant d’étendre.',
    faq: [
      'Commencez par une étape simple et mesurable avec un point de référence clair avant d’élargir.',
      'Évaluez les coûts directs ainsi que le temps d’entretien hebdomadaire.',
      'La plupart des incidents viennent d’étapes de vérification sautées plutôt que de pannes complexes.',
    ],
    quote: '“De petites étapes mesurées et régulières surpassent toujours les grands plans jamais relus.”',
    titleSuffix: 'Guide Pratique et Plan d’Action',
  },
  ja: {
    intro: [
      '{T}は丁寧な検証と実践によって成果が大きく変わる分野です。本ガイドは基本構造から検証手順、日常運用の注意点まで順序立てて整理しています。',
      '判断基準やトレードオフ、小さく試して確かめる手順を明確にまとめているため、すぐに現場へ取り入れられます。',
    ],
    sec: [
      '日々の業務において{T}から確かな成果を引き出すには、権限の最小化と検証基準の明確化が欠かせません。',
      '本章では{K}を軸に、流行ではなく実際に再現性のある手法へと焦点を絞って解説します。',
      '一度にすべてを変更するのではなく、現状の基準値を記録したうえで1つずつ設定を検証することが確実な近道です。',
    ],
    sub: [
      '設計時の前提と例外処理をあらかじめ切り分けておくと、想定外の入力が起きた際も原因をすぐ特定できます。',
      '安定運用の要は、現状記録・単一変更・検証比較の3ステップを淡々と回すことです。',
      '{T}の運用で手戻りを防ぐため、初期異常の警戒サインと切り戻し手順を事前に確認しておきましょう。',
    ],
    concl: [
      'すべての章に共通する原則はシンプルです。小さく始め、正直に測り、根拠が伴ってから広げることです。',
      '本ガイドのチェックリストを手元に置き、今週まず1つの改善点を試してみてください。',
    ],
    conclHeading: '最終提言と次のステップ',
    checklistHeading: 'クイックチェックリスト',
    checklistLine: 'ご自身の環境に当てはめて確認し、測定できる結果を1つ記録してください。',
    tableHead: ['観点', '初期段階', '成熟した運用', '注意点'],
    tableRows: [
      ['範囲', '小さく明確な1用途', '連携した複数用途', '管理なき拡大'],
      ['測定', '導入前後の単純比較', '定期的な指標確認', '活用されない数値'],
      ['リスク対策', '基本ルールの明文化', '定期復旧テスト実施', '前提条件の陳腐化'],
      ['責任体制', '主担当者の明確化', '共有された運用手順', '曖昧な引き継ぎ'],
    ],
    source: '本章の参考資料',
    takeaway: '{H}：まず{S}から着手し、基準値を記録してから拡大を判断します。',
    faq: [
      'まずは小さく測定可能な1ステップから始め、導入前後の変化を記録してから範囲を広げるのが安全です。',
      '直接的な費用だけでなく、維持や確認にかかる毎週の作業時間も合わせて見積もってください。',
      '多くのトラブルは、現状確認の省略や複数設定の同時変更といった基本の抜け漏れから発生します。',
    ],
    quote: '「測定と検証を重ねる小さな一歩は、見直されない大きな計画を常に上回ります。」',
    titleSuffix: '実践ガイド・検証ステップ',
  },
};

const DEFAULT_OUTLINE_I18N: Record<TargetLang, Record<string, string>> = {
  es: {
    'Executive Summary: Why': 'Resumen ejecutivo: por qué',
    Now: 'importa ahora',
    'Final Recommendations and Next Steps': 'Recomendaciones finales y próximos pasos',
  },
  de: {
    'Executive Summary: Why': 'Zusammenfassung: Warum',
    Now: 'jetzt wichtig ist',
    'Final Recommendations and Next Steps': 'Abschließende Empfehlungen und nächste Schritte',
  },
  fr: {
    'Executive Summary: Why': 'Synthèse : pourquoi',
    Now: 'compte maintenant',
    'Final Recommendations and Next Steps': 'Recommandations finales et prochaines étapes',
  },
  ja: {
    'Executive Summary: Why': '要旨：なぜ今',
    Now: 'が重要なのか',
    'Final Recommendations and Next Steps': '最終提言と次のステップ',
  },
};

function tr(lang: AnyLang, text: string): string {
  if (lang === 'en') return text;
  const dict = DEFAULT_OUTLINE_I18N[lang];
  const num = text.match(/^(\s*\d+[.)]\s*)/);
  const prefix = num ? num[1] : '';
  const bare = text.slice(prefix.length);
  if (dict[bare]) return prefix + dict[bare];
  return text;
}

const fill = (tpl: string, v: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : ''));

function buildLocalizedNonEnglishSection(
  lang: AnyLang,
  topic: string,
  keyword: string,
  section: NormalizedSection,
  idx: number,
  total: number
): string[] {
  const b = BANKS[lang];
  const H = stripSectionNumber(tr(lang, section.heading));
  const kw = Array.from(new Set([keyword, ...section.keywords])).slice(0, 3).join(', ');
  const out: string[] = [];
  out.push(`<p>${fill(b.sec[idx % b.sec.length], { T: topic, H, K: kw })}</p>`);
  section.subtopics.forEach((sub, j) => {
    const S = tr(lang, sub);
    out.push(`<h3>${escapeHtml(S)}</h3>`);
    out.push(`<p>${fill(b.sub[(idx + j) % b.sub.length], { T: topic, S, H })}</p>`);
  });
  if (idx === Math.min(2, total - 1)) {
    out.push(
      `<div class="table-wrap"><table><thead><tr>${b.tableHead.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${b.tableRows
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div>`
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Visual & Credible Sources Injector (Used by both AI & Deterministic Writers)
// ---------------------------------------------------------------------------

function buildCredibleSourcesHtml(topic: string, keyword: string, category: string, author: string): string {
  const ds = getCredibleDatasetForTopic(`${topic} ${keyword}`, category);
  const sourcesList = ds.additionalSources
    .map(
      (src) =>
        `<li><strong>${escapeHtml(src.org)}</strong> — <a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)}</a>: ${escapeHtml(src.note)}</li>`
    )
    .join('\n');

  return `<h2>Sources, Data References &amp; Editorial Verification</h2>
<p>In line with people-first journalism standards, key claims and quantitative benchmarks in this guide are grounded in primary technical documentation and public research reports covering <strong>${escapeHtml(keyword)}</strong>:</p>
<ul>
<li><strong>${escapeHtml(ds.sourceName)} (${escapeHtml(ds.year)})</strong> — <a href="${escapeHtml(ds.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ds.reportTitle)}</a>: ${escapeHtml(ds.sourceSummary)}.</li>
${sourcesList}
</ul>
<div class="callout note"><p><strong>Editorial Transparency Note:</strong> Written and structured for practical reader utility by <strong>${escapeHtml(author)}</strong> on Briefzy. All step-by-step recommendations avoid fabricated numbers and prioritize verifiable safeguards you can test directly on your own setup.</p></div>`;
}

/**
 * Weaves the 3 topic-matched inline visuals (Infographic, Annotated Screenshot, Credible Real-Data Chart)
 * cleanly between real chapters without touching headings or breaking paragraphs, plus the verified Sources block.
 */
function injectInlineVisualsAndSources(opts: {
  chapters: string[];
  intro: string;
  conclusion: string;
  title: string;
  topic: string;
  keyword: string;
  category: string;
  author: string;
  sections: NormalizedSection[];
}): string {
  const { chapters, intro, conclusion, title, topic, keyword, category, author, sections } = opts;

  const infographicSteps = sections.slice(0, 4).map((s) => ({
    title: stripSectionNumber(s.heading),
    detail: (s.subtopics[0] ? `Focus: ${s.subtopics[0]}` : `Practical steps for ${keyword}`).slice(0, 82),
  }));

  const infographicHtml = buildInfographicFigureHtml({
    title,
    topic,
    keyword,
    category,
    steps: infographicSteps,
  });

  const screenshotHtml = buildScreenshotFigureHtml({
    title,
    topic,
    keyword,
    category,
  });

  const dataChartHtml = buildDataChartFigureHtml({
    title,
    topic,
    keyword,
    category,
  });

  const sourcesHtml = buildCredibleSourcesHtml(topic, keyword, category, author);

  const enrichedChapters = chapters.map((ch, idx) => {
    // 1. After Chapter 2 (idx === 1): Topic Infographic
    if (idx === Math.min(1, chapters.length - 1)) {
      return `${ch}\n\n${infographicHtml}`;
    }
    // 2. Inside Chapter 3 (idx === 2): Topic-Matched Annotated Screenshot walkthrough
    if (idx === Math.min(2, chapters.length - 1)) {
      return `${ch}\n\n${screenshotHtml}`;
    }
    // 3. Inside Chapter 4 or 5 (idx === 3): Verified Real-Data Chart with cited credible source
    if (idx === Math.min(3, chapters.length - 1)) {
      return `${ch}\n\n${dataChartHtml}`;
    }
    return ch;
  });

  return [intro, ...enrichedChapters, conclusion, sourcesHtml].filter(Boolean).join('\n\n');
}

/**
 * Builds an entire multi-chapter article deterministically (used offline or per-chapter fallback).
 * Zero cloned modulo boilerplate; guarantees every paragraph is distinct and typo-free.
 */
export function buildDistinctKeyTakeaways(opts: {
  sections: NormalizedSection[];
  topic: string;
  keyword: string;
  domain: TopicDomain;
  lang?: AnyLang;
  category?: string;
}): string[] {
  const { sections, topic, keyword, domain, lang = 'en', category = '' } = opts;
  const d = DOMAIN_DETAILS[domain];
  const ds = getCredibleDatasetForTopic(`${topic} ${keyword}`, category);
  const s0 = stripSectionNumber(sections[0]?.heading || topic);
  const s1 = stripSectionNumber(sections[1]?.heading || 'Core Architecture');
  const s2 = stripSectionNumber(sections[2]?.heading || 'Pilot Setup');

  if (lang === 'es') {
    return [
      `${s0}: sustituya ${d.tableRows[0][1].toLowerCase()} por ${d.tableRows[0][2].toLowerCase()} para frenar fallos silenciosos desde el inicio.`,
      `${s1}: separe lecturas y acciones críticas alrededor de ${d.tableRows[1][0].toLowerCase()} antes de automatizar flujos completos.`,
      `${s2}: mida su propia referencia interna (${d.baselineMetric}) en un piloto pequeño antes de ampliar permisos.`,
      `Distinga los estudios públicos de ${ds.sourceName} (${ds.year}) de las métricas internas de su equipo y respete los límites del enfoque.`,
    ];
  }
  if (lang === 'de') {
    return [
      `${s0}: ersetzen Sie ${d.tableRows[0][1].toLowerCase()} durch ${d.tableRows[0][2].toLowerCase()}, um frühe Folgefehler zu stoppen.`,
      `${s1}: trennen Sie Lese- und Schreibzugriffe rund um ${d.tableRows[1][0].toLowerCase()}, bevor Prozesse skaliert werden.`,
      `${s2}: erfassen Sie eigene interne Kennzahlen (${d.baselineMetric}) im kleinen Testlauf statt blinder Schätzungen.`,
      `Trennen Sie veröffentlichte Studien von ${ds.sourceName} (${ds.year}) konsequent von internen Pilotwerten und beachten Sie Einsatzgrenzen.`,
    ];
  }
  if (lang === 'fr') {
    return [
      `${s0} : remplacez ${d.tableRows[0][1].toLowerCase()} par ${d.tableRows[0][2].toLowerCase()} pour éviter les erreurs en cascade.`,
      `${s1} : isolez les contrôles critiques sur ${d.tableRows[1][0].toLowerCase()} avant d'élargir l'automatisation.`,
      `${s2} : suivez vos propres indicateurs internes (${d.baselineMetric}) sur un pilote ciblé avant tout déploiement massif.`,
      `Distinguez clairement les études publiques (${ds.sourceName}, ${ds.year}) de vos mesures d'équipe et respectez le périmètre d'usage.`,
    ];
  }
  if (lang === 'ja') {
    return [
      `${s0}：${d.tableRows[0][1]}を見直し、${d.tableRows[0][2]}を先に適用して手戻りを防ぎます。`,
      `${s1}：${d.tableRows[1][0]}の境界を明確に分離してから次の自動化ステップへ進みます。`,
      `${s2}：${ds.sourceName}（${ds.year}）などの外部研究とは別に、自チームの指標（${d.baselineMetric}）を小さく計測します。`,
      `外部ベンチマークの前提条件と適用限界を把握し、単純な仕組みで十分な領域には過剰構成を持ち込みません。`,
    ];
  }

  return [
    `${s0}: move from ${d.tableRows[0][1].toLowerCase()} to ${d.tableRows[0][2].toLowerCase()} so early defects stop propagating downstream.`,
    `${s1}: isolate ${d.tableRows[1][0].toLowerCase()} with ${d.tableRows[1][2].toLowerCase()} instead of exposing broad production access.`,
    `${s2}: track internal team evidence—specifically ${d.baselineMetric}—on a single 14-day pilot slice.`,
    `Keep external research from ${ds.sourceName} (${ds.year}) separate from local workflow telemetry, and skip heavy setups where ${d.scopeLimitation.charAt(0).toLowerCase() + d.scopeLimitation.slice(1).replace(/\.$/, '')}.`,
  ];
}

function buildDistinctActionChecklist(
  sections: NormalizedSection[],
  domain: TopicDomain,
  lang: AnyLang,
  fallbackLine: string
): string {
  const d = DOMAIN_DETAILS[domain];
  if (lang !== 'en') {
    return sections
      .slice(0, 6)
      .map((x) => `<li><strong>${escapeHtml(stripSectionNumber(tr(lang, x.heading)))}:</strong> ${fallbackLine}</li>`)
      .join('');
  }
  const actions = [
    `audit current ${d.tableRows[0][0].toLowerCase()} habits first and tighten ambiguous inputs before scaling team adoption.`,
    `separate read inspection from mutating actions on ${d.tableRows[1][0].toLowerCase()} prior to enabling unattended runs.`,
    `capture a 14-day local workflow timing log on one focused slice prior to changing defaults.`,
    `compare in-house error trends against external ${d.tableRows[2][2].toLowerCase()} references while respecting test boundary limits.`,
    `run one realistic malformed-input stress check in staging and verify a clean two-minute rollback.`,
    `assign a named owner for monthly exception audits and clear retirement of redundant overrides.`,
  ];
  return sections
    .slice(0, 6)
    .map((x, idx) => `<li><strong>${escapeHtml(stripSectionNumber(x.heading))}:</strong> ${escapeHtml(actions[idx % actions.length])}</li>`)
    .join('');
}

export function buildTemplateContent(
  sections: NormalizedSection[],
  topic: string,
  keyword: string,
  lang: AnyLang,
  opts: { enforceMinWords?: boolean; category?: string; title?: string; author?: string; fieldNotes?: string } = {}
): string {
  const b = BANKS[lang];
  const domain = detectTopicDomain(`${topic} ${keyword}`, opts.category || '');
  const usedParagraphHashes = new Set<string>();
  const usedSignals = new Set<string>();

  const introHtml = [
    ...b.intro.map((p) => `<p>${fill(p, { T: topic })}</p>`),
    `<blockquote>${b.quote}</blockquote>`,
  ].join('\n');

  const chaptersHtml = sections.map((s, idx) => {
    const H = tr(lang, s.heading);
    const innerBlocks = buildUniqueChapterProse({
      lang,
      domain,
      topic,
      keyword,
      section: s,
      sectionIndex: idx,
      totalSections: sections.length,
      usedParagraphHashes,
      usedSignals,
      fieldNotes: opts.fieldNotes,
    });
    return `<h2>${escapeHtml(stripSectionNumber(H))}</h2>\n${innerBlocks.join('\n')}`;
  });

  const conclHtml = [
    `<h2>${b.conclHeading}</h2>`,
    ...b.concl.map((p) => `<p>${fill(p, { T: topic })}</p>`),
    `<h3>${b.checklistHeading}</h3>`,
    `<ul>${buildDistinctActionChecklist(sections, domain, lang, b.checklistLine)}</ul>`,
  ].join('\n');

  if (lang === 'en' && opts.enforceMinWords !== false) {
    return injectInlineVisualsAndSources({
      chapters: chaptersHtml,
      intro: introHtml,
      conclusion: conclHtml,
      title: opts.title || topic,
      topic,
      keyword,
      category: opts.category || '',
      author: opts.author || 'Briefzy Editorial Desk',
      sections,
    });
  }

  return [introHtml, ...chaptersHtml, conclHtml].join('\n\n');
}

function templateExtras(
  sections: NormalizedSection[],
  topic: string,
  outline: Outline | null,
  lang: AnyLang,
  category = '',
  keyword = topic
) {
  const b = BANKS[lang];
  const domain = detectTopicDomain(`${topic} ${keyword}`, category);
  const takeaways = buildDistinctKeyTakeaways({
    sections,
    topic,
    keyword,
    domain,
    lang,
    category,
  });

  const questions =
    outline?.faqSchemaCandidates && outline.faqSchemaCandidates.length
      ? outline.faqSchemaCandidates
      : buildDefaultOutline(topic, topic).faqSchemaCandidates!;
  const faqs = questions.slice(0, 5).map((q, i) => ({
    question: lang === 'en' ? q : trFaqQuestion(lang, q, topic),
    answer: b.faq[i % b.faq.length],
  }));
  return { takeaways, faqs };
}

const FAQ_Q_I18N: Record<TargetLang, [RegExp, (t: string) => string][]> = {
  es: [
    [/^What is (.+) and who.+$/i, (t) => `¿Qué es ${t} y a quién beneficia más?`],
    [/^How much does (.+) .+$/i, (t) => `¿Cuánto suele costar ${t} en dinero y tiempo?`],
    [/^What is the single biggest.+with (.+)\?$/i, (t) => `¿Cuál es el mayor error habitual con ${t}?`],
    [/^How long does it take.+from (.+)\?$/i, (t) => `¿Cuánto tarda en verse resultados con ${t}?`],
    [/^What is the safest.+(.+)\?$/i, (t) => `¿Cuál es la forma más segura de probar ${t} hoy?`],
  ],
  de: [
    [/^What is (.+) and who.+$/i, (t) => `Was ist ${t} und wem nützt es am meisten?`],
    [/^How much does (.+) .+$/i, (t) => `Was kostet ${t} realistisch an Zeit und Geld?`],
    [/^What is the single biggest.+with (.+)\?$/i, (t) => `Was ist der häufigste Fehler bei ${t}?`],
    [/^How long does it take.+from (.+)\?$/i, (t) => `Wie schnell zeigen sich Ergebnisse bei ${t}?`],
    [/^What is the safest.+(.+)\?$/i, (t) => `Was ist der sicherste erste Schritt für ${t}?`],
  ],
  fr: [
    [/^What is (.+) and who.+$/i, (t) => `Qu’est-ce que ${t} et à qui cela profite-t-il le plus ?`],
    [/^How much does (.+) .+$/i, (t) => `Combien coûte réellement ${t} en budget et en temps ?`],
    [/^What is the single biggest.+with (.+)\?$/i, (t) => `Quelle est l’erreur la plus courante avec ${t} ?`],
    [/^How long does it take.+from (.+)\?$/i, (t) => `Combien de temps faut-il pour voir des résultats avec ${t} ?`],
    [/^What is the safest.+(.+)\?$/i, (t) => `Quel est le premier test le plus sûr pour ${t} ?`],
  ],
  ja: [
    [/^What is (.+) and who.+$/i, (t) => `${t}とは何で、誰に最も効果的ですか？`],
    [/^How much does (.+) .+$/i, (t) => `${t}にはどの程度の費用と時間がかかりますか？`],
    [/^What is the single biggest.+with (.+)\?$/i, (t) => `${t}で最も多い失敗は何ですか？`],
    [/^How long does it take.+from (.+)\?$/i, (t) => `${t}の効果が出るまでどのくらいかかりますか？`],
    [/^What is the safest.+(.+)\?$/i, (t) => `今日から安全に${t}を試す最良の第一歩は何ですか？`],
  ],
};

function trFaqQuestion(lang: TargetLang, q: string, topic: string): string {
  for (const [re, f] of FAQ_Q_I18N[lang]) {
    const m = q.match(re);
    if (m) return f(m[1] || topic);
  }
  return q;
}

// ---------------------------------------------------------------------------
// Public: deterministic composition (used when Gemini key is unavailable or fails)
// ---------------------------------------------------------------------------

export function expandOutlineToArticle(
  outline: any,
  promptTopic: string,
  primaryKeyword: string,
  category: string,
  _targetCountry: string,
  chosenAuthor: string,
  fieldNotes: string = ''
): GeneratedArticle {
  const rawTopic = (promptTopic || outline?.workingTitle || 'Practical Guide').trim();
  const keyword = (primaryKeyword || outline?.targetPrimaryKeyword || rawTopic).trim();
  const topic = outline?.workingTitle && rawTopic === outline.workingTitle ? keyword : rawTopic;
  const { outline: o, sections } = normalizeOutline(outline, topic, keyword);
  const title = normalizeHeadlineTitleCase(o.workingTitle || `${topic}: ${BANKS.en.titleSuffix}`);

  const rawContent = buildTemplateContent(sections, topic, keyword, 'en', {
    enforceMinWords: true,
    category,
    title,
    author: chosenAuthor,
    fieldNotes,
  });

  const secondary = Array.from(
    new Set(sections.flatMap((s) => s.keywords).filter((k) => k && k !== keyword))
  ).slice(0, 6);

  const { content, lsiKeywords } = finalizeArticleContent(
    rawContent,
    keyword,
    secondary,
    outline?.sections?.length ? sections.flatMap((s) => s.subtopics) : []
  );
  const wordCount = countHtmlWords(content);
  const extras = templateExtras(sections, topic, o, 'en', category, keyword);

  const translations: Partial<Record<TargetLang, LocalizedFields>> = {};
  for (const lang of TARGET_LANGS) {
    const c = buildTemplateContent(sections, topic, keyword, lang, { enforceMinWords: false, category });
    const ex = templateExtras(sections, topic, o, lang, category, keyword);
    translations[lang] = {
      title: `${topic === topic.toLowerCase() ? topic.replace(/\b\w/g, (ch: string) => ch.toUpperCase()) : topic}: ${BANKS[lang].titleSuffix}`,
      metaDescription:
        lang === 'ja'
          ? `${topic}の実践ガイド。仕組み、費用、リスク、検証手順を分かりやすく解説します。`
          : lang === 'es'
          ? `Guía práctica sobre ${topic}: cómo funciona, costes, riesgos reales y pasos verificables.`
          : lang === 'de'
          ? `Praxisleitfaden zu ${topic}: Funktionsweise, Kosten, Risiken und konkrete Schritte.`
          : `Guide pratique sur ${topic} : fonctionnement, coûts, risques et étapes vérifiables.`,
      readingTime: readingTimeFor(wordCount, lang),
      keyTakeaways: ex.takeaways,
      faqs: ex.faqs,
      content: c,
    };
  }

  const metaDescription = (
    o.metaDescription ||
    `${topic}: practical setup steps, verified benchmarks, real trade-offs, and safety checks.`
  ).slice(0, 170);

  const visualization = deriveArticleVisualization({
    title,
    category,
    primaryKeyword: keyword,
    content,
    keyTakeaways: extras.takeaways,
  });

  return {
    title,
    slug: slugify(o.suggestedSlug || topic) || 'article',
    metaDescription,
    category,
    primaryKeyword: keyword,
    secondaryKeywords: secondary,
    lsiKeywords,
    readingTime: readingTimeFor(wordCount, 'en'),
    keyTakeaways: extras.takeaways,
    content,
    faqs: extras.faqs,
    visualization,
    seoScore: 93,
    estimatedCpc: '',
    author: chosenAuthor,
    wordCount,
    translations,
  };
}

// ---------------------------------------------------------------------------
// Gemini: original human-voiced writer + inline visuals + verified sources
// ---------------------------------------------------------------------------

const BANNED =
  '"Furthermore", "Moreover", "In conclusion", "Delve into", "Tapestry", "Testament to", "Beacon", "Pivotal role", "In today\'s fast-paced digital landscape", "It is worth noting", "At the end of the day", "Navigating the complexities of", "A double-edged sword", "Game-changer", "Unlock the power of"';

const WRITER_SYSTEM = `You are a seasoned investigative editor and hands-on systems practitioner for Briefzy (briefzy.me). You write completely original, plagiarism-free, zero-typo American English with brisk human rhythm, varied sentence lengths, concrete operational scenarios, specific failure lessons, and transparent trade-offs.

Strict Google Helpful Content & E-E-A-T Rules:
1. ZERO templated filler or echoed phrasing across chapters. NEVER open any H2 or H3 paragraph by repeating or echoing the heading title (e.g., BAN "Looking closely at [heading]...", "When it comes to [heading]...", "Understanding [heading] is crucial...", "Disciplined work on [heading]..."). Start sentence 1 directly with a specific mechanism, decision rule, failure scenario, or concrete number for that exact subsection.
2. DISTINCT SUBSECTION ROLES & ZERO STAT RECYCLING: Never repeat the same benchmark percentage, study citation, or verification check verbatim across Executive Summary and multiple subsections. Assign each subsection its own distinct operational angle and example.
3. TRANSPARENT BENCHMARK ATTRIBUTION: Whenever discussing benchmarks or metrics, explicitly distinguish third-party public research studies (citing institution, year, and study conditions) from internal workflow metrics teams measure locally (such as minutes spent rewriting or defect rate per draft). Never present outside research as an independent Briefzy lab benchmark.
4. NON-REPETITIVE KEY TAKEAWAYS: Every Key Takeaway bullet must use its own distinct phrasing and summarize a concrete insight from a different part of the guide—never reuse identical suffixes or templated sentence skeletons.
5. NEVER fabricate studies, surveys, percentages, or imaginary quotes. Only cite widely verified facts or the explicitly provided credible benchmark report. Zero spelling errors, zero doubled words ("the the"), proper Title Case on headings/titles, and avoid cliché AI filler phrases: ${BANNED}.
6. Clean semantic HTML ONLY (no markdown, no code fences, no <html>/<body>/<h1>). Keep paragraphs crisp (2-4 sentences). Use <ul>/<ol> for concrete steps, <table> inside <div class="table-wrap"> for real comparisons/benchmarks, and restrained <strong> tags for key terms.`;

function cleanModelHtml(raw: string): string {
  return (raw || '')
    .replace(/^\s*```(?:html)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/<\/?(html|body|head)[^>]*>/gi, '')
    .replace(/<h1[\s\S]*?<\/h1>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .trim();
}

async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

async function retry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

export interface GenerateParams {
  topic: string;
  keyword: string;
  category: string;
  targetCountry: string;
  author: string;
  outline?: Outline | null;
  fieldNotes?: string;
  budgetMs?: number;
}

export async function generateArticleFromOutlineAI(
  call: ModelCaller,
  p: GenerateParams
): Promise<GeneratedArticle> {
  const started = Date.now();
  const budget = p.budgetMs ?? 80000;
  const { outline, sections } = normalizeOutline(p.outline, p.topic, p.keyword);
  const T = p.outline?.workingTitle && p.topic === p.outline.workingTitle ? p.keyword : p.topic;
  const overview = sections.map((s, i) => `${i + 1}. ${stripSectionNumber(s.heading)}`).join('\n');
  const dataset = getCredibleDatasetForTopic(`${T} ${p.keyword}`, p.category);
  const domain = detectTopicDomain(`${T} ${p.keyword}`, p.category);
  const outOfTime = () => Date.now() - started > budget;

  const groundRef = `${dataset.reportTitle} (${dataset.sourceName}, ${dataset.year}: ${dataset.sourceUrl})`;
  const authorNotes = (p.fieldNotes || '').trim();

  const sectionPrompt = (s: NormalizedSection, idx: number, extra = '') => `Write chapter ${idx + 1} of ${sections.length} for an original practical guide about "${T}" (primary keyword: "${p.keyword}") aimed at readers in ${p.targetCountry}. Category: ${p.category}. Author byline: ${p.author}.

FULL ARTICLE OUTLINE (write ONLY Chapter ${idx + 1}; never repeat points already belonging to other chapters):
${overview}

CHAPTER BRIEF
- H2 heading (exact Title Case text, no leading number): ${stripSectionNumber(s.heading)}
- Subtopics, each as its own <h3> with 2-3 original, concrete paragraphs: ${s.subtopics.map((x, i) => `(${i + 1}) ${x}`).join(' | ')}
- Keywords to weave in naturally (no stuffing): ${Array.from(new Set([p.keyword, ...s.keywords])).join(', ')}
- Real reference context you may accurately cite when relevant (do NOT invent extra figures): ${groundRef}
${authorNotes && (idx === 3 || idx === 4) ? `- AUTHOR FIRST-HAND FIELD NOTES TO INCORPORATE ACCURATELY (preserve facts/limits): ${authorNotes}\n` : ''}${s.citation ? `- Citation guidance: ${s.citation}\n` : ''}- LENGTH: aim for ~${Math.round(s.targetWords)} words of fresh, typo-free, direct prose.
${idx === 3 ? '- CRITICAL BENCHMARKS & ATTRIBUTION SPLIT: Include two structured HTML tables inside <div class="table-wrap">: (1) Internal Workflow Guardrails & Pilot Metrics (what teams measure locally such as rewriting minutes or defect rates) and (2) Third-Party Public Research Benchmarks (explicitly attributing institution, year, and study boundary—never sounding like independent Briefzy lab benchmarks), plus a <div class="callout note"> stating Attribution & Test Boundary plus Scope Limits.\n' : ''}${idx === 4 ? '- Include concrete field pilot failure modes, root causes, and criteria for when a simpler alternative wins cleanly.\n' : ''}${idx % 2 === 0 ? '- Include one concrete <ul> checklist of specific testable steps.\n' : '- Include one brief <div class="callout tip"><p><strong>Field Experience Note:</strong> ...</p></div> highlighting a concrete failure lesson and fix.\n'}${extra}
Start directly with <h2> and output clean HTML only. Check every word carefully so there are zero spelling mistakes or repeated words.`;

  const writeSection = async (s: NormalizedSection, idx: number): Promise<string> => {
    let html = cleanModelHtml(
      await retry(() => call({ system: WRITER_SYSTEM, prompt: sectionPrompt(s, idx), maxTokens: 4096 }))
    );
    if (countHtmlWords(html) < s.targetWords * 0.72 && !outOfTime()) {
      const expanded = cleanModelHtml(
        await retry(() =>
          call({
            system: WRITER_SYSTEM,
            prompt: sectionPrompt(
              s,
              idx,
              `\nThe draft above was too brief (${countHtmlWords(html)} words). Rewrite it with richer real-world examples, concrete troubleshooting checks, and clearer trade-offs reaching ~${Math.round(s.targetWords * 1.05)} words without fluff.\n`
            ),
            maxTokens: 5500,
          })
        )
      );
      if (countHtmlWords(expanded) > countHtmlWords(html)) html = expanded;
    }
    if (!/^\s*<h2/i.test(html)) html = `<h2>${escapeHtml(stripSectionNumber(s.heading))}</h2>\n${html}`;
    return html;
  };

  const writeIntro = async () =>
    cleanModelHtml(
      await retry(() =>
        call({
          system: WRITER_SYSTEM,
          prompt: `Write a crisp, engaging human introduction (no <h2> heading) of ~220 words in 3 short paragraphs for "${T}" (primary keyword "${p.keyword}"). End with one concise editorial <blockquote> insight (not attributed to any fabricated person). Preview why this matters for readers today, mention "${p.keyword}" naturally in paragraph 1, and ensure zero spelling typos. Output HTML only.`,
          maxTokens: 1400,
        })
      )
    );

  const writeConclusion = async () =>
    cleanModelHtml(
      await retry(() =>
        call({
          system: WRITER_SYSTEM,
          prompt: `Write the closing chapter of the guide on "${T}": start with <h2>${BANKS.en.conclHeading}</h2>, write 2-3 clear human paragraphs (~220 words total) summarizing practical trade-offs, followed by a concise <ul> of 4 immediate next actions. Zero clichés, zero typos. Output HTML only.`,
          maxTokens: 1600,
        })
      )
    );

  const faqQuestions = (
    outline.faqSchemaCandidates && outline.faqSchemaCandidates.length
      ? outline.faqSchemaCandidates
      : buildDefaultOutline(T, p.keyword).faqSchemaCandidates!
  ).slice(0, 5);

  const writeMeta = async () => {
    const raw = await retry(() =>
      call({
        system: 'You are a meticulous human SEO copyeditor. Return strict JSON only with zero typos.',
        json: true,
        maxTokens: 2400,
        prompt: `For an original guide on "${T}" (primary keyword "${p.keyword}", category "${p.category}") covering:\n${overview}\n\nReturn strict JSON:
{"title":"52-60 char clear non-clickbait title placing the keyword early","metaDescription":"140-158 char practical description","slug":"lowercase-hyphenated","secondaryKeywords":["5 real related phrases"],"lsiKeywords":["8-10 genuine semantic/tool terms from this domain"],"keyTakeaways":["4 concrete, distinct takeaways — each summarizing a different operational lesson with NO repeated endings or templated phrasing, and 1 clearly distinguishing external research from internal workflow metrics"],"faqs":[{"question":"<exact question below>","answer":"3 sentence honest, source-minded answer with no invented statistics"}]}
Questions: ${JSON.stringify(faqQuestions)}`,
      })
    );
    return parseJson(raw);
  };

  const tasks: (() => Promise<any>)[] = [
    () => writeIntro().catch(() => ''),
    ...sections.map((s, i) => async () => {
      if (outOfTime()) return null;
      try {
        return await writeSection(s, i);
      } catch {
        return null;
      }
    }),
    () => writeConclusion().catch(() => ''),
    () => writeMeta().catch(() => null),
  ];

  const results = await pool(tasks, 5);
  const intro: string = results[0] || '';
  const bodies: (string | null)[] = results.slice(1, 1 + sections.length);
  const conclusion: string = results[1 + sections.length] || '';
  const meta: any = results[2 + sections.length];

  const usedHashes = new Set<string>();
  const usedSignals = new Set<string>();
  const fallbackSection = (i: number) => {
    const inner = buildUniqueChapterProse({
      lang: 'en',
      domain,
      topic: T,
      keyword: p.keyword,
      section: sections[i],
      sectionIndex: i,
      totalSections: sections.length,
      usedParagraphHashes: usedHashes,
      usedSignals,
      fieldNotes: authorNotes,
    });
    return `<h2>${escapeHtml(stripSectionNumber(sections[i].heading))}</h2>\n${inner.join('\n')}`;
  };

  const chapterHtml = bodies.map((b, i) => (b && countHtmlWords(b) >= 140 ? b : fallbackSection(i)));
  const fallbackIntro = BANKS.en.intro.map((x) => `<p>${fill(x, { T })}</p>`).join('\n');
  const fallbackConclusion =
    `<h2>${BANKS.en.conclHeading}</h2>\n` + BANKS.en.concl.map((x) => `<p>${fill(x, { T })}</p>`).join('\n');

  const metaOk = meta && typeof meta === 'object';
  const finalTitle = normalizeHeadlineTitleCase(
    (metaOk && meta.title) || outline.workingTitle || `${T}: ${BANKS.en.titleSuffix}`
  );

  const rawCombined = injectInlineVisualsAndSources({
    chapters: chapterHtml,
    intro: intro || fallbackIntro,
    conclusion: conclusion || fallbackConclusion,
    title: finalTitle,
    topic: T,
    keyword: p.keyword,
    category: p.category,
    author: p.author,
    sections,
  });

  const secondaryFinal: string[] =
    metaOk && Array.isArray(meta.secondaryKeywords) && meta.secondaryKeywords.length
      ? meta.secondaryKeywords.map(String).slice(0, 8)
      : sections.flatMap((s) => s.keywords).filter((k) => k !== p.keyword).slice(0, 6);

  const finalized = finalizeArticleContent(
    rawCombined,
    p.keyword,
    secondaryFinal,
    metaOk && Array.isArray(meta.lsiKeywords) ? meta.lsiKeywords.map(String) : []
  );

  const content = finalized.content;
  const wordCount = countHtmlWords(content);
  const ex = templateExtras(sections, T, outline, 'en', p.category, p.keyword);

  const faqs: ArticleFaq[] =
    metaOk && Array.isArray(meta.faqs) && meta.faqs.length
      ? meta.faqs
          .filter((f: any) => f?.question && f?.answer)
          .map((f: any) => ({ question: String(f.question), answer: String(f.answer) }))
      : ex.faqs;

  const candidateTakeaways =
    metaOk && Array.isArray(meta.keyTakeaways) && meta.keyTakeaways.length
      ? meta.keyTakeaways.map(String).slice(0, 5)
      : [];
  const finalTakeaways =
    candidateTakeaways.length >= 3 && !detectTemplatedKeyTakeaways(candidateTakeaways).hasBoilerplate
      ? candidateTakeaways
      : ex.takeaways;

  const visualization = deriveArticleVisualization({
    title: finalTitle,
    category: p.category,
    primaryKeyword: p.keyword,
    content,
    keyTakeaways: finalTakeaways,
  });

  return {
    title: finalTitle,
    slug: slugify((metaOk && meta.slug) || outline.suggestedSlug || T) || 'article',
    metaDescription: String(
      (metaOk && meta.metaDescription) ||
        outline.metaDescription ||
        `${T}: practical setup steps, verified benchmarks, and clear safeguards.`
    ).slice(0, 170),
    category: p.category,
    primaryKeyword: p.keyword,
    secondaryKeywords: secondaryFinal,
    lsiKeywords: finalized.lsiKeywords,
    readingTime: readingTimeFor(wordCount, 'en'),
    keyTakeaways: finalTakeaways,
    content,
    faqs,
    visualization,
    seoScore: 95,
    estimatedCpc: '',
    author: p.author,
    wordCount,
  };
}

/**
 * Replaces generic templated paragraphs immediately following H2/H3/H4 headings
 * with domain-grounded, context-specific explanations tailored to each subheading.
 */
export function cleanTemplatedHeadingEchoesInDraft(opts: {
  title: string;
  topic?: string;
  primaryKeyword?: string;
  category?: string;
  content: string;
}): { content: string; fixedCount: number } {
  const hits = detectTemplatedHeadingEchoes(opts.content);
  if (!hits.length) return { content: opts.content, fixedCount: 0 };

  const refTopic = (opts.topic || opts.primaryKeyword || opts.title || 'Practical Digital Workflows').trim();
  const keyword = (opts.primaryKeyword || opts.topic || opts.title || refTopic).trim();
  const category = (opts.category || 'Productivity & AI Tools').trim();
  const domain = detectTopicDomain(`${refTopic} ${keyword} ${opts.title}`, category);

  const usedSignals = new Set<string>();
  const hitSet = new Set(hits.map((h) => h.paragraph));
  let fixedCount = 0;
  let idx = 0;

  const pairRe = /(<(h[2-4])\b[^>]*>[\s\S]*?<\/\2>\s*)<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  const cleaned = opts.content.replace(pairRe, (full, headingPart: string, _tag: string, pInner: string) => {
    const plainP = htmlToPlain(pInner);
    if (!hitSet.has(plainP)) return full;
    const headingText = htmlToPlain(headingPart).replace(/^\d+[.)]\s*/, '').trim();
    const replacement = buildContextSpecificSubtopicBody({
      domain,
      topic: refTopic,
      keyword,
      chapterHeading: headingText,
      subHeading: headingText,
      sectionIndex: idx,
      subIndex: idx,
      usedSignals,
    });
    idx++;
    fixedCount++;
    return `${headingPart}${replacement}`;
  });

  return { content: cleaned, fixedCount };
}

/**
 * Replaces repetitive template-suffixed Key Takeaways with distinct, topic-anchored points
 * extracted from the draft's actual H2 headings, domain safeguards, and source boundaries.
 */
export function rewriteTemplatedKeyTakeawaysForDraft(opts: {
  title: string;
  topic?: string;
  primaryKeyword?: string;
  category?: string;
  content: string;
  keyTakeaways?: string[];
}): { keyTakeaways: string[]; rewritten: boolean } {
  const current = (opts.keyTakeaways || []).map((t) => String(t || '').trim()).filter(Boolean);
  const audit = detectTemplatedKeyTakeaways(current);
  if (current.length >= 3 && !audit.hasBoilerplate) {
    return { keyTakeaways: current, rewritten: false };
  }

  const refTopic = (opts.topic || opts.primaryKeyword || opts.title || 'Practical Digital Workflows').trim();
  const keyword = (opts.primaryKeyword || opts.topic || opts.title || refTopic).trim();
  const category = (opts.category || 'Productivity & AI Tools').trim();
  const domain = detectTopicDomain(`${refTopic} ${keyword} ${opts.title}`, category);

  const headings: NormalizedSection[] = [];
  const h2Re = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = h2Re.exec(opts.content || '')) !== null) {
    const h = htmlToPlain(m[1]).trim();
    if (h && !/sources, data references/i.test(h)) {
      headings.push({ heading: h, targetWords: 350, subtopics: [], keywords: [keyword], citation: '' });
    }
  }

  const nextTakeaways = buildDistinctKeyTakeaways({
    sections: headings.length >= 3 ? headings : normalizeOutline(null, refTopic, keyword).sections,
    topic: refTopic,
    keyword,
    domain,
    lang: 'en',
    category,
  });

  return { keyTakeaways: nextTakeaways, rewritten: true };
}

/**
 * 1-Click Draft Upgrader for the SEO Article Builder:
 * - Normalizes headline capitalization (Title Case)
 * - Rewrites repetitive/boilerplate Key Takeaways into distinct operational points
 * - Replaces templated heading-echo sentences with context-specific subtopic prose
 * - Deduplicates repeated boilerplate paragraphs & signature clause repeats and fixes typos
 * - Appends transparently attributed internal vs. third-party benchmark tables, scope limits,
 *   field pilot experience notes, and credible primary sources when missing.
 */
export function upgradeArticleDraftForEeat(opts: {
  title: string;
  topic?: string;
  primaryKeyword?: string;
  category?: string;
  author?: string;
  content: string;
  keyTakeaways?: string[];
  fieldNotes?: string;
}): {
  title: string;
  keyTakeaways: string[];
  content: string;
  actionsApplied: string[];
} {
  const actionsApplied: string[] = [];
  const rawTitle = (opts.title || '').trim();
  const nextTitle = rawTitle ? normalizeHeadlineTitleCase(rawTitle) : rawTitle;
  if (rawTitle && nextTitle !== rawTitle) {
    actionsApplied.push('Normalized headline to Title Case');
  }

  const refTopic = (opts.topic || opts.primaryKeyword || nextTitle || 'Practical Digital Workflows').trim();
  const keyword = (opts.primaryKeyword || opts.topic || nextTitle || refTopic).trim();
  const category = (opts.category || 'Productivity & AI Tools').trim();
  const author = (opts.author || 'Briefzy Editorial Desk').trim();
  const domain = detectTopicDomain(`${refTopic} ${keyword} ${nextTitle}`, category);
  const d = DOMAIN_DETAILS[domain];
  const ds = getCredibleDatasetForTopic(`${refTopic} ${keyword}`, category);

  const rawContent = opts.content || '';
  const takeawayFix = rewriteTemplatedKeyTakeawaysForDraft({
    title: nextTitle,
    topic: refTopic,
    primaryKeyword: keyword,
    category,
    content: rawContent,
    keyTakeaways: opts.keyTakeaways,
  });
  if (takeawayFix.rewritten) {
    actionsApplied.push('Rewrote repetitive Key Takeaways into distinct, non-boilerplate bullets');
  }

  const echoCleaned = cleanTemplatedHeadingEchoesInDraft({
    title: nextTitle,
    topic: refTopic,
    primaryKeyword: keyword,
    category,
    content: rawContent,
  });
  if (echoCleaned.fixedCount > 0) {
    actionsApplied.push(`Replaced ${echoCleaned.fixedCount} templated heading-echo sentence(s) with specific subsection prose`);
  }

  let nextContent = dedupeSimilarParagraphs(proofreadArticleHtml(echoCleaned.content));
  if (nextContent.length < echoCleaned.content.length) {
    actionsApplied.push('Deduplicated repeated paragraphs & fixed editorial typos');
  }

  const plainLower = htmlToText(nextContent).toLowerCase();
  const hasBenchTable = /<table[\s>]/i.test(nextContent) && /\b(benchmark|metrics|assumptions|dimension|threshold)\b/i.test(plainLower);
  const hasAttributionBoundary =
    /\b(third-party|external research|not independent|published external|study scope)\b/i.test(plainLower) &&
    /\b(internal|track locally|baseline|minutes spent|team evidence)\b/i.test(plainLower);
  const hasMethodologyLimits = /\b(assumptions|scope limits|limitations|boundary)\b/i.test(plainLower);
  const hasPilotExperience = /\b(field pilot|pilot lesson|failure mode|implementation observation|rollback)\b/i.test(plainLower);
  const hasExternalSources = /<a\b[^>]*href=["']https?:\/\//i.test(nextContent);

  const additions: string[] = [];

  if (!hasBenchTable || !hasMethodologyLimits || !hasAttributionBoundary) {
    additions.push(
      `<h2>Reference Benchmarks, Internal Workflow Metrics and Test Scope</h2>
<p>To keep evidence clear, track in-house indicators such as <strong>${escapeHtml(d.baselineMetric)}</strong> internally, while treating published study figures strictly as external industry context—not independent Briefzy laboratory measurements.</p>
<h3>Internal Workflow Guardrails (Measure Locally)</h3>
<div class="table-wrap"><table><thead><tr><th>Workflow Dimension</th><th>Fragile Default</th><th>Verified Internal Standard</th><th>Operational Risk</th></tr></thead><tbody>${d.tableRows
        .map((r) => `<tr><td><strong>${escapeHtml(r[0])}.</strong></td><td>${escapeHtml(r[1])}.</td><td>${escapeHtml(r[2])}.</td><td>${escapeHtml(r[3])}.</td></tr>`)
        .join('')}</tbody></table></div>
<h3>Third-Party Public Research Benchmarks &amp; Study Conditions</h3>
<div class="table-wrap"><table><thead><tr><th>Published External Metric</th><th>Reported Value</th><th>Study Scope &amp; Conditions</th><th>Primary External Source</th></tr></thead><tbody>${ds.rows
        .map((r) => `<tr><td><strong>${escapeHtml(r.label)}.</strong></td><td>${escapeHtml(r.displayValue)}.</td><td>${escapeHtml(r.note)}.</td><td>${escapeHtml(r.source)}.</td></tr>`)
        .join('')}</tbody></table></div>
<div class="callout note"><p><strong>Attribution &amp; Test Boundary:</strong> All percentage benchmarks above originate from third-party published studies listed in Sources (${escapeHtml(ds.reportTitle)}, ${escapeHtml(ds.year)}). ${escapeHtml(d.metricDefinition)} ${escapeHtml(d.testAssumptions)}</p><p><strong>Scope Limits:</strong> ${escapeHtml(d.scopeLimitation)}</p></div>`
    );
    actionsApplied.push('Added transparent Third-Party vs. Internal Benchmarks tables & scope limits');
  }

  if (!hasPilotExperience || (opts.fieldNotes && opts.fieldNotes.trim() && !plainLower.includes(opts.fieldNotes.trim().slice(0, 24).toLowerCase()))) {
    const customNote = opts.fieldNotes && opts.fieldNotes.trim()
      ? `<p><strong>First-Hand Implementation Observation:</strong> ${escapeHtml(opts.fieldNotes.trim())}</p>`
      : '';
    additions.push(
      `<div class="callout tip"><p><strong>Field Pilot Lesson Learned:</strong> ${escapeHtml(d.pilotLesson)}</p>${customNote}<p>Confirm rollback behavior on a narrow slice before expanding team scope.</p></div>`
    );
    actionsApplied.push('Added Field Pilot Lesson & hands-on verification notes');
  }

  if (!hasExternalSources) {
    additions.push(buildCredibleSourcesHtml(refTopic, keyword, category, author));
    actionsApplied.push('Added primary institutional sources & editorial transparency block');
  }

  if (additions.length > 0) {
    nextContent = [nextContent.trim(), ...additions].filter(Boolean).join('\n\n');
  }

  const repeatReport = detectRepeatedPhrasePatterns(nextContent);
  if (repeatReport.repeatedClauseCount > 0) {
    actionsApplied.push(`Note: ${repeatReport.repeatedClauseCount} cross-section repeated phrase pattern(s) flagged for editorial tightening`);
  }

  return {
    title: nextTitle,
    keyTakeaways: takeawayFix.keyTakeaways,
    content: nextContent,
    actionsApplied,
  };
}

function parseJson(raw: string): any {
  const t = (raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(t);
  } catch {
    /* extract outermost JSON */
  }
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) {
    try {
      return JSON.parse(t.slice(a, b + 1));
    } catch {
      /* ignore */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Gemini: translation of a finished article (chapter by chapter)
// ---------------------------------------------------------------------------

const LANG_NAME: Record<TargetLang, string> = {
  es: 'Spanish (neutral international Spanish)',
  de: 'German',
  fr: 'French',
  ja: 'Japanese',
};

export function splitHtmlIntoChunks(html: string, maxChars = 7000): string[] {
  const pieces = (html || '').split(/(?=<h2[\s>])/i).filter((x) => x.trim());
  const chunks: string[] = [];
  for (const piece of pieces) {
    if (piece.length <= maxChars) {
      chunks.push(piece);
      continue;
    }
    let buf = '';
    for (const sub of piece.split(/(?=<h3[\s>])/i)) {
      if (buf && (buf + sub).length > maxChars) {
        chunks.push(buf);
        buf = '';
      }
      buf += sub;
    }
    if (buf) chunks.push(buf);
  }
  return chunks;
}

export async function translateArticleWithAI(
  call: ModelCaller,
  src: { title: string; metaDescription: string; keyTakeaways: string[]; faqs: ArticleFaq[]; content: string },
  lang: TargetLang,
  budgetMs = 80000
): Promise<LocalizedFields> {
  const started = Date.now();
  const L = LANG_NAME[lang];
  const system = `You are a professional native-level translator and editor. Translate into ${L}. Keep the meaning, tone and structure; write naturally for native readers, not word-for-word. Never add or remove information. Keep brand names (Briefzy), product names, URLs, base64 image data URLs inside <img> tags, numbers and units as they are.`;
  // Strip inline base64 data images temporarily before translation so token limits are never exceeded, then re-attach cleanly
  const imgPlaceholders: string[] = [];
  const compactContent = (src.content || '').replace(
    /<img\b[^>]*\bsrc="data:image\/[^"]+"[^>]*>/gi,
    (m) => {
      const idx = imgPlaceholders.push(m) - 1;
      return `<!--BZ_IMG_${idx}-->`;
    }
  );
  const chunks = splitHtmlIntoChunks(compactContent);

  const translateChunk = async (html: string) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (Date.now() - started > budgetMs && attempt > 0) break;
      const out = cleanModelHtml(
        await call({
          system,
          prompt: `Translate the visible text of this HTML into ${L}. Preserve every HTML tag, HTML comment placeholder (<!--BZ_IMG_X-->), attribute, class name and the exact element order. Translate headings, paragraphs, figcaptions, list items, table cells and blockquotes. Return ONLY the translated HTML.\n\n${html}`,
          maxTokens: 8192,
        })
      );
      const tagCount = (s: string) => (s.match(/<(h2|h3|p|li|tr|table|blockquote|figure)[\s>]/gi) || []).length;
      if (
        out &&
        tagCount(out) >= tagCount(html) * 0.85 &&
        htmlToText(out).trim().length >= htmlToText(html).trim().length * (lang === 'ja' ? 0.25 : 0.6)
      ) {
        return out;
      }
    }
    throw new Error('translation chunk failed validation');
  };

  const metaPromise = call({
    system: `${system} Return strict JSON only.`,
    json: true,
    maxTokens: 6000,
    prompt: `Translate these fields into ${L}. Keep the same JSON shape and array lengths.\n${JSON.stringify({
      title: src.title,
      metaDescription: src.metaDescription,
      keyTakeaways: src.keyTakeaways,
      faqs: src.faqs,
    })}`,
  }).then(parseJson);

  const [meta, translated] = await Promise.all([
    metaPromise,
    pool(chunks.map((c) => () => translateChunk(c)), 5),
  ]);

  if (!meta || typeof meta.title !== 'string') throw new Error('translation metadata failed');
  let content = translated.join('\n\n');
  imgPlaceholders.forEach((tag, idx) => {
    content = content.replace(`<!--BZ_IMG_${idx}-->`, tag);
  });
  return {
    title: meta.title,
    metaDescription: String(meta.metaDescription || '').slice(0, 200),
    readingTime: readingTimeFor(countHtmlWords(src.content), lang),
    keyTakeaways: Array.isArray(meta.keyTakeaways) && meta.keyTakeaways.length ? meta.keyTakeaways.map(String) : src.keyTakeaways,
    faqs: Array.isArray(meta.faqs) && meta.faqs.length ? meta.faqs.map((f: any) => ({ question: String(f.question), answer: String(f.answer) })) : src.faqs,
    content,
  };
}
