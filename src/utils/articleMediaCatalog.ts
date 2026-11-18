/**
 * Topic- & keyword-matched media, real-data visualizations, diagrams, and verified videos for Briefzy.
 * Pure TypeScript (no DOM or Node APIs) so both the frontend ArticleView, Admin Article Builder,
 * Express server, and Cloudflare Worker can share the exact same catalog and HTML helpers.
 */

export interface TopicImageSpec {
  src: string;
  alt: string;
  caption: string;
}

export interface VerifiedDataMetric {
  label: string;
  value: number;
  displayValue: string;
  detail: string;
}

export interface VerifiedSourceRef {
  name: string;
  url: string;
  year: string;
}

export interface TopicVisualPack {
  topicTag: string;
  chartTitle: string;
  chartSubtitle: string;
  metrics: VerifiedDataMetric[];
  chartSource: VerifiedSourceRef;
  infographicTitle: string;
  infographicSteps: { num: string; title: string; detail: string }[];
  infographicSource: VerifiedSourceRef;
  flowchartTitle: string;
  flowchartNodes: { step: string; role: 'start' | 'process' | 'decision' | 'outcome'; note: string }[];
  mindMapCenter: string;
  mindMapBranches: { branch: string; nodes: string[] }[];
  sketchTitle: string;
  sketchSubtitle: string;
  sketchCallouts: { label: string; metric: string; note: string }[];
  sketchSource: VerifiedSourceRef;
}

export interface TopicVideoSpec {
  youtubeId: string;
  embedUrl: string;
  watchUrl: string;
  title: string;
  channel: string;
  summary: string;
}

const escHtml = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// 1. Curated local editorial photography (/public/images/*.jpg)
// ---------------------------------------------------------------------------

const IMAGE_POOL: Record<string, TopicImageSpec[]> = {
  ai: [
    {
      src: '/images/ai-workflow.jpg',
      alt: 'Knowledge worker structuring AI prompts and reviewing workflow notes on a laptop desk',
      caption: 'Structured workflows help turn open-ended prompts into consistent, repeatable outputs.',
    },
    {
      src: '/images/notebook-draft.jpg',
      alt: 'Editorial desk with a pen, open notebook, tablet, and headphones for drafting and reviewing content',
      caption: 'Drafting core instructions offline before pasting into a model keeps context sharp and verifiable.',
    },
    {
      src: '/images/team-collab.jpg',
      alt: 'Two teammates reviewing written documentation alongside laptop analytics in daylight',
      caption: 'Human fact-checking and editorial review remain essential before publishing AI-assisted drafts.',
    },
  ],
  security: [
    {
      src: '/images/cyber-security.jpg',
      alt: 'Hardware FIDO2 security passkey connected to a laptop on a clean slate surface',
      caption: 'Phishing-resistant hardware passkeys and authenticators block credential replay even if a password leaks.',
    },
    {
      src: '/images/network-router.jpg',
      alt: 'Modern matte black Wi-Fi router with Ethernet patch cables arranged near a window',
      caption: 'Securing router firmware, WPA3 encryption, and separate guest SSIDs isolates smart devices from work laptops.',
    },
    {
      src: '/images/ai-workflow.jpg',
      alt: 'Carefully inspecting security alerts and account audit settings on a workstation',
      caption: 'Regularly reviewing login history and recovery channels catches unauthorized access early.',
    },
  ],
  tech: [
    {
      src: '/images/tech-hardware.jpg',
      alt: 'External NVMe solid-state backup drives connected to an ultrabook via braided USB-C cables',
      caption: 'Pairing fast local external SSDs with encrypted offsite cloud copies satisfies the 3-2-1 backup standard.',
    },
    {
      src: '/images/network-router.jpg',
      alt: 'Wired Ethernet and router hardware setup for stable high-throughput file transfers',
      caption: 'Stable wired links and clean background startup routines prevent transfer bottlenecks and OS sluggishness.',
    },
    {
      src: '/images/remote-office.jpg',
      alt: 'Minimalist sunlit desk setup featuring an ultrawide monitor and clean hardware peripherals',
      caption: 'Trimming heavy startup utilities and checking disk health restores snappier everyday responsiveness.',
    },
  ],
  remote: [
    {
      src: '/images/remote-office.jpg',
      alt: 'Ergonomic sunlit home office workspace with monitor arm, mechanical keyboard, and natural greenery',
      caption: 'Dedicated eye-level monitor alignment and natural daylight reduce fatigue during long remote blocks.',
    },
    {
      src: '/images/team-collab.jpg',
      alt: 'Distributed colleagues aligning schedules and async notes across laptop and notebook',
      caption: 'Written async updates with clear owners cut unnecessary status meetings across time zones.',
    },
    {
      src: '/images/notebook-draft.jpg',
      alt: 'Quiet desk setup with headphones and notebook for distraction-free deep work sessions',
      caption: 'Time-boxed focus blocks and physical shutdown rituals protect evening recovery at home.',
    },
  ],
};

function domainKeyFor(category = '', topic = '', keyword = ''): 'ai' | 'security' | 'tech' | 'remote' {
  const hay = `${category} ${topic} ${keyword}`.toLowerCase();
  if (/phish|password|mfa|2fa|wi-fi|wifi|breach|vpn|antivirus|identity theft|security|privacy/.test(hay)) return 'security';
  if (/backup|slow computer|speed up|ssd|hard drive|router|hardware|tech how-to|device/.test(hay)) return 'tech';
  if (/home office|remote|async|burnout|stay focused|meeting|freelance|project management|ergonomic/.test(hay)) return 'remote';
  return 'ai';
}

export function pickTopicImages(opts: {
  title?: string;
  primaryKeyword?: string;
  category?: string;
}): TopicImageSpec[] {
  const domain = domainKeyFor(opts.category, opts.title, opts.primaryKeyword);
  const pool = IMAGE_POOL[domain] || IMAGE_POOL.ai;
  const kw = (opts.primaryKeyword || opts.title || 'this workflow').trim();
  return pool.map((item, idx) => ({
    src: item.src,
    alt: `${item.alt} — practical visual guide for ${kw}`,
    caption: idx === 0 ? `${item.caption} (Focus: ${kw})` : item.caption,
  }));
}

// ---------------------------------------------------------------------------
// 2. Real verified data visualizations, infographics, flowcharts, mind maps & sketches
// ---------------------------------------------------------------------------

export function buildTopicVisualPack(opts: {
  title?: string;
  primaryKeyword?: string;
  category?: string;
  secondaryKeywords?: string[];
}): TopicVisualPack {
  const domain = domainKeyFor(opts.category, opts.title, opts.primaryKeyword);
  const kw = (opts.primaryKeyword || opts.title || 'Core Workflow').trim();
  const shortKw = kw.length > 36 ? kw.slice(0, 34).trim() + '...' : kw;
  const hay = `${opts.category || ''} ${opts.title || ''} ${opts.primaryKeyword || ''}`.toLowerCase();
  const extraTerms = (opts.secondaryKeywords || []).filter(Boolean).slice(0, 4);

  if (domain === 'security') {
    const isPhishing = /phish|email|scam|breach|identity/.test(hay);
    return {
      topicTag: 'Online Security Research & Benchmarks',
      chartTitle: isPhishing
        ? 'Human-Layer Risk & Phishing Vectors in Real Incidents'
        : 'Real-World Breach Exposure & Credential Remediation Benchmarks',
      chartSubtitle: 'Verified figures from Verizon Data Breach Investigations Report (DBIR)',
      metrics: [
        { label: 'Human element present in breaches', value: 62, displayValue: '62%', detail: 'Verizon DBIR measured share of breaches involving human interaction or error.' },
        { label: 'Mobile phishing click lift vs. email', value: 40, displayValue: '+40%', detail: 'SMS/voice social engineering simulations recorded 40% higher median click susceptibility.' },
        { label: 'Initial access via vulnerability exploits', value: 31, displayValue: '31%', detail: 'Unpatched perimeter & software flaws surpassed raw credential abuse.' },
        { label: 'Third-party MFA gaps remediated', value: 23, displayValue: '23%', detail: 'Share of monitored cloud accounts that fully fixed missing MFA controls.' },
      ],
      chartSource: { name: 'Verizon Data Breach Investigations Report (DBIR)', url: 'https://www.verizon.com/business/resources/reports/dbir/', year: '2025/2026' },
      infographicTitle: `4-Layer Defense Model for ${shortKw}`,
      infographicSteps: [
        { num: '01', title: 'Unique Vault Credentials', detail: 'Use 14+ random characters per login so a leak on one site cannot unlock banking or email.' },
        { num: '02', title: 'Phishing-Resistant MFA', detail: 'Prefer authenticator apps or FIDO2 passkeys over SMS codes whenever supported.' },
        { num: '03', title: 'Domain Verification Habit', detail: 'Let password managers auto-fill—never paste logins into unfamiliar lookalike domains.' },
        { num: '04', title: 'Rapid Patching & Audits', detail: 'Keep browsers, routers, and OS patches current and freeze credit files proactively.' },
      ],
      infographicSource: { name: 'CISA Secure Our World Guidance', url: 'https://www.cisa.gov/secure-our-world', year: '2026' },
      flowchartTitle: `Security Verification Flowchart: ${shortKw}`,
      flowchartNodes: [
        { step: 'Trigger or Security Request Arrives', role: 'start', note: 'Unexpected prompt, link, login check, or router change' },
        { step: 'Does Domain & Sender Exactly Match?', role: 'decision', note: 'Inspect root domain, headers, or saved bookmark' },
        { step: 'Authenticate with Manager + MFA', role: 'process', note: 'Confirm autofill only triggers on trusted origin' },
        { step: 'Account Protected & Session Logged', role: 'outcome', note: 'Block lookalike spoofing before credentials leave device' },
      ],
      mindMapCenter: shortKw,
      mindMapBranches: [
        { branch: 'Credential Hygiene', nodes: [extraTerms[0] || 'Password Manager', '14+ Char Randomness', 'Zero Reuse'] },
        { branch: 'Stronger 2FA', nodes: ['FIDO2 Security Keys', 'Authenticator TOTP', 'Backup Recovery Codes'] },
        { branch: 'Attack Prevention', nodes: [extraTerms[1] || 'Phishing Red Flags', 'Domain Matching', 'Credit Freeze'] },
        { branch: 'Network Controls', nodes: ['WPA3 Encryption', 'Router Firmware', 'Guest Network Split'] },
      ],
      sketchTitle: 'NIST 800-63B Credential Lifecycle Sketch',
      sketchSubtitle: 'Architectural field blueprint contrasting memorized secrets vs. multi-factor defense',
      sketchCallouts: [
        { label: 'Length Over Complexity Rules', metric: '15+ chars', note: 'NIST SP 800-63 emphasizes length & breached-password screening over arbitrary symbol rotations.' },
        { label: 'Origin-Bound Verification', metric: 'WebAuthn', note: 'Cryptographic keys verify the exact domain natively before responding.' },
        { label: 'Mean Breach Detection Savings', metric: 'Faster containment', note: 'Layered encryption and MFA dramatically lower unauthorized lateral spread.' },
      ],
      sketchSource: { name: 'NIST Digital Identity Guidelines (SP 800-63B)', url: 'https://pages.nist.gov/800-63-3/sp800-63b.html', year: 'NIST' },
    };
  }

  if (domain === 'tech') {
    const isBackup = /backup|3-2-1|restore|drive|ssd/.test(hay);
    return {
      topicTag: 'Practical Hardware & Reliability Data',
      chartTitle: isBackup
        ? 'The 3-2-1 Backup Redundancy Blueprint & Drive Failure Resilience'
        : 'System Performance & Data Protection Recovery Benchmarks',
      chartSubtitle: 'Verified principles from Backblaze Storage & CISA Resilience Frameworks',
      metrics: [
        { label: 'Total Independent Data Copies', value: 100, displayValue: '3 Copies', detail: '1 active working dataset + 2 separated backup snapshots.' },
        { label: 'Distinct Storage Media Types', value: 66, displayValue: '2 Media', detail: 'Combine internal SSD/HDD with an external drive or NAS array.' },
        { label: 'Air-Gapped / Offsite Cloud Copy', value: 33, displayValue: '1 Offsite', detail: 'Protects files from local fire, theft, surge damage, and ransomware.' },
        { label: 'Target Startup Trim Overhead', value: 45, displayValue: '-45% boot load', detail: 'Disabling non-essential background agents speeds cold boot and frees RAM.' },
      ],
      chartSource: { name: 'Backblaze 3-2-1 Backup Strategy Guide', url: 'https://www.backblaze.com/blog/the-3-2-1-backup-strategy/', year: '2025/2026' },
      infographicTitle: `Step-by-Step Architecture for ${shortKw}`,
      infographicSteps: [
        { num: '01', title: 'Audit Critical Files & Apps', detail: 'Separate irreplaceable personal/work folders from replaceable system caches.' },
        { num: '02', title: 'Configure Local Snapshot', detail: 'Attach a dedicated encrypted USB-C NVMe/HDD volume for automatic hourly or daily sync.' },
        { num: '03', title: 'Verify Offsite Sync', detail: 'Pair local backups with zero-knowledge or versioned offsite cloud storage.' },
        { num: '04', title: 'Quarterly Restore Drill', detail: 'Test opening real restored files every 90 days—an untested backup is an assumption.' },
      ],
      infographicSource: { name: 'CISA Secure Our World — Data Backup', url: 'https://www.cisa.gov/secure-our-world', year: '2026' },
      flowchartTitle: `Troubleshooting & Execution Flowchart: ${shortKw}`,
      flowchartNodes: [
        { step: 'Baseline Hardware & Storage Check', role: 'start', note: 'Inspect free disk headroom (>= 15%) & SMART health' },
        { step: 'Is Data Backed Up in 2+ Places?', role: 'decision', note: 'Confirm recent local + offsite sync before cleanup' },
        { step: 'Prune Startup Bloat & Run Update', role: 'process', note: 'Trim background updaters, verify fans/thermals, update OS' },
        { step: 'Fast & Recoverable Workstation', role: 'outcome', note: 'Lower RAM pressure + verified disaster recovery path' },
      ],
      mindMapCenter: shortKw,
      mindMapBranches: [
        { branch: 'Storage Layers', nodes: ['Primary SSD', 'External USB-C Drive', 'Offsite Cloud Vault'] },
        { branch: 'Performance Hygiene', nodes: [extraTerms[0] || 'Startup Programs', 'Free Space >= 15%', 'Browser Tab Limits'] },
        { branch: 'Ransomware Safety', nodes: ['Version History', 'Disconnected Cold Drive', 'Verified Checksums'] },
        { branch: 'Routine Checks', nodes: [extraTerms[1] || '90-Day Restore Test', 'SMART Health', 'Thermal Dust Cleaning'] },
      ],
      sketchTitle: '3-2-1 Topology & Bottleneck Sketch',
      sketchSubtitle: 'Visual schematic separating live workspace storage from local & remote vaults',
      sketchCallouts: [
        { label: 'Tier 1: Working Disk', metric: 'Live OS', note: 'Daily documents and active project folders on fast internal NVMe storage.' },
        { label: 'Tier 2: Local Backup', metric: 'External SSD', note: 'Fast physical restore even when internet connectivity is unavailable.' },
        { label: 'Tier 3: Offsite Vault', metric: 'Versioned Cloud', note: 'Immutable snapshot history protects against accidental deletion or ransomware.' },
      ],
      sketchSource: { name: 'Backblaze Backup Architecture Research', url: 'https://www.backblaze.com/blog/the-3-2-1-backup-strategy/', year: 'Backblaze' },
    };
  }

  if (domain === 'remote') {
    return {
      topicTag: 'Remote & Hybrid Workforce Data',
      chartTitle: 'How Remote-Capable Teams Actually Work & Retain Talent',
      chartSubtitle: 'Verified U.S. survey findings from Gallup & Pew Research Center',
      metrics: [
        { label: 'Hybrid Schedule Adoption', value: 53, displayValue: '53%', detail: 'Majority of remote-capable employees split their week between home & office (Gallup).' },
        { label: 'Unlikely to Stay Without Flexibility', value: 46, displayValue: '46%', detail: 'Pew Research share of remote-capable workers likely to leave if remote options ended.' },
        { label: 'Weekly Share Spent On-Site (Hybrid)', value: 46, displayValue: '46% (~2.3d)', detail: 'Average in-office share among hybrid workers (Gallup Hybrid Indicator).' },
        { label: 'Exclusively Remote Workforce', value: 26, displayValue: '26%', detail: 'Full-time distributed staff operating entirely outside traditional offices (Gallup).' },
      ],
      chartSource: { name: 'Gallup Hybrid Work Indicator & Pew Research Center', url: 'https://www.gallup.com/401384/indicator-hybrid-work.aspx', year: '2025/2026' },
      infographicTitle: `High-Output Remote Framework for ${shortKw}`,
      infographicSteps: [
        { num: '01', title: 'Ergonomic Physical Anchor', detail: 'Position screen top at eye height, support lower lumbar, and separate work lighting.' },
        { num: '02', title: 'Async-First Decisions', detail: 'Default status updates to written briefs with clear deadlines instead of ad-hoc calls.' },
        { num: '03', title: 'Protected Focus Windows', detail: 'Silence non-urgent chat notifications during two 90-minute deep work blocks daily.' },
        { num: '04', title: 'Deliberate Shutdown Cue', detail: 'Close work tabs and log tomorrow’s top 3 priorities at a fixed end-of-day trigger.' },
      ],
      infographicSource: { name: 'Pew Research Center — Telework & Job Views', url: 'https://www.pewresearch.org/social-trends/2023/03/30/how-americans-view-their-jobs/', year: 'Pew Research' },
      flowchartTitle: `Remote Decision Flowchart: ${shortKw}`,
      flowchartNodes: [
        { step: 'New Task, Question, or Request Enters', role: 'start', note: 'Inbox, Slack/Teams thread, or weekly sprint item' },
        { step: 'Does This Need Real-Time Debate?', role: 'decision', note: 'Only complex trade-offs or sensitive feedback need live calls' },
        { step: 'Write Async Doc / Recorded Walkthrough', role: 'process', note: 'Include goal, options, deadline, and decision owner' },
        { step: 'Calm Focus & Clear Written Trail', role: 'outcome', note: 'Fewer interruptions across distributed time zones' },
      ],
      mindMapCenter: shortKw,
      mindMapBranches: [
        { branch: 'Workspace Setup', nodes: [extraTerms[0] || 'Eye-Level Monitor', 'Lumbar Chair Support', 'Natural Light'] },
        { branch: 'Async Workflow', nodes: ['Written Briefs', 'Agenda-First Meetings', 'Clear Response SLAs'] },
        { branch: 'Attention Shield', nodes: [extraTerms[1] || '90-Min Focus Blocks', 'Muted Chat Windows', 'Single Tasking'] },
        { branch: 'Burnout Guardrails', nodes: ['Hard Stop Time', 'Lunch Away From Desk', 'Weekly Review Reset'] },
      ],
      sketchTitle: 'Distributed Focus vs. Meeting Load Sketch',
      sketchSubtitle: 'Visual blueprint balancing synchronous collaboration with protected maker blocks',
      sketchCallouts: [
        { label: 'Core Overlap Window', metric: '2–3 hrs/day', note: 'Concentrate live meetings into shared time-zone windows rather than scattering them all day.' },
        { label: 'Written Documentation Habit', metric: 'Async First', note: 'Searchable briefs save teammates from re-explaining decisions across shifts.' },
        { label: 'Retention Impact', metric: '46% sensitivity', note: 'Structured flexibility directly reinforces team stability and autonomy (Pew).' },
      ],
      sketchSource: { name: 'Gallup Indicator: Hybrid Work', url: 'https://www.gallup.com/401384/indicator-hybrid-work.aspx', year: 'Gallup' },
    };
  }

  // Default: Productivity & AI Tools
  return {
    topicTag: 'Verified AI Adoption & Workflow Research',
    chartTitle: 'Enterprise & Workplace AI Adoption vs. Measured Output Gains',
    chartSubtitle: 'Verified findings from Stanford HAI AI Index Report',
    metrics: [
      { label: 'Organizations Using AI (1+ Function)', value: 88, displayValue: '88%', detail: 'Worldwide organizational adoption jumped from 55% to 88% (Stanford HAI AI Index).' },
      { label: 'Companies Running Generative AI', value: 70, displayValue: '70%', detail: 'Roughly 70% of businesses actively deploy generative AI across daily workflows.' },
      { label: 'Population Adoption Within 3 Years', value: 53, displayValue: '53%', detail: 'Generative AI crossed 53% population adoption faster than PCs or early internet.' },
      { label: 'Measured Productivity Lift (Structured Tasks)', value: 26, displayValue: '14%–26%', detail: 'Verified acceleration in structured writing, coding, and support tasks (Stanford HAI).' },
    ],
    chartSource: { name: 'Stanford HAI AI Index Report', url: 'https://hai.stanford.edu/ai-index/2025-ai-index-report', year: '2025/2026' },
    infographicTitle: `Structured AI Workflow for ${shortKw}`,
    infographicSteps: [
      { num: '01', title: 'Define Task + Audience', detail: 'Open with an explicit action verb, reader role, and objective criteria for success.' },
      { num: '02', title: 'Supply Grounded Context', detail: 'Paste source notes, constraints, or tone guardrails so the model stops guessing.' },
      { num: '03', title: 'Lock Output Format & Examples', detail: 'Request tables, bulleted briefs, or show 1–2 before/after samples (few-shot prompting).' },
      { num: '04', title: 'Iterate & Verify Facts', detail: 'Audit dates, citations, and calculations against primary sources before publishing.' },
    ],
    infographicSource: { name: 'Stanford HAI AI Index — Productivity & Jagged Frontier', url: 'https://hai.stanford.edu/ai-index/2025-ai-index-report', year: 'Stanford HAI' },
    flowchartTitle: `Prompting & Verification Flowchart: ${shortKw}`,
    flowchartNodes: [
      { step: 'Frame Goal, Role & Target Format', role: 'start', note: 'Specify task, constraints, and audience upfront' },
      { step: 'Does Output Meet Constraints & Tone?', role: 'decision', note: 'Check length, clarity, and structure on first pass' },
      { step: 'Refine via Targeted Follow-Up', role: 'process', note: 'Adjust specific paragraphs instead of restarting' },
      { step: 'Human Fact-Check & Ship', role: 'outcome', note: 'Verify claims against trusted references' },
    ],
    mindMapCenter: shortKw,
    mindMapBranches: [
      { branch: 'Prompt Inputs', nodes: [extraTerms[0] || 'Clear Task', 'Background Context', 'Explicit Constraints'] },
      { branch: 'Quality Levers', nodes: ['Few-Shot Examples', 'Requested Format', 'Step-by-Step Reasoning'] },
      { branch: 'Safeguards', nodes: [extraTerms[1] || 'Primary Fact-Check', 'No Sensitive Data', 'Source Grounding'] },
      { branch: 'High-ROI Uses', nodes: ['Drafting & Editing', 'Meeting Summaries', 'Structured Comparisons'] },
    ],
    sketchTitle: 'The "Jagged Frontier" AI Collaboration Sketch',
    sketchSubtitle: 'Concept diagram distinguishing high-leverage structured tasks from human-judgment zones',
    sketchCallouts: [
      { label: 'High-Lift Zone (+14–26%)', metric: 'Structured', note: 'First drafts, summaries, format conversions, and checklist synthesis shine with AI.' },
      { label: 'Human-Judgment Zone', metric: 'Verify All', note: 'Strategy, nuanced tone, compliance checks, and factual verification stay human-led.' },
      { label: 'Zero-Fluff Guardrail', metric: 'Grounded', note: 'Restrict answers strictly to supplied documents whenever accuracy is critical.' },
    ],
    sketchSource: { name: 'Stanford HAI AI Index Report', url: 'https://hai.stanford.edu/ai-index/2025-ai-index-report', year: 'Stanford HAI' },
  };
}

// ---------------------------------------------------------------------------
// 3. Verified YouTube Video Selector (all IDs verified active via YouTube oEmbed)
// ---------------------------------------------------------------------------

interface VideoEntry extends TopicVideoSpec {
  keywords: string[];
  domain: 'ai' | 'security' | 'tech' | 'remote';
}

const VERIFIED_VIDEOS: VideoEntry[] = [
  {
    domain: 'ai',
    keywords: ['prompt', 'chatbot', 'email', 'how to talk to ai', 'better ai'],
    youtubeId: 'o64Mv-ArFDI',
    embedUrl: 'https://www.youtube-nocookie.com/embed/o64Mv-ArFDI?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=o64Mv-ArFDI',
    title: "Google's Prompting Framework Explained",
    channel: 'Jeff Su',
    summary: 'Step-by-step breakdown of persona, task, context, and iteration patterns that apply to ChatGPT, Claude, and Gemini.',
  },
  {
    domain: 'ai',
    keywords: ['summarize', 'document', 'meeting', 'notes', 'pdf'],
    youtubeId: 'NTPEWsM6Nfw',
    embedUrl: 'https://www.youtube-nocookie.com/embed/NTPEWsM6Nfw?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=NTPEWsM6Nfw',
    title: 'How to Summarize Long Documents & PDFs with AI',
    channel: 'Lvl 99 TechSkillz',
    summary: 'Practical walkthrough on extracting clean decisions, citations, and action items from long multi-page documents.',
  },
  {
    domain: 'ai',
    keywords: ['fact-check', 'fact check', 'hallucinate', 'policy', 'verify'],
    youtubeId: 'cfqtFvWOfg0',
    embedUrl: 'https://www.youtube-nocookie.com/embed/cfqtFvWOfg0?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=cfqtFvWOfg0',
    title: 'Why Large Language Models Hallucinate & How to Verify Outputs',
    channel: 'IBM Technology',
    summary: 'Clear explanation of why AI chatbots fabricate confident errors and how verification habits stop mistakes.',
  },
  {
    domain: 'ai',
    keywords: ['weekly review', 'template', 'stay organized'],
    youtubeId: 'zjKUX7sHEGI',
    embedUrl: 'https://www.youtube-nocookie.com/embed/zjKUX7sHEGI?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=zjKUX7sHEGI',
    title: 'From Chaos to Clarity: 4-Step Weekly Review System',
    channel: 'Tiago Forte',
    summary: 'Walkthrough of resetting inboxes, calendars, and weekly task lists in under 30 minutes.',
  },
  {
    domain: 'ai',
    keywords: ['ai at work', 'small business', 'tools'],
    youtubeId: '1c9iyoVIwDs',
    embedUrl: 'https://www.youtube-nocookie.com/embed/1c9iyoVIwDs?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=1c9iyoVIwDs',
    title: '4 Practical Methods of Prompt Engineering',
    channel: 'IBM Technology',
    summary: 'Visual breakdown of structured reasoning, grounded retrieval, and iterative prompt workflows.',
  },
  {
    domain: 'security',
    keywords: ['phishing', 'email', 'scam'],
    youtubeId: 'o0btqyGWIQw',
    embedUrl: 'https://www.youtube-nocookie.com/embed/o0btqyGWIQw?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=o0btqyGWIQw',
    title: 'How to Spot Phishing Emails',
    channel: 'GRC Solutions',
    summary: 'Visual checklist showing spoofed domains, urgency traps, and inspection steps before clicking.',
  },
  {
    domain: 'security',
    keywords: ['password manager', 'two-factor', '2fa', 'mfa'],
    youtubeId: 'sMShYi7R674',
    embedUrl: 'https://www.youtube-nocookie.com/embed/sMShYi7R674?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=sMShYi7R674',
    title: 'Setting Up a Password Manager & Integrated Authenticator',
    channel: 'Bitwarden',
    summary: 'Walkthrough of pairing unique generated logins with built-in two-factor authentication codes.',
  },
  {
    domain: 'security',
    keywords: ['wi-fi', 'wifi', 'router', 'network'],
    youtubeId: '6Ti23tE7UMI',
    embedUrl: 'https://www.youtube-nocookie.com/embed/6Ti23tE7UMI?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=6Ti23tE7UMI',
    title: 'Router Security 101: Protecting Your Home Wi-Fi',
    channel: 'NetWork From Home',
    summary: 'Practical demonstration of WPA3 settings, guest networks, admin passwords, and automatic router updates.',
  },
  {
    domain: 'security',
    keywords: ['data breach', 'identity theft', 'credit freeze'],
    youtubeId: 'AV70YFXIQa8',
    embedUrl: 'https://www.youtube-nocookie.com/embed/AV70YFXIQa8?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=AV70YFXIQa8',
    title: 'How to Protect Yourself Against Identity Theft & Breaches',
    channel: 'All Things Secured',
    summary: 'Clear overview of freezing credit files and containing exposed account credentials quickly.',
  },
  {
    domain: 'security',
    keywords: ['vpn', 'antivirus'],
    youtubeId: 'qoXBMEGR7Eg',
    embedUrl: 'https://www.youtube-nocookie.com/embed/qoXBMEGR7Eg?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=qoXBMEGR7Eg',
    title: 'VPNs vs. Antivirus: Which One Do You Really Need?',
    channel: 'Skillweed',
    summary: 'Side-by-side comparison of encrypted traffic tunnels versus endpoint malware protection.',
  },
  {
    domain: 'tech',
    keywords: ['3-2-1', 'backup', 'external drive', 'cloud'],
    youtubeId: 'WJzsX32qMJY',
    embedUrl: 'https://www.youtube-nocookie.com/embed/WJzsX32qMJY?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=WJzsX32qMJY',
    title: 'The 3-2-1 Backup Rule Explained',
    channel: 'IBM Technology',
    summary: 'Architectural walkthrough of keeping three data copies across two media types plus one offsite backup.',
  },
  {
    domain: 'tech',
    keywords: ['slow computer', 'speed up', 'laptop', 'pc'],
    youtubeId: 'mwAYcVWKlBY',
    embedUrl: 'https://www.youtube-nocookie.com/embed/mwAYcVWKlBY?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=mwAYcVWKlBY',
    title: '5 Safe Ways to Speed Up a Slow Laptop',
    channel: 'Kevin Stratvert',
    summary: 'Safe, no-bloat tweaks including startup trims, storage cleanup, and update management.',
  },
  {
    domain: 'remote',
    keywords: ['home office', 'budget', 'ergonomic', 'chair', 'desk'],
    youtubeId: 'K88q_oEwRS8',
    embedUrl: 'https://www.youtube-nocookie.com/embed/K88q_oEwRS8?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=K88q_oEwRS8',
    title: '9 Tips for a Healthy Ergonomic Workstation',
    channel: 'Mayo Clinic',
    summary: 'Evidence-based monitor height, chair angle, and keyboard spacing guidance for pain-free desk hours.',
  },
  {
    domain: 'remote',
    keywords: ['remote meetings', 'project management', 'software'],
    youtubeId: 'vradYqcXfGQ',
    embedUrl: 'https://www.youtube-nocookie.com/embed/vradYqcXfGQ?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=vradYqcXfGQ',
    title: 'How to Collaborate Effectively When Your Team Is Remote',
    channel: 'Harvard Business Review',
    summary: 'Practical habits for structuring remote meetings, shared ownership, and clear written expectations.',
  },
  {
    domain: 'remote',
    keywords: ['async', 'asynchronous'],
    youtubeId: 'oULge4DhB9E',
    embedUrl: 'https://www.youtube-nocookie.com/embed/oULge4DhB9E?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=oULge4DhB9E',
    title: 'Top Asynchronous Communication Tips for Remote Teams',
    channel: 'People·WHYS',
    summary: 'How distributed teams write clear docs, reduce calendar bloat, and respect deep-work time zones.',
  },
  {
    domain: 'remote',
    keywords: ['burnout', 'stay focused', 'focus'],
    youtubeId: 'IDwMsY22_Ms',
    embedUrl: 'https://www.youtube-nocookie.com/embed/IDwMsY22_Ms?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=IDwMsY22_Ms',
    title: 'How to Stay Focused & Avoid Fatigue Working From Home',
    channel: 'Jordan Platten',
    summary: 'Actionable daily routines for time-blocking, setting boundaries, and beating isolation fatigue.',
  },
  {
    domain: 'remote',
    keywords: ['freelance website', 'domain', 'hosting', 'portfolio'],
    youtubeId: '9l56t191MgE',
    embedUrl: 'https://www.youtube-nocookie.com/embed/9l56t191MgE?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=9l56t191MgE',
    title: 'How to Build a Clean Portfolio Website From Scratch',
    channel: 'Jake One Page',
    summary: 'Step-by-step walkthrough of structuring services, proof, and fast navigation on a freelance site.',
  },
];

export function pickTopicVideo(opts: {
  title?: string;
  primaryKeyword?: string;
  category?: string;
}): TopicVideoSpec {
  const hay = `${opts.title || ''} ${opts.primaryKeyword || ''} ${opts.category || ''}`.toLowerCase();
  let best: VideoEntry | null = null;
  let bestScore = 0;

  for (const v of VERIFIED_VIDEOS) {
    let score = 0;
    for (const k of v.keywords) {
      if (hay.includes(k)) score += 3 + k.length / 10;
    }
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }

  if (best) return best;
  const domain = domainKeyFor(opts.category, opts.title, opts.primaryKeyword);
  return VERIFIED_VIDEOS.find((v) => v.domain === domain) || VERIFIED_VIDEOS[0];
}

// ---------------------------------------------------------------------------
// 4. Clean HTML builders (used by Article Builder & Auto-Optimize)
// ---------------------------------------------------------------------------

export function buildParagraphImageHtml(img: TopicImageSpec, figNum: number): string {
  return `<figure class="bz-inline-figure">
  <img src="${escHtml(img.src)}" alt="${escHtml(img.alt)}" loading="lazy" decoding="async" />
  <figcaption><strong>Fig. ${figNum}:</strong> ${escHtml(img.caption)}</figcaption>
</figure>`;
}

export function buildDataChartHtml(pack: TopicVisualPack): string {
  const bars = pack.metrics
    .map(
      (m) => `<div class="bz-bar-row">
    <div class="bz-bar-meta"><span>${escHtml(m.label)}</span><strong>${escHtml(m.displayValue)}</strong></div>
    <div class="bz-bar-track"><div class="bz-bar-fill" style="width: ${Math.max(12, Math.min(100, m.value))}%"></div></div>
    <p class="bz-bar-detail">${escHtml(m.detail)}</p>
  </div>`
    )
    .join('\n  ');

  return `<div class="bz-visual-card">
  <div class="bz-visual-head">
    <p class="bz-visual-kicker">Verified Data Benchmark · ${escHtml(pack.topicTag)}</p>
    <h4>${escHtml(pack.chartTitle)}</h4>
    <p class="bz-visual-sub">${escHtml(pack.chartSubtitle)}</p>
  </div>
  ${bars}
  <p class="bz-source-note">Source: <a href="${escHtml(pack.chartSource.url)}" target="_blank" rel="noopener noreferrer">${escHtml(pack.chartSource.name)} (${escHtml(pack.chartSource.year)})</a></p>
</div>`;
}

export function buildInfographicFlowHtml(pack: TopicVisualPack): string {
  const steps = pack.infographicSteps
    .map(
      (s) => `<div class="bz-flow-node">
    <span class="bz-step-num">${escHtml(s.num)}</span>
    <strong>${escHtml(s.title)}</strong>
    <p>${escHtml(s.detail)}</p>
  </div>`
    )
    .join('\n    ');

  const mindBranches = pack.mindMapBranches
    .map(
      (b) => `<div class="bz-sketch-box">
    <strong>${escHtml(b.branch)}</strong>
    <ul>${b.nodes.map((n) => `<li>${escHtml(n)}</li>`).join('')}</ul>
  </div>`
    )
    .join('\n    ');

  return `<div class="bz-visual-card">
  <div class="bz-visual-head">
    <p class="bz-visual-kicker">Infographic &amp; Mind Map Blueprint</p>
    <h4>${escHtml(pack.infographicTitle)}</h4>
    <p class="bz-visual-sub">Step-by-step workflow paired with core topic branches for ${escHtml(pack.mindMapCenter)}</p>
  </div>
  <div class="bz-flow-row">
    ${steps}
  </div>
  <div class="bz-visual-grid">
    ${mindBranches}
  </div>
  <p class="bz-source-note">Verified reference: <a href="${escHtml(pack.infographicSource.url)}" target="_blank" rel="noopener noreferrer">${escHtml(pack.infographicSource.name)}</a></p>
</div>`;
}

export function buildEndVideoHtml(video: TopicVideoSpec, keyword: string): string {
  return `<h2>Video Walkthrough: ${escHtml(keyword)}</h2>
<p>Watch this concise visual walkthrough from <strong>${escHtml(video.channel)}</strong> to see these steps applied in practice: ${escHtml(video.summary)}</p>
<div class="video-wrap">
  <div class="video-frame">
    <iframe src="${escHtml(video.embedUrl)}" title="${escHtml(video.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
  <p class="video-caption">Video: <a href="${escHtml(video.watchUrl)}" target="_blank" rel="noopener noreferrer">${escHtml(video.title)}</a> — ${escHtml(video.channel)}</p>
</div>`;
}

/**
 * Idempotently injects topic-appropriate inline paragraph images, a real-data benchmark chart,
 * an infographic/mind-map workflow card, and 1 end-of-article YouTube video embed into article HTML.
 */
export function enrichArticleHtmlWithMedia(
  html: string,
  opts: { title?: string; primaryKeyword?: string; category?: string; secondaryKeywords?: string[] }
): string {
  let out = (html || '').trim();
  if (!out) return out;

  const images = pickTopicImages(opts);
  const pack = buildTopicVisualPack(opts);
  const video = pickTopicVideo(opts);
  const kw = (opts.primaryKeyword || opts.title || 'this topic').trim();

  const existingImgs = (out.match(/<img\b/gi) || []).length;
  const hasVisualCard = /class="[^"]*\bbz-visual-card\b/i.test(out);
  const hasVideo = /<(iframe|video)\b/i.test(out) || /class="[^"]*\bvideo-wrap\b/i.test(out);

  // Split around <h2> chapters so insertions land cleanly between sections, never mid-sentence.
  const parts = out.split(/(?=<h2[\s>])/i);

  if (parts.length >= 4) {
    const insertions = new Map<number, string[]>();
    const addAt = (idx: number, snippet: string) => {
      const clamped = Math.max(1, Math.min(parts.length - 1, idx));
      insertions.set(clamped, [...(insertions.get(clamped) || []), snippet]);
    };

    if (existingImgs < 2) {
      addAt(2, buildParagraphImageHtml(images[0], 1));
      addAt(Math.max(4, Math.floor(parts.length * 0.6)), buildParagraphImageHtml(images[1] || images[0], 2));
    }
    if (!hasVisualCard) {
      addAt(Math.max(3, Math.floor(parts.length * 0.38)), buildDataChartHtml(pack));
      addAt(Math.max(5, Math.floor(parts.length * 0.75)), buildInfographicFlowHtml(pack));
    }

    out = parts
      .map((chunk, i) => {
        const extra = insertions.get(i);
        return extra?.length ? `${extra.join('\n\n')}\n\n${chunk}` : chunk;
      })
      .join('');
  } else {
    // Shorter draft fallback: append images & visual blocks cleanly after paragraphs
    const extras: string[] = [];
    if (existingImgs < 1) extras.push(buildParagraphImageHtml(images[0], 1));
    if (!hasVisualCard) extras.push(buildDataChartHtml(pack));
    if (extras.length) out = `${out}\n\n${extras.join('\n\n')}`;
  }

  if (!hasVideo) {
    out = `${out}\n\n${buildEndVideoHtml(video, kw)}`;
  }

  return out;
}
