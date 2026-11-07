// Utility for Visitor BYOK (Bring Your Own Key) Gemini Integration
// 100% Client-Authoritative: Website Owner API is NEVER billed or accessed.

const VISITOR_KEY_STORAGE_KEY = 'briefzy_visitor_gemini_api_key';

export function getVisitorKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(VISITOR_KEY_STORAGE_KEY) || null;
}

export function hasVisitorKey(): boolean {
  const key = getVisitorKey();
  return !!key && key.trim().length > 5;
}

export function setVisitorKey(key: string): void {
  if (typeof window === 'undefined') return;
  const clean = key.trim();
  localStorage.setItem(VISITOR_KEY_STORAGE_KEY, clean);
  window.dispatchEvent(new CustomEvent('visitor_key_changed', { detail: { key: clean } }));
}

export function clearVisitorKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(VISITOR_KEY_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('visitor_key_changed', { detail: { key: null } }));
}

export async function testVisitorKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  try {
    const res = await fetch('/api/visitor/gemini/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-visitor-api-key': apiKey.trim(),
      },
    });
    const data = await res.json();
    if (!res.ok) {
      return { valid: false, message: data.message || data.error || 'Invalid API key.' };
    }
    return { valid: true, message: data.message || 'API key is valid!' };
  } catch (err: any) {
    return { valid: false, message: err?.message || 'Failed to connect to verification server.' };
  }
}

export async function callVisitorGemini(
  prompt: string,
  systemInstruction?: string
): Promise<{ text: string; error?: string }> {
  const key = getVisitorKey();
  if (!key) {
    return {
      text: '',
      error: 'NO_KEY_PROVIDED',
    };
  }

  try {
    const res = await fetch('/api/visitor/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-visitor-api-key': key.trim(),
      },
      body: JSON.stringify({ prompt, systemInstruction }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { text: '', error: data.error || 'Failed to generate AI response.' };
    }

    return { text: data.text || '' };
  } catch (err: any) {
    return { text: '', error: err?.message || 'Connection to AI service interrupted.' };
  }
}

// Clean HTML tags helper
export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// English Heuristic Podcast Script generator (Instant & 100% Free)
export function generateHeuristicPodcastScript(
  title: string,
  metaDescription: string,
  keyTakeaways: string[],
  content: string
): string {
  const plainText = stripHtml(content);
  const words = plainText.split(' ').slice(0, 180).join(' ');

  const takeawaysText =
    keyTakeaways && keyTakeaways.length > 0
      ? `Here are the critical takeaways you need to know: First, ${keyTakeaways[0]}. Second, ${
          keyTakeaways[1] || 'the strategic ripple effect across broader capital markets'
        }. Third, ${keyTakeaways[2] || 'practical operational resilience for executive leaders'}.`
      : `This investigative brief addresses the structural shifts reshaping market dynamics and boardroom decision-making.`;

  return `Welcome to the Briefzy Audio Briefing, your exclusive two-minute executive dispatch. I'm your synthetic broadcast narrator.

Today we're dissecting an essential analysis: ${title}.

${metaDescription}

Examining current ground-level benchmarks: ${words}...

${takeawaysText}

The executive bottom line: Decisive early execution remains the fundamental differentiator. Thank you for listening to the Briefzy Podcast Brief. Stay ahead of market curves with our next investigative briefing.`;
}

// English Multi-Lens Heuristic Content Generator
export function getHeuristicLensContent(
  lens: 'standard' | 'executive' | 'eli5' | 'deep_dive' | 'contrarian',
  article: {
    title: string;
    metaDescription: string;
    keyTakeaways: string[];
    content: string;
    primaryKeyword: string;
  }
): { title: string; subtitle: string; sections: { heading: string; body: string; badge?: string }[] } {
  const takeaways = article.keyTakeaways || [];

  if (lens === 'executive') {
    return {
      title: '⚡ Executive Lens: 60-Second Strategic Decision Memo',
      subtitle: 'Engineered specifically for C-suite executives, directors, and institutional investors requiring unvarnished intelligence.',
      sections: [
        {
          heading: '1. Strategic Bottom Line',
          body: takeaways[0] || `${article.title} mandates immediate tactical recalibration this quarter to solidify competitive moats.`,
          badge: 'Strategic Imperative',
        },
        {
          heading: '2. Financial & Operational Velocity',
          body: takeaways[1] || `Calculated efficiency gains project 15% to 28% operational cost containment for organizations executing this framework methodically.`,
          badge: 'Performance Metrics',
        },
        {
          heading: '3. Vulnerability Exposure & Mitigation',
          body: takeaways[2] || `Delayed execution compounds opportunity loss up to 3x relative to nimble first-movers in adjacent sectors.`,
          badge: 'Risk Mitigation',
        },
        {
          heading: '4. 30-Day Tactical Mandate',
          body: `Conduct internal readiness audits on ${article.primaryKeyword}, commission an agile cross-functional squad, and enforce quantifiable milestone benchmarks before month-end.`,
          badge: 'Actionable Next Step',
        },
      ],
    };
  }

  if (lens === 'eli5') {
    return {
      title: "🧸 ELI5 Lens: Explained Like I'm Five",
      subtitle: 'Straightforward, engaging analogies completely stripped of dizzying corporate jargon.',
      sections: [
        {
          heading: 'What is actually happening here?',
          body: `Imagine building a giant Lego castle in the school playground. This story explains how smart builders lock the foundation blocks together so the tower doesn't wobble when big gusts of wind blow!`,
          badge: 'Simple Analogy',
        },
        {
          heading: 'Why should anyone care?',
          body: `Because builders who understand this secret finish their castles twice as fast and get extra recess time, while others are still hunting for missing pieces on the floor.`,
          badge: 'Core Problem',
        },
        {
          heading: 'What is the big lesson?',
          body: `Always test your tools before building, don't be afraid to try a smarter plan, and fix tiny cracks before they turn into giant problems!`,
          badge: 'Key Takeaway',
        },
      ],
    };
  }

  if (lens === 'deep_dive') {
    return {
      title: '🔬 Deep Technical Lens: Architectural Deconstruction',
      subtitle: 'Rigorous methodological breakdown, fundamental mechanics, and macro-variable dependencies.',
      sections: [
        {
          heading: 'Architectural Framework & First Principles',
          body: `Systemic dynamics surrounding ${article.primaryKeyword} stem from next-generation algorithmic pipelines, sub-millisecond throughput demands, and multivariate data integrity constraints.`,
          badge: 'Architecture',
        },
        {
          heading: 'Empirical Benchmarking & Performance Vectors',
          body: `Cross-industry telemetry demonstrates that throughput friction drops precipitously when data silos are dismantled in favor of event-driven asynchronous execution.`,
          badge: 'Empirical Data',
        },
        {
          heading: 'Long-Horizon Scalability Constraints',
          body: `The primary bottleneck resides in non-linear degradation when query concurrency scales past 10x baseline volume. Decoupled micro-architectures mitigate cascading failovers.`,
          badge: 'Scalability',
        },
      ],
    };
  }

  if (lens === 'contrarian') {
    return {
      title: "⚖️ Contrarian Lens: Critical Vulnerabilities & Bear Case",
      subtitle: 'Scrutinizing unexamined premises, consensus blind spots, and worst-case scenario hazards.',
      sections: [
        {
          heading: 'Flawed Consensus Assumptions',
          body: `Prevailing analyst sentiment assumes adoption of ${article.primaryKeyword} yields linear upside. Historical field data indicates up to 40% of pilot rollouts stall on unmodeled overhead and organizational friction.`,
          badge: 'Consensus Critique',
        },
        {
          heading: 'Hidden Liabilities & Vendor Lock-In',
          body: `Monolithic commitments to single-paradigm architectures construct expensive egress traps and systemic fragility during abrupt macroeconomic shifts.`,
          badge: 'Blind Spot',
        },
        {
          heading: 'Bear Case Sizing',
          body: `Under aggressive regulatory enforcement or liquidity compression, over-leveraged deployments transition swiftly from strategic assets into substantial balance-sheet liabilities.`,
          badge: 'Bear Case',
        },
      ],
    };
  }

  return {
    title: 'Standard Format',
    subtitle: '',
    sections: [],
  };
}
