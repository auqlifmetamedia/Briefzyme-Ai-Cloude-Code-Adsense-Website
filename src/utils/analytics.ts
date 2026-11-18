export const GA_CONFIG = {
  streamId: '16361244528',
  measurementId: 'G-QHZB8V4TXG',
  gtmId: 'GTM-P8SMG3L3',
} as const;

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export interface TrackPageViewPayload {
  path: string;
  title: string;
  category?: string;
  articleSlug?: string;
}

const SESSION_KEY = 'briefzy_ga_sid';

export function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `bz-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    return `bz-${Date.now().toString(36)}`;
  }
}

function detectDevice(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function detectReferrerContext(): {
  referrerHost: string;
  trafficSource: 'google_organic' | 'search' | 'social' | 'referral' | 'direct';
  searchTerm: string;
} {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return { referrerHost: '', trafficSource: 'direct', searchTerm: '' };
  }
  const params = new URLSearchParams(window.location.search);
  const utmSource = (params.get('utm_source') || '').toLowerCase();
  const queryParam = params.get('q') || params.get('s') || '';
  const ref = document.referrer || '';

  let referrerHost = '';
  if (ref) {
    try {
      const u = new URL(ref);
      if (u.hostname !== window.location.hostname) {
        referrerHost = u.hostname.replace(/^www\./, '');
      }
    } catch {
      referrerHost = '';
    }
  }

  const hostLower = referrerHost.toLowerCase();
  let trafficSource: 'google_organic' | 'search' | 'social' | 'referral' | 'direct' = 'direct';

  if (hostLower.includes('google.') || utmSource === 'google') {
    trafficSource = 'google_organic';
  } else if (/bing\.|duckduckgo\.|yahoo\.|ecosia\.|perplexity\.ai|chatgpt\.com|claude\.ai/.test(hostLower)) {
    trafficSource = 'search';
  } else if (/facebook\.|instagram\.|linkedin\.|t\.co|twitter\.|x\.com|reddit\.|youtube\.com|pinterest\./.test(hostLower)) {
    trafficSource = 'social';
  } else if (referrerHost || utmSource) {
    trafficSource = 'referral';
  }

  return {
    referrerHost: referrerHost || (utmSource ? `utm:${utmSource}` : 'direct'),
    trafficSource,
    searchTerm: queryParam.trim().slice(0, 120),
  };
}

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

export function trackPageView(payload: TrackPageViewPayload): void {
  if (typeof window === 'undefined') return;
  const fullUrl = window.location.origin + payload.path + window.location.search;
  const sessionId = getOrCreateSessionId();
  const refCtx = detectReferrerContext();
  const timezone = getTimezone();
  const language = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';
  const device = detectDevice();

  // 1. Dispatch to Google Analytics 4 (G-QHZB8V4TXG) & GTM dataLayer (GTM-P8SMG3L3)
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      send_to: GA_CONFIG.measurementId,
      page_title: payload.title,
      page_location: fullUrl,
      page_path: payload.path,
      content_group: payload.category || 'Editorial',
      stream_id: GA_CONFIG.streamId,
    });
  }
  window.dataLayer.push({
    event: 'briefzy_page_view',
    page_path: payload.path,
    page_title: payload.title,
    content_group: payload.category || 'Editorial',
    ga_measurement_id: GA_CONFIG.measurementId,
    ga_stream_id: GA_CONFIG.streamId,
    gtm_container_id: GA_CONFIG.gtmId,
    traffic_source: refCtx.trafficSource,
  });

  // 2. Persist real visitor beacon to Briefzy Analytics API
  const body = JSON.stringify({
    type: 'pageview',
    sessionId,
    path: payload.path,
    title: payload.title,
    category: payload.category || 'General',
    articleSlug: payload.articleSlug || '',
    referrerHost: refCtx.referrerHost,
    trafficSource: refCtx.trafficSource,
    searchTerm: refCtx.searchTerm,
    timezone,
    language,
    device,
  });

  try {
    fetch('/api/analytics/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Non-blocking telemetry
  }
}

export function sendAnalyticsHeartbeat(payload: { path: string; title: string; category?: string }): void {
  if (typeof window === 'undefined' || document.visibilityState !== 'visible') return;
  const sessionId = getOrCreateSessionId();
  const refCtx = detectReferrerContext();
  try {
    fetch('/api/analytics/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'heartbeat',
        sessionId,
        path: payload.path,
        title: payload.title,
        category: payload.category || 'General',
        referrerHost: refCtx.referrerHost,
        trafficSource: refCtx.trafficSource,
        timezone: getTimezone(),
        language: typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US',
        device: detectDevice(),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ignore transient errors
  }
}

export function getClientTagStatus(): {
  gtagReady: boolean;
  dataLayerCount: number;
  recentEvents: Array<{ event: string; page_path?: string; content_group?: string }>;
} {
  if (typeof window === 'undefined') {
    return { gtagReady: false, dataLayerCount: 0, recentEvents: [] };
  }
  const dl = Array.isArray(window.dataLayer) ? window.dataLayer : [];
  const recentEvents: Array<{ event: string; page_path?: string; content_group?: string }> = [];
  for (let i = dl.length - 1; i >= 0 && recentEvents.length < 8; i--) {
    const item = dl[i];
    if (item && typeof item === 'object' && !Array.isArray(item) && item.event) {
      recentEvents.push({
        event: String(item.event),
        page_path: item.page_path ? String(item.page_path) : undefined,
        content_group: item.content_group ? String(item.content_group) : undefined,
      });
    } else if (item && typeof item[0] === 'string' && item[0] === 'event') {
      recentEvents.push({
        event: String(item[1] || 'gtag_event'),
        page_path: item[2]?.page_path ? String(item[2].page_path) : undefined,
        content_group: item[2]?.content_group ? String(item[2].content_group) : undefined,
      });
    }
  }
  return {
    gtagReady: typeof window.gtag === 'function' && dl.length > 0,
    dataLayerCount: dl.length,
    recentEvents,
  };
}
