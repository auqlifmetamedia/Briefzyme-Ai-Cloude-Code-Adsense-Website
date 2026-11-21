import type { ArticleVisualizationData } from '../types.ts';

export type TopicDomain =
  | 'ai-prompts'
  | 'phishing-scam'
  | 'passwords-2fa'
  | 'backup-storage'
  | 'wifi-network'
  | 'pc-speed'
  | 'home-office'
  | 'remote-team'
  | 'burnout-focus'
  | 'freelance-web'
  | 'general';

export interface DomainPalette {
  domain: TopicDomain;
  label: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
  accentSoft: string;
  highlight: string;
  sceneHint: string;
  diagramType: ArticleVisualizationData['type'];
}

const DOMAIN_PALETTES: Record<TopicDomain, DomainPalette> = {
  'ai-prompts': {
    domain: 'ai-prompts',
    label: 'AI Workflow & Prompt Craft',
    bgStart: '#1e1b4b',
    bgEnd: '#0f172a',
    accent: '#818cf8',
    accentSoft: '#312e81',
    highlight: '#38bdf8',
    sceneHint: 'clean modern desk with dual-pane document editor showing structured prompt blocks, warm ambient desk lamp, editorial photography',
    diagramType: 'workflow',
  },
  'phishing-scam': {
    domain: 'phishing-scam',
    label: 'Email & Threat Verification',
    bgStart: '#1e293b',
    bgEnd: '#090d16',
    accent: '#fbbf24',
    accentSoft: '#78350f',
    highlight: '#f87171',
    sceneHint: 'crisp studio composition showing email inbox verification shield, magnifying lens inspecting sender domain and padlock icon, editorial tech photography',
    diagramType: 'checklist',
  },
  'passwords-2fa': {
    domain: 'passwords-2fa',
    label: 'Identity & Vault Protection',
    bgStart: '#064e3b',
    bgEnd: '#0f172a',
    accent: '#34d399',
    accentSoft: '#065f46',
    highlight: '#2dd4bf',
    sceneHint: 'minimalist brass and anodized aluminum hardware security key beside laptop keyboard with subtle green verification glow, shallow depth of field',
    diagramType: 'architecture',
  },
  'backup-storage': {
    domain: 'backup-storage',
    label: '3-2-1 Backup & Recovery',
    bgStart: '#0c4a6e',
    bgEnd: '#0f172a',
    accent: '#38bdf8',
    accentSoft: '#075985',
    highlight: '#a5f3fc',
    sceneHint: 'sleek portable NVMe external SSD connected with braided USB-C cable next to a laptop and calm cloud sync indicators on wooden desk',
    diagramType: 'architecture',
  },
  'wifi-network': {
    domain: 'wifi-network',
    label: 'Home Network & Privacy',
    bgStart: '#172554',
    bgEnd: '#090d16',
    accent: '#60a5fa',
    accentSoft: '#1e3a8a',
    highlight: '#22d3ee',
    sceneHint: 'modern minimalist wireless router on matte walnut shelf with soft encrypted signal waves and clean fiber cable, natural daylight',
    diagramType: 'architecture',
  },
  'pc-speed': {
    domain: 'pc-speed',
    label: 'System Health & Performance',
    bgStart: '#1e293b',
    bgEnd: '#020617',
    accent: '#22d3ee',
    accentSoft: '#164e63',
    highlight: '#4ade80',
    sceneHint: 'clean overhead workspace with open ultralight laptop showing uncluttered resource monitor and organized desktop folders, bright natural lighting',
    diagramType: 'comparison',
  },
  'home-office': {
    domain: 'home-office',
    label: 'Ergonomic Desk & Studio',
    bgStart: '#292524',
    bgEnd: '#0f172a',
    accent: '#f59e0b',
    accentSoft: '#78350f',
    highlight: '#fde68a',
    sceneHint: 'warm Scandinavian home office desk at eye level monitor height, ergonomic chair, mechanical keyboard, warm key light and indoor plant',
    diagramType: 'comparison',
  },
  'remote-team': {
    domain: 'remote-team',
    label: 'Async Remote Collaboration',
    bgStart: '#312e81',
    bgEnd: '#0f172a',
    accent: '#a78bfa',
    accentSoft: '#4c1d95',
    highlight: '#38bdf8',
    sceneHint: 'person working peacefully at sunlit window desk reviewing shared project timeline across timezones with coffee mug and notebook',
    diagramType: 'workflow',
  },
  'burnout-focus': {
    domain: 'burnout-focus',
    label: 'Sustainable Focus & Boundaries',
    bgStart: '#134e4a',
    bgEnd: '#0f172a',
    accent: '#2dd4bf',
    accentSoft: '#115e59',
    highlight: '#fbbf24',
    sceneHint: 'calm afternoon desk with closed laptop, analog timer, handwritten priority notebook and warm tea by sunny window, editorial lifestyle photography',
    diagramType: 'workflow',
  },
  'freelance-web': {
    domain: 'freelance-web',
    label: 'Independent Creator Toolkit',
    bgStart: '#3b0764',
    bgEnd: '#0f172a',
    accent: '#c084fc',
    accentSoft: '#581c87',
    highlight: '#38bdf8',
    sceneHint: 'independent designer desk with clean portfolio wireframe on ultrawide screen, sketchbook, coffee cup, natural studio lighting',
    diagramType: 'comparison',
  },
  general: {
    domain: 'general',
    label: 'Briefzy Practical Guide',
    bgStart: '#1e293b',
    bgEnd: '#0f172a',
    accent: '#6366f1',
    accentSoft: '#312e81',
    highlight: '#22d3ee',
    sceneHint: 'clean minimalist workspace with notebook, laptop and practical diagram cards in natural daylight, editorial photography',
    diagramType: 'workflow',
  },
};

export function detectTopicDomain(text: string, category = ''): TopicDomain {
  const hay = `${text} ${category}`.toLowerCase();

  if (/\b(phish\w*|scam\w*|fraud\w*|spoof\w*|smish\w*|suspicious email|spam link|social engineering|malware|ransomware|breach|data leak)\b/.test(hay)) {
    return 'phishing-scam';
  }
  if (/\b(password\w*|passkey\w*|2fa|two-factor|mfa|authenticator|bitwarden|1password|credential\w*|vault|login security)\b/.test(hay)) {
    return 'passwords-2fa';
  }
  if (/\b(backup\w*|back up|3-2-1|time machine|icloud|google drive|onedrive|external drive|hard drive|recover\w*|restore|snapshot\w*)\b/.test(hay)) {
    return 'backup-storage';
  }
  if (/\b(wi-?fi|router\w*|vpn|dns|wpa3|firewall|mesh|network\w*|public wi-?fi|isp|internet privacy|browser privacy|tracker\w*|cookie\w*)\b/.test(hay)) {
    return 'wifi-network';
  }
  if (/\b(slow computer|speed up|startup|ram|ssd|disk space|battery|storage full|lagging|mac|windows 11|windows 10|pc health|cache)\b/.test(hay)) {
    return 'pc-speed';
  }
  if (/\b(home office|desk|ergonom\w*|chair|monitor|webcam|microphone|lighting|standing desk|workspace|headphone\w*|keyboard)\b/.test(hay)) {
    return 'home-office';
  }
  if (/\b(burnout|work-life|work life|boundar\w*|pomodoro|deep work|focus|overwork|disconnect|unplug|stress)\b/.test(hay)) {
    return 'burnout-focus';
  }
  if (/\b(remote work|remote team|async|asynchronous|time zone|timezone|zoom|slack|standup|distributed|work from home|wfh)\b/.test(hay)) {
    return 'remote-team';
  }
  if (/\b(freelanc\w*|portfolio|invoic\w*|client\w*|side hustle|website|no-code|notion|obsidian|spreadsheet|excel|calendar)\b/.test(hay)) {
    return 'freelance-web';
  }
  if (/\b(ai|prompt\w*|chatgpt|claude|gemini|copilot|llm|automat\w*|writing tool|meeting notes|summariz\w*)\b/.test(hay)) {
    return 'ai-prompts';
  }

  const cat = category.toLowerCase();
  if (cat.includes('security')) return 'passwords-2fa';
  if (cat.includes('remote')) return 'home-office';
  if (cat.includes('how-to') || cat.includes('tech')) return 'pc-speed';
  if (cat.includes('ai') || cat.includes('productivity')) return 'ai-prompts';
  return 'general';
}

export function getDomainPalette(text: string, category = ''): DomainPalette {
  return DOMAIN_PALETTES[detectTopicDomain(text, category)];
}

export function buildTopicImagePrompt(opts: {
  prompt?: string;
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
  visualStyle?: 'editorial-scene' | 'visual-diagram' | 'workspace-photo' | 'flat-illustration';
}): string {
  const title = (opts.title || '').trim();
  const topic = (opts.topic || '').trim();
  const keyword = (opts.keyword || '').trim();
  const category = (opts.category || '').trim();
  const rawPrompt = (opts.prompt || '').trim();

  const subject = title || topic || keyword || rawPrompt || 'Practical technology guide';
  const contextText = `${subject} ${topic} ${keyword} ${rawPrompt}`;
  const palette = getDomainPalette(contextText, category);

  const isCustomPrompt =
    rawPrompt.length > 12 &&
    !rawPrompt.toLowerCase().includes('futuristic enterprise ai neural network') &&
    !rawPrompt.toLowerCase().includes('abstract neural network architecture');

  const styleClause =
    opts.visualStyle === 'visual-diagram'
      ? 'Clean, modern flat vector editorial infographic illustration, clear visual metaphor, well-balanced geometry, high contrast, subtle grid background, NO garbled or unreadable text.'
      : opts.visualStyle === 'flat-illustration'
      ? 'Warm contemporary editorial vector illustration in high resolution, crisp shapes, tactile paper-grain lighting, no text overlays.'
      : opts.visualStyle === 'workspace-photo'
      ? 'Authentic documentary-style natural-light photograph, 35mm lens, shallow depth of field, realistic textures, no overlaid text or logos.'
      : 'Editorial magazine header visual, realistic lighting, crisp focal point, generous breathing room, no watermarks or cluttered text.';

  const keywordNote = keyword && !subject.toLowerCase().includes(keyword.toLowerCase())
    ? ` Key concept: "${keyword}".`
    : '';

  if (isCustomPrompt) {
    return `${rawPrompt}. Directly illustrating "${subject}"${category ? ` (${category})` : ''}.${keywordNote} Visual direction: ${palette.sceneHint}. ${styleClause}`;
  }

  return `Create a tailored editorial cover visual specifically illustrating "${subject}"${category ? ` for the ${category} section` : ''}.${keywordNote} Scene direction: ${palette.sceneHint}. ${styleClause}`;
}

export function buildTopicAltText(opts: {
  prompt?: string;
  title?: string;
  keyword?: string;
  category?: string;
}): string {
  const title = (opts.title || '').trim();
  const keyword = (opts.keyword || '').trim();
  const category = (opts.category || '').trim();
  const prompt = (opts.prompt || '').trim();

  if (title && keyword) {
    return `${title} — visual guide covering ${keyword}`;
  }
  if (title) {
    return `${title}${category ? ` (${category} editorial visual)` : ' editorial visual'}`;
  }
  if (prompt) {
    const clean = prompt
      .replace(/^(create|generate|design)\s+(an?\s+)?/i, '')
      .split(/[.;]/)[0]
      .trim();
    if (clean) return clean.slice(0, 140);
  }
  return keyword ? `Visual diagram and editorial illustration for ${keyword}` : 'Editorial illustration for practical guide';
}

export function buildTopicStudioPresets(opts: {
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
}) {
  const subject = (opts.title || opts.topic || opts.keyword || 'this practical guide').trim();
  const kw = (opts.keyword || opts.topic || 'step-by-step workflow').trim();
  const cat = (opts.category || 'Practical Guide').trim();
  const palette = getDomainPalette(`${subject} ${kw}`, cat);

  return {
    createPresets: [
      {
        label: 'Topic Hero Scene',
        style: 'editorial-scene' as const,
        prompt: `Editorial cover photograph illustrating "${subject}" with ${palette.sceneHint}, natural studio lighting, clean focal point`,
      },
      {
        label: 'Concept Diagram',
        style: 'visual-diagram' as const,
        prompt: `Clean modern vector infographic diagram visually explaining "${kw}" (${cat}), structured cards and directional arrows, no unreadable text`,
      },
      {
        label: 'Real Workspace View',
        style: 'workspace-photo' as const,
        prompt: `Authentic everyday workspace photograph demonstrating "${subject}", crisp 35mm depth of field, warm ambient light`,
      },
      {
        label: 'Minimalist Vector',
        style: 'flat-illustration' as const,
        prompt: `Clean geometric editorial illustration symbolizing "${kw}" with palette ${palette.accent} and ${palette.highlight}, balanced composition`,
      },
    ],
    editPresets: [
      {
        label: 'Cleaner Bright Desk',
        prompt: `Refine lighting to warm natural morning daylight and keep the composition clean and uncluttered for "${subject}"`,
      },
      {
        label: 'Editorial Warm Tone',
        prompt: `Apply balanced editorial color grading with subtle contrast tuned to a ${cat} magazine feature`,
      },
      {
        label: 'Remove Clutter',
        prompt: `Remove background distractions so the main subject representing "${kw}" stands out sharply`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Topic-adaptive SVG artwork & diagram synthesizer (replaces generic circles)
// ---------------------------------------------------------------------------

function escSvg(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + ' ' + w).length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;:\s]*$/, '') + '...';
  }
  return lines.length ? lines : ['Practical Visual Guide'];
}

function renderDomainArtwork(domain: TopicDomain, palette: DomainPalette, cx: number, cy: number): string {
  const { accent, highlight, accentSoft } = palette;

  switch (domain) {
    case 'phishing-scam':
      return `
        <g transform="translate(${cx - 170}, ${cy - 115})">
          <rect x="0" y="18" width="300" height="190" rx="18" fill="#0f172a" stroke="${accent}" stroke-width="2" stroke-opacity="0.6"/>
          <path d="M0 36 L150 125 L300 36" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.55"/>
          <rect x="26" y="42" width="140" height="14" rx="7" fill="${accentSoft}"/>
          <rect x="26" y="68" width="210" height="10" rx="5" fill="#334155"/>
          <rect x="26" y="88" width="175" height="10" rx="5" fill="#334155"/>
          <g transform="translate(215, -6)">
            <path d="M55 0 L108 22 V66 C108 105 84 134 55 148 C26 134 2 105 2 66 V22 Z" fill="#1e293b" stroke="${accent}" stroke-width="3"/>
            <path d="M34 72 L49 88 L80 52" fill="none" stroke="#34d399" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <rect x="26" y="148" width="180" height="32" rx="10" fill="${highlight}" fill-opacity="0.16" stroke="${highlight}" stroke-opacity="0.5"/>
          <text x="42" y="169" fill="${highlight}" font-family="system-ui,sans-serif" font-size="13" font-weight="700">DOMAIN CHECK: VERIFIED</text>
        </g>`;

    case 'passwords-2fa':
      return `
        <g transform="translate(${cx - 165}, ${cy - 115})">
          <rect x="20" y="20" width="280" height="185" rx="22" fill="#0f172a" stroke="${accent}" stroke-width="2" stroke-opacity="0.55"/>
          <rect x="46" y="54" width="228" height="44" rx="10" fill="#1e293b" stroke="${accent}" stroke-opacity="0.4"/>
          <circle cx="72" cy="76" r="6" fill="${accent}"/><circle cx="94" cy="76" r="6" fill="${accent}"/>
          <circle cx="116" cy="76" r="6" fill="${accent}"/><circle cx="138" cy="76" r="6" fill="${accent}"/>
          <circle cx="160" cy="76" r="6" fill="${highlight}"/><circle cx="182" cy="76" r="6" fill="${highlight}"/>
          <rect x="205" y="65" width="52" height="22" rx="6" fill="${accentSoft}"/>
          <text x="231" y="80" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="11" font-weight="700">2FA</text>
          <g transform="translate(115, 118)">
            <rect x="0" y="24" width="90" height="58" rx="12" fill="${accentSoft}" stroke="${accent}" stroke-width="2.5"/>
            <path d="M22 24 V14 C22 2 68 2 68 14 V24" fill="none" stroke="${accent}" stroke-width="4"/>
            <circle cx="45" cy="50" r="8" fill="${highlight}"/>
          </g>
        </g>`;

    case 'backup-storage':
      return `
        <g transform="translate(${cx - 175}, ${cy - 115})">
          <rect x="10" y="30" width="95" height="150" rx="14" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <rect x="26" y="52" width="63" height="14" rx="4" fill="${accentSoft}"/>
          <circle cx="57" cy="126" r="20" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2"/>
          <text x="57" y="164" text-anchor="middle" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="11" font-weight="700">LOCAL SSD</text>

          <path d="M108 105 H138" stroke="${highlight}" stroke-width="3" stroke-dasharray="5 4"/>
          <rect x="142" y="30" width="95" height="150" rx="14" fill="#0f172a" stroke="${highlight}" stroke-width="2"/>
          <rect x="158" y="55" width="63" height="18" rx="4" fill="#1e293b"/>
          <rect x="158" y="83" width="63" height="18" rx="4" fill="#1e293b"/>
          <rect x="158" y="111" width="63" height="18" rx="4" fill="#1e293b"/>
          <text x="189" y="164" text-anchor="middle" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="11" font-weight="700">EXTERNAL</text>

          <path d="M240 105 H270" stroke="${accent}" stroke-width="3" stroke-dasharray="5 4"/>
          <path d="M286 135 C270 135 266 112 282 104 C284 82 316 74 334 90 C350 92 356 120 340 135 Z" fill="${accentSoft}" stroke="${accent}" stroke-width="2.5"/>
          <text x="312" y="164" text-anchor="middle" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="11" font-weight="700">CLOUD SYNC</text>
        </g>`;

    case 'wifi-network':
      return `
        <g transform="translate(${cx - 170}, ${cy - 115})">
          <path d="M85 110 C125 65 215 65 255 110" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-opacity="0.4"/>
          <path d="M110 132 C138 100 202 100 230 132" fill="none" stroke="${highlight}" stroke-width="4" stroke-linecap="round" stroke-opacity="0.7"/>
          <path d="M136 154 C152 135 188 135 204 154" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
          <circle cx="170" cy="172" r="10" fill="${highlight}"/>
          <rect x="92" y="188" width="156" height="34" rx="10" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <circle cx="118" cy="205" r="5" fill="#34d399"/><circle cx="136" cy="205" r="5" fill="#38bdf8"/>
          <text x="200" y="209" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="700">WPA3 + DNS</text>
        </g>`;

    case 'pc-speed':
      return `
        <g transform="translate(${cx - 165}, ${cy - 115})">
          <rect x="10" y="16" width="310" height="190" rx="18" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <path d="M60 148 A75 75 0 0 1 210 148" fill="none" stroke="#334155" stroke-width="16" stroke-linecap="round"/>
          <path d="M60 148 A75 75 0 0 1 190 95" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
          <line x1="135" y1="148" x2="180" y2="96" stroke="${highlight}" stroke-width="5" stroke-linecap="round"/>
          <circle cx="135" cy="148" r="9" fill="${highlight}"/>
          <rect x="232" y="52" width="64" height="22" rx="6" fill="${accentSoft}"/><text x="264" y="67" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="11" font-weight="700">SSD</text>
          <rect x="232" y="88" width="64" height="22" rx="6" fill="${accentSoft}"/><text x="264" y="103" text-anchor="middle" fill="${highlight}" font-family="monospace" font-size="11" font-weight="700">RAM</text>
          <rect x="232" y="124" width="64" height="22" rx="6" fill="${accentSoft}"/><text x="264" y="139" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="700">BOOT</text>
        </g>`;

    case 'home-office':
      return `
        <g transform="translate(${cx - 170}, ${cy - 115})">
          <rect x="70" y="20" width="200" height="120" rx="12" fill="#0f172a" stroke="${accent}" stroke-width="3"/>
          <rect x="86" y="36" width="168" height="88" rx="6" fill="#1e293b"/>
          <rect x="102" y="52" width="84" height="12" rx="4" fill="${accent}" fill-opacity="0.7"/>
          <rect x="102" y="74" width="132" height="8" rx="4" fill="#475569"/>
          <rect x="102" y="90" width="110" height="8" rx="4" fill="#475569"/>
          <rect x="155" y="140" width="30" height="26" fill="#64748b"/>
          <rect x="122" y="166" width="96" height="10" rx="5" fill="#94a3b8"/>
          <rect x="22" y="178" width="296" height="16" rx="8" fill="${accentSoft}" stroke="${accent}" stroke-opacity="0.6"/>
          <circle cx="48" cy="144" r="22" fill="${highlight}" fill-opacity="0.22" stroke="${highlight}" stroke-width="2"/>
          <rect x="264" y="142" width="28" height="36" rx="6" fill="#334155" stroke="${accent}" stroke-opacity="0.5"/>
        </g>`;

    case 'remote-team':
    case 'burnout-focus':
      return `
        <g transform="translate(${cx - 170}, ${cy - 115})">
          <rect x="14" y="20" width="312" height="186" rx="18" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <rect x="34" y="44" width="128" height="58" rx="10" fill="${accentSoft}" stroke="${accent}" stroke-opacity="0.6"/>
          <text x="50" y="68" fill="${accent}" font-family="system-ui,sans-serif" font-size="11" font-weight="700">DEEP FOCUS</text>
          <rect x="50" y="80" width="86" height="8" rx="4" fill="${highlight}"/>
          <rect x="178" y="44" width="128" height="58" rx="10" fill="#1e293b" stroke="${highlight}" stroke-opacity="0.5"/>
          <text x="194" y="68" fill="${highlight}" font-family="system-ui,sans-serif" font-size="11" font-weight="700">ASYNC SYNC</text>
          <rect x="194" y="80" width="76" height="8" rx="4" fill="#64748b"/>
          <rect x="34" y="118" width="272" height="62" rx="10" fill="#1e293b"/>
          <circle cx="66" cy="149" r="14" fill="${accent}"/><circle cx="170" cy="149" r="14" fill="${highlight}"/><circle cx="274" cy="149" r="14" fill="#34d399"/>
          <line x1="82" y1="149" x2="154" y2="149" stroke="#64748b" stroke-width="3" stroke-dasharray="5 4"/>
          <line x1="186" y1="149" x2="258" y2="149" stroke="#64748b" stroke-width="3" stroke-dasharray="5 4"/>
        </g>`;

    default:
      // ai-prompts, freelance-web, general
      return `
        <g transform="translate(${cx - 170}, ${cy - 115})">
          <rect x="10" y="24" width="90" height="160" rx="14" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <text x="55" y="54" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="11" font-weight="700">INPUT</text>
          <rect x="26" y="74" width="58" height="10" rx="5" fill="${accentSoft}"/>
          <rect x="26" y="94" width="46" height="10" rx="5" fill="#334155"/>
          <rect x="26" y="114" width="52" height="10" rx="5" fill="#334155"/>

          <path d="M104 104 H126" stroke="${highlight}" stroke-width="3"/>
          <rect x="130" y="24" width="90" height="160" rx="14" fill="#1e293b" stroke="${highlight}" stroke-width="2"/>
          <text x="175" y="54" text-anchor="middle" fill="${highlight}" font-family="monospace" font-size="11" font-weight="700">PROCESS</text>
          <circle cx="175" cy="112" r="28" fill="${accentSoft}" stroke="${highlight}" stroke-width="2.5"/>
          <path d="M164 112 L173 121 L189 102" fill="none" stroke="${highlight}" stroke-width="4" stroke-linecap="round"/>

          <path d="M224 104 H246" stroke="${accent}" stroke-width="3"/>
          <rect x="250" y="24" width="90" height="160" rx="14" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <text x="295" y="54" text-anchor="middle" fill="#34d399" font-family="monospace" font-size="11" font-weight="700">RESULT</text>
          <rect x="266" y="74" width="58" height="24" rx="6" fill="#065f46"/>
          <rect x="266" y="110" width="58" height="10" rx="5" fill="#334155"/>
          <rect x="266" y="130" width="44" height="10" rx="5" fill="#334155"/>
        </g>`;
  }
}

export function generateTopicVisualSvg(opts: {
  prompt?: string;
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
  aspectRatio?: string;
  styleMode?: 'editorial-scene' | 'visual-diagram' | 'workspace-photo' | 'flat-illustration';
}): string {
  const aspectRatio = opts.aspectRatio || '16:9';
  const [rw, rh] = aspectRatio.split(':').map(Number);
  const w = 1280;
  const h = Math.round(w * ((rh || 9) / (rw || 16)));
  const subject = (opts.title || opts.topic || opts.keyword || opts.prompt || 'Practical Guide').trim();
  const primaryContext = `${opts.title || ''} ${opts.topic || ''} ${opts.keyword || ''}`.trim();
  const palette = getDomainPalette(primaryContext || opts.prompt || '', opts.category || '');

  const badge = escSvg((opts.category || palette.label).toUpperCase());
  const titleLines = wrapLines(subject, 30, 3);
  const subLabel = escSvg(
    opts.keyword
      ? `Focus: ${opts.keyword.slice(0, 48)}`
      : palette.label
  );

  const isTall = h >= w;
  const artCx = isTall ? Math.round(w * 0.5) : Math.round(w * 0.74);
  const artCy = isTall ? Math.round(h * 0.66) : Math.round(h * 0.52);
  const textX = 88;
  const titleStartY = isTall ? 175 : Math.max(210, Math.round(h * 0.36));

  const titleSvg = titleLines
    .map(
      (line, idx) =>
        `<text x="${textX}" y="${titleStartY + idx * 54}" fill="#ffffff" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="42" font-weight="800" letter-spacing="-0.02em">${escSvg(line)}</text>`
    )
    .join('\n  ');

  const artwork = renderDomainArtwork(palette.domain, palette, artCx, artCy);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bgStart}"/>
      <stop offset="100%" stop-color="${palette.bgEnd}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${isTall ? 0.5 : 0.75}" cy="${isTall ? 0.65 : 0.5}" r="0.55">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${palette.bgEnd}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <rect x="44" y="44" width="${w - 88}" height="${h - 88}" rx="28" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="1.5"/>

  <rect x="${textX}" y="${titleStartY - 82}" width="${Math.min(380, Math.max(190, badge.length * 10 + 40))}" height="34" rx="17" fill="${palette.accentSoft}" stroke="${palette.accent}" stroke-opacity="0.65"/>
  <text x="${textX + 20}" y="${titleStartY - 60}" fill="${palette.highlight}" font-family="system-ui,-apple-system,sans-serif" font-size="13" font-weight="800" letter-spacing="0.08em">${badge}</text>

  ${titleSvg}

  <line x1="${textX}" y1="${titleStartY + titleLines.length * 54 + 6}" x2="${textX + 120}" y2="${titleStartY + titleLines.length * 54 + 6}" stroke="${palette.highlight}" stroke-width="4" stroke-linecap="round"/>
  <text x="${textX}" y="${titleStartY + titleLines.length * 54 + 38}" fill="#94a3b8" font-family="system-ui,-apple-system,sans-serif" font-size="20" font-weight="500">${subLabel}</text>

  ${artwork}

  <text x="${textX}" y="${h - 74}" fill="#64748b" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="700" letter-spacing="0.12em">BRIEFZY EDITORIAL VISUAL</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// Topic-matched interactive article visualization extractor
// ---------------------------------------------------------------------------

function stripHtmlTags(s: string): string {
  return (s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function deriveArticleVisualization(article: {
  title?: string;
  category?: string;
  primaryKeyword?: string;
  content?: string;
  keyTakeaways?: string[];
}): ArticleVisualizationData {
  const title = (article.title || 'Practical Workflow Guide').trim();
  const category = (article.category || 'Productivity & AI Tools').trim();
  const keyword = (article.primaryKeyword || title).trim();
  const content = article.content || '';
  const palette = getDomainPalette(`${title} ${keyword} ${content.slice(0, 400)}`, category);

  // Extract real H2 chapters (ignore closing/summary headings)
  const h2Matches = Array.from(content.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi))
    .map((m) => stripHtmlTags(m[1]).replace(/^\d+[.)]\s*/, '').trim())
    .filter((h) => h && !/^(final recommendations|next steps|conclusion|related|sources)/i.test(h));

  // Extract first sentence of paragraph right after each H2 if available
  const sectionSnippets: Record<string, string> = {};
  const chunks = content.split(/(?=<h2[\s>])/i);
  for (const ch of chunks) {
    const hm = ch.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (!hm) continue;
    const hText = stripHtmlTags(hm[1]).replace(/^\d+[.)]\s*/, '').trim();
    const pm = ch.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (pm) {
      const firstSentence = stripHtmlTags(pm[1]).split(/(?<=[.!?])\s+/)[0] || '';
      if (firstSentence.length > 20) {
        sectionSnippets[hText] = firstSentence.slice(0, 170);
      }
    }
  }

  const takeaways = Array.isArray(article.keyTakeaways) ? article.keyTakeaways : [];
  const rawSteps = (h2Matches.length >= 3 ? h2Matches : takeaways.length >= 3 ? takeaways : [
    `Clarify your ${keyword} goal`,
    'Set up the baseline workflow',
    'Verify safety & quality checks',
    'Measure results and refine weekly',
  ]).slice(0, 5);

  const nodes = rawSteps.map((label, idx) => ({
    label: label.length > 52 ? label.slice(0, 49) + '...' : label,
    detail:
      sectionSnippets[label] ||
      takeaways[idx] ||
      `Apply "${label}" step-by-step to get reliable outcomes with ${keyword}.`,
    badge: `Step ${idx + 1}`,
  }));

  // Try extracting structured comparison rows from HTML tables inside the article
  const bars: { label: string; value: number; note?: string }[] = [];
  const tbodyHtml = content.match(/<tbody[\s\S]*?<\/tbody>/i)?.[0] || '';
  const rowMatches = tbodyHtml ? tbodyHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) : null;
  if (rowMatches) {
    let idx = 0;
    for (const tr of rowMatches) {
      const cells = Array.from(tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((c) => stripHtmlTags(c[1]));
      if (cells.length >= 2 && cells[0]) {
        const pctMatch = cells.join(' ').match(/(\d{1,3})\s*%/);
        const value = pctMatch ? Math.min(100, Math.max(25, Number(pctMatch[1]))) : Math.max(48, 92 - idx * 11);
        bars.push({
          label: cells[0].slice(0, 36),
          value,
          note: (cells[1] || cells[2] || '').slice(0, 72),
        });
        idx++;
        if (bars.length >= 5) break;
      }
    }
  }

  if (bars.length < 3) {
    bars.length = 0;
    nodes.slice(0, 4).forEach((n, idx) => {
      bars.push({
        label: n.label.slice(0, 36),
        value: Math.max(55, 95 - idx * 10),
        note: n.detail.slice(0, 72),
      });
    });
  }

  return {
    type: palette.diagramType,
    domain: palette.domain,
    title: `${title} — Visual Breakdown`,
    subtitle: `${palette.label} • ${nodes.length} actionable stages tailored to ${keyword}`,
    nodes,
    bars,
  };
}

// ---------------------------------------------------------------------------
// Clean YouTube tutorial query builder
// ---------------------------------------------------------------------------

export function buildYouTubeSearchQueries(opts: {
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
}): string[] {
  const title = (opts.title || '').trim();
  const topic = (opts.topic || '').trim();
  const keyword = (opts.keyword || '').trim();
  const category = (opts.category || '').trim();

  const cleanTitle = title
    .replace(/\b(202[0-9]|complete guide|step-by-step|benchmarks|practical roadmap)\b/gi, '')
    .replace(/[:|—–-].*$/, '')
    .trim();

  const q1 = [keyword || cleanTitle || topic, 'tutorial guide'].filter(Boolean).join(' ').trim();
  const q2 = [cleanTitle || topic, category ? category.split('&')[0].trim() : '', 'explained']
    .filter(Boolean)
    .join(' ')
    .trim();

  return Array.from(new Set([q1, q2].filter((q) => q.length >= 4)));
}

export function svgToDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}

