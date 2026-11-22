/**
 * Article enhancer for Briefzy — pure string processing (no DOM, no Node APIs), so it runs in the
 * browser editor, the Express dev server and the Cloudflare Worker alike.
 *
 *  - extractKeywords():      relevant keywords + LSI (semantically related) terms taken from the article itself
 *  - enhanceArticleHtml():   tidies the HTML like a professional site, bolds keywords the SEO way
 *                            (primary keyword: a few spread-out mentions; secondary/LSI: first mention only),
 *                            and adds contextual internal links
 *  - cleanPastedHtml():      strips the junk that arrives when text is pasted from Claude / ChatGPT / Google Docs / Word
 *  - keywordStats():         numbers for the live SEO status bar in the editor
 *
 * Every step is idempotent: running it twice on the same article gives the same result.
 */

// ---------------------------------------------------------------------------
// Tokenizer helpers
// ---------------------------------------------------------------------------

const TOKEN_RE = /(<!--[\s\S]*?-->|<\/?[a-zA-Z][a-zA-Z0-9:-]*(?:"[^"]*"|'[^']*'|[^>"'])*>)/g;
const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'col', 'source', 'wbr', 'area', 'base', 'embed', 'track', 'param']);
const SAFE_EMBED_RE = /^https:\/\/(?:www\.youtube\.com\/embed\/|www\.youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/|www\.loom\.com\/embed\/)/i;

const tokenize = (html: string): string[] => html.split(TOKEN_RE);
const isTag = (i: number) => i % 2 === 1;

interface ParsedTag {
  name: string;
  closing: boolean;
  selfClose: boolean;
  attrs: [string, string | null][];
}

function parseTag(tag: string): ParsedTag | null {
  const m = /^<(\/)?([a-zA-Z][a-zA-Z0-9:-]*)([\s\S]*?)(\/)?>$/.exec(tag);
  if (!m) return null;
  const name = m[2].toLowerCase();
  const attrs: [string, string | null][] = [];
  if (!m[1]) {
    const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let a: RegExpExecArray | null;
    while ((a = re.exec(m[3])) !== null) {
      const val = a[3] ?? a[4] ?? a[5] ?? null;
      attrs.push([a[1].toLowerCase(), val]);
    }
  }
  return { name, closing: !!m[1], selfClose: !!m[4] || VOID.has(name), attrs };
}

const escAttr = (v: string) => v.replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;').replace(/"/g, '&quot;');

function buildTag(name: string, attrs: [string, string | null][], selfClose = false): string {
  const a = attrs.map(([k, v]) => (v === null ? ` ${k}` : ` ${k}="${escAttr(v)}"`)).join('');
  return `<${name}${a}${selfClose || VOID.has(name) ? ' /' : ''}>`;
}

const getAttr = (p: ParsedTag, k: string) => p.attrs.find(([n]) => n === k)?.[1] ?? null;
function setAttr(p: ParsedTag, k: string, v: string | null) {
  const i = p.attrs.findIndex(([n]) => n === k);
  if (v === null) { if (i >= 0) p.attrs.splice(i, 1); return; }
  if (i >= 0) p.attrs[i][1] = v; else p.attrs.push([k, v]);
}

/** Keeps only the listed CSS properties of an inline style. */
function filterStyle(style: string, keep: Set<string>): string {
  return style
    .split(';')
    .map((d) => d.trim())
    .filter((d) => {
      const prop = d.split(':')[0]?.trim().toLowerCase();
      return prop && keep.has(prop);
    })
    .join('; ');
}

const SITE_HOSTS = ['briefzy.me', 'www.briefzy.me'];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const htmlToPlain = (html: string): string =>
  (html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

// Contexts in which we never bold a keyword or insert a link.
const NO_EMPHASIS = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'code', 'pre', 'kbd', 'mark', 'script', 'style', 'button', 'th', 'figcaption', 'textarea', 'select', 'option', 'iframe', 'video', 'svg', 'summary']);
const NO_LINKS = new Set([...NO_EMPHASIS, 'em', 'i', 'blockquote']);

class Ctx {
  private n: Record<string, number> = {};
  update(tag: string) {
    const p = parseTag(tag);
    if (!p || p.selfClose || tag.startsWith('<!--')) return;
    this.n[p.name] = Math.max(0, (this.n[p.name] || 0) + (p.closing ? -1 : 1));
  }
  blocked(set: Set<string>): boolean {
    for (const k of set) if (this.n[k] > 0) return true;
    return false;
  }
}

// ---------------------------------------------------------------------------
// Keyword matching + wrapping
// ---------------------------------------------------------------------------

function keywordRegex(kw: string): RegExp | null {
  const clean = (kw || '').trim().replace(/\s+/g, ' ');
  if (clean.length < 3) return null;
  const body = clean.split(' ').map(escapeRe).join('\\s+');
  const pluralOk = /[a-z]$/i.test(clean) && !/s$/i.test(clean);
  return new RegExp(`(?<![\\p{L}\\p{N}_-])(${body}${pluralOk ? '(?:e?s)?' : ''})(?![\\p{L}\\p{N}_-])`, 'giu');
}

interface Hit { ti: number; s: number; e: number; ratio: number }

function collectHits(tokens: string[], re: RegExp, blocked: Set<string>): Hit[] {
  let total = 0;
  tokens.forEach((t, i) => { if (!isTag(i)) total += t.length; });
  const hits: Hit[] = [];
  const ctx = new Ctx();
  let cum = 0;
  tokens.forEach((t, i) => {
    if (isTag(i)) { ctx.update(t); return; }
    if (t && !ctx.blocked(blocked)) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(t)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        hits.push({ ti: i, s: m.index, e: m.index + m[0].length, ratio: total ? (cum + m.index) / total : 0 });
      }
    }
    cum += t.length;
  });
  return hits;
}

function applyWrap(tokens: string[], picked: Hit[], wrap: (matched: string) => string): string {
  const byToken = new Map<number, Hit[]>();
  picked.forEach((h) => byToken.set(h.ti, [...(byToken.get(h.ti) || []), h]));
  byToken.forEach((list, ti) => {
    let text = tokens[ti];
    list.sort((a, b) => b.s - a.s).forEach((h) => {
      text = text.slice(0, h.s) + wrap(text.slice(h.s, h.e)) + text.slice(h.e);
    });
    tokens[ti] = text;
  });
  return tokens.join('');
}

/** Number of times `re` already appears inside <strong>/<b>. */
function boldCount(html: string, re: RegExp): number {
  let n = 0;
  const bold = /<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = bold.exec(html)) !== null) {
    re.lastIndex = 0;
    if (re.test(htmlToPlain(m[2]))) n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Public: keyword emphasis
// ---------------------------------------------------------------------------

export interface EmphasisOptions {
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  lsiKeywords?: string[];
  /** Max bold mentions of the primary keyword in the whole article. Default 3. */
  maxPrimaryBold?: number;
  /** Max total bold secondary/LSI terms. Default 12. */
  maxOtherBold?: number;
}

/**
 * SEO-style emphasis:
 *  - primary keyword: bolded at the first mention, then ~40% and ~75% into the article (max 3)
 *  - secondary + LSI keywords: first mention only, capped overall so the page never looks spammy
 * Text already inside <a>, headings, <strong>, <code> etc. is left alone.
 */
export function emphasizeKeywords(html: string, o: EmphasisOptions): { html: string; primary: number; others: number } {
  let out = html;
  let primary = 0;
  let others = 0;

  const pk = (o.primaryKeyword || '').trim();
  const pre = pk ? keywordRegex(pk) : null;
  if (pre) {
    const quota = Math.max(0, (o.maxPrimaryBold ?? 3) - boldCount(out, pre));
    if (quota > 0) {
      const tokens = tokenize(out);
      const hits = collectHits(tokens, pre, NO_EMPHASIS).sort((a, b) => a.ratio - b.ratio);
      const picked: Hit[] = [];
      const targets = [0, 0.4, 0.75];
      for (const t of targets) {
        if (picked.length >= quota) break;
        const h = hits.find((x) => x.ratio >= t && !picked.includes(x));
        if (h) picked.push(h);
      }
      if (picked.length) {
        out = applyWrap(tokens, picked, (m) => `<strong>${m}</strong>`);
        primary = picked.length;
      }
    }
  }

  const seen = new Set<string>(pk ? [pk.toLowerCase()] : []);
  const rest = [...(o.secondaryKeywords || []), ...(o.lsiKeywords || [])]
    .map((k) => k.trim())
    .filter((k) => k.length >= 3 && !seen.has(k.toLowerCase()) && (seen.add(k.toLowerCase()), true))
    .sort((a, b) => b.length - a.length); // longest first, so "remote work tools" wins over "remote work"

  let budget = o.maxOtherBold ?? 16;
  for (const kw of rest) {
    if (budget <= 0) break;
    const re = keywordRegex(kw);
    if (!re) continue;
    if (boldCount(out, re) > 0) { budget--; continue; }
    const tokens = tokenize(out);
    const hit = collectHits(tokens, re, NO_EMPHASIS)[0];
    if (!hit) continue;
    out = applyWrap(tokens, [hit], (m) => `<strong>${m}</strong>`);
    others++;
    budget--;
  }
  return { html: out, primary, others };
}

// ---------------------------------------------------------------------------
// Public: internal links
// ---------------------------------------------------------------------------

export interface InternalLinkTarget { keyword: string; url: string }

/** Links the first natural mention of other articles' keywords to those articles (max `max`, never twice to the same URL). */
export function addInternalLinks(html: string, targets: InternalLinkTarget[], max = 4): { html: string; added: number } {
  let out = html;
  let added = 0;
  const linked = new Set<string>();
  const hrefRe = /<a\b[^>]*\bhref="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  let existingInternal = 0;
  while ((m = hrefRe.exec(out)) !== null) {
    const h = m[1];
    if (h.startsWith('/') || SITE_HOSTS.includes(h.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].toLowerCase())) existingInternal++;
    linked.add(h.replace(/^https?:\/\/[^/]+/i, ''));
  }
  max = Math.max(0, max - existingInternal); // never pile up more links on repeated saves

  for (const t of targets) {
    if (added >= max) break;
    const path = t.url.replace(/^https?:\/\/[^/]+/i, '');
    if (!t.keyword || !path || linked.has(path)) continue;
    const re = keywordRegex(t.keyword);
    if (!re) continue;
    const tokens = tokenize(out);
    const hit = collectHits(tokens, re, NO_LINKS).find((h) => h.ratio >= 0.06 && h.ratio <= 0.96);
    if (!hit) continue;
    out = applyWrap(tokens, [hit], (txt) => `<a href="${escAttr(path)}">${txt}</a>`);
    linked.add(path);
    added++;
  }
  return { html: out, added };
}

// ---------------------------------------------------------------------------
// Public: tidy / professional structure
// ---------------------------------------------------------------------------

const BLOCK_INNER = '(?:div|p|h[1-6]|ul|ol|table|blockquote|pre|figure|section|article)';
const KEEP_STYLE = new Set(['text-align', 'color', 'background-color']);

export interface TidyReport {
  emptyRemoved: number;
  headingsFixed: number;
  imagesFixed: number;
  linksFixed: number;
  tablesWrapped: number;
  missingAlt: number;
}

export function tidyArticleHtml(input: string): { html: string; report: TidyReport } {
  const report: TidyReport = { emptyRemoved: 0, headingsFixed: 0, imagesFixed: 0, linksFixed: 0, tablesWrapped: 0, missingAlt: 0 };
  let html = (input || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/&nbsp;/g, '\u00a0');

  // <div>text</div> (what contentEditable produces on Enter) -> <p>
  for (let i = 0; i < 6; i++) {
    const next = html.replace(new RegExp(`<div(\\s[^>]*)?>((?:(?!<\\/?${BLOCK_INNER}\\b)[\\s\\S])*?)<\\/div>`, 'gi'), (_m, attrs: string | undefined, inner: string) =>
      /class="[^"]*(?:table-wrap|callout|note|tip|warning|video-wrap|video-frame|pros-cons|pros-col|cons-col|article-tldr|bz-visual-card|bz-visual-head|bz-visual-grid|bz-bar-row|bz-bar-meta|bz-bar-track|bz-bar-fill|bz-flow-row|bz-flow-node|bz-sketch-box|bz-source-note|bz-inline-figure|video-caption)[^"]*"/i.test(attrs || '') ? _m : `<p>${inner}</p>`);
    if (next === html) break;
    html = next;
  }

  const tokens = tokenize(html);
  const out: string[] = [];
  const unwrapStack: boolean[] = []; // for <span>/<font>: was the open tag dropped?
  let inAnchor = 0;
  let lastLevel = 1;
  const headingStack: string[] = [];
  const tableWrapped: boolean[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (!isTag(i)) { out.push(tk); continue; }
    const p = parseTag(tk);
    if (!p) { out.push(tk); continue; }

    // ---- closing tags
    if (p.closing) {
      if (p.name === 'span' || p.name === 'font') {
        if (unwrapStack.pop() === false) out.push(`</${p.name}>`);
        continue;
      }
      if (p.name === 'a') inAnchor = Math.max(0, inAnchor - 1);
      if (/^h[1-6]$/.test(p.name)) {
        out.push(`</${headingStack.pop() || p.name}>`);
        continue;
      }
      if (p.name === 'b') { out.push('</strong>'); continue; }
      if (p.name === 'i') { out.push('</em>'); continue; }
      if (p.name === 'table') {
        out.push('</table>');
        if (tableWrapped.pop()) out.push('</div>');
        continue;
      }
      out.push(tk);
      continue;
    }

    // ---- attribute hygiene on opening tags
    const style = getAttr(p, 'style');
    if (style !== null) {
      const clsAttr = getAttr(p, 'class') || '';
      const barKeep = /\bbz-bar-fill\b/i.test(clsAttr) ? new Set([...KEEP_STYLE, 'width']) : KEEP_STYLE;
      const kept = p.name === 'img' || p.name === 'video' ? style : filterStyle(style, barKeep);
      setAttr(p, 'style', kept ? kept : null);
    }
    ['contenteditable', 'spellcheck', 'dir', 'lang', 'align', 'bgcolor', 'width', 'height', 'border', 'cellpadding', 'cellspacing', 'valign'].forEach((a) => {
      if ((p.name === 'img' || p.name === 'iframe' || p.name === 'video') && (a === 'width' || a === 'height')) return;
      setAttr(p, a, null);
    });
    if (p.name === 'iframe') {
      const src = getAttr(p, 'src') || '';
      if (!SAFE_EMBED_RE.test(src)) continue; // strip untrusted iframes
    }
    p.attrs = p.attrs.filter(([k]) => !k.startsWith('data-') && !/^on(click|load|error|mouse|key|focus|blur|change|submit|input|touch|pointer)/.test(k));
    const cls = getAttr(p, 'class');
    if (cls !== null) {
      const cleaned = cls.split(/\s+/).filter((c) => c && !/^(Mso|docs-|ql-|wp-|MsoNormal)/i.test(c)).join(' ');
      setAttr(p, 'class', cleaned || null);
    }
    const idv = getAttr(p, 'id');
    if (idv && /^docs-internal-guid/i.test(idv)) setAttr(p, 'id', null);

    // inside links the brand colour must win
    if (inAnchor > 0 || p.name === 'a') { setAttr(p, 'style', null); }

    // ---- per tag rules
    if (p.name === 'span' || p.name === 'font') {
      const keep = p.attrs.some(([k]) => k === 'style' || k === 'class');
      unwrapStack.push(!keep ? true : false);
      if (keep) out.push(buildTag('span', p.attrs.filter(([k]) => k === 'style' || k === 'class'))); // closing handled above
      continue;
    }
    if (p.name === 'o:p') continue;
    if (p.name === 'b') { out.push('<strong>'); continue; }
    if (p.name === 'i') { out.push('<em>'); continue; }

    if (/^h[1-6]$/.test(p.name)) {
      let level = Number(p.name[1]);
      if (level === 1) level = 2;
      if (level > lastLevel + 1) level = lastLevel + 1;
      if (level < 2) level = 2;
      if (level !== Number(p.name[1])) report.headingsFixed++;
      lastLevel = level;
      headingStack.push(`h${level}`);
      out.push(buildTag(`h${level}`, p.attrs));
      continue;
    }

    if (p.name === 'a') {
      inAnchor++;
      const href = getAttr(p, 'href') || '';
      if (/^https?:\/\//i.test(href)) {
        const host = href.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].toLowerCase();
        if (SITE_HOSTS.includes(host)) {
          if (getAttr(p, 'target') !== null || getAttr(p, 'rel') !== null) { setAttr(p, 'target', null); setAttr(p, 'rel', null); report.linksFixed++; }
        } else {
          const rel = new Set((getAttr(p, 'rel') || '').split(/\s+/).filter(Boolean));
          rel.add('noopener'); rel.add('noreferrer');
          const wantRel = [...rel].join(' ');
          if (getAttr(p, 'target') !== '_blank' || getAttr(p, 'rel') !== wantRel) report.linksFixed++;
          setAttr(p, 'target', '_blank');
          setAttr(p, 'rel', wantRel);
        }
      }
      out.push(buildTag('a', p.attrs));
      continue;
    }

    if (p.name === 'img') {
      let touched = false;
      if (getAttr(p, 'loading') === null) { setAttr(p, 'loading', 'lazy'); touched = true; }
      if (getAttr(p, 'decoding') === null) { setAttr(p, 'decoding', 'async'); touched = true; }
      if (getAttr(p, 'alt') === null) { setAttr(p, 'alt', ''); report.missingAlt++; touched = true; }
      else if (!getAttr(p, 'alt')) report.missingAlt++;
      if (touched) report.imagesFixed++;
      out.push(buildTag('img', p.attrs, true));
      continue;
    }

    if (p.name === 'table') {
      const prev = [...out].reverse().find((x) => x.trim() !== '');
      const alreadyWrapped = prev === '<div class="table-wrap">';
      tableWrapped.push(!alreadyWrapped);
      if (!alreadyWrapped) { out.push('<div class="table-wrap">'); report.tablesWrapped++; }
      out.push(buildTag('table', p.attrs));
      continue;
    }

    out.push(p.selfClose && !VOID.has(p.name) ? buildTag(p.name, p.attrs, true) : buildTag(p.name, p.attrs, VOID.has(p.name)));
  }

  html = out.join('');

  // empty paragraphs / stray breaks
  const before = html.length;
  html = html
    .replace(/<p(?:\s[^>]*)?>(?:\s|\u00a0|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br /><br />')
    .replace(/<(strong|em|u)>\s*<\/\1>/gi, '')
    .replace(/\u00a0/g, '&nbsp;')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (html.length < before) report.emptyRemoved++;

  // an empty <li><p> wrapper from Docs -> plain <li>
  html = html.replace(/<li(\s[^>]*)?>\s*<p(?:\s[^>]*)?>([\s\S]*?)<\/p>\s*<\/li>/gi, '<li$1>$2</li>');

  return { html, report };
}

// ---------------------------------------------------------------------------
// Public: one call that does everything for a finished article
// ---------------------------------------------------------------------------

export interface EnhanceOptions extends EmphasisOptions {
  internalLinks?: InternalLinkTarget[];
  maxInternalLinks?: number;
}

export interface EnhanceReport extends TidyReport {
  primaryBolded: number;
  othersBolded: number;
  internalLinksAdded: number;
}

const TYPO_REPLACEMENTS: [RegExp, string][] = [
  [/\bteh\b/gi, 'the'],
  [/\brecieve\b/gi, 'receive'],
  [/\brecieved\b/gi, 'received'],
  [/\brecieving\b/gi, 'receiving'],
  [/\bseperate\b/gi, 'separate'],
  [/\bseperated\b/gi, 'separated'],
  [/\boccured\b/gi, 'occurred'],
  [/\boccurance\b/gi, 'occurrence'],
  [/\bdefinately\b/gi, 'definitely'],
  [/\bacommodate\b/gi, 'accommodate'],
  [/\benviroment\b/gi, 'environment'],
  [/\bmanagment\b/gi, 'management'],
  [/\bgoverment\b/gi, 'government'],
  [/\bindependant\b/gi, 'independent'],
  [/\bpersistant\b/gi, 'persistent'],
  [/\brefered\b/gi, 'referred'],
  [/\buntill\b/gi, 'until'],
  [/\bwiht\b/gi, 'with'],
  [/\bbecuase\b/gi, 'because'],
  [/\bkeywird\b/gi, 'keyword'],
  [/\btypho\b/gi, 'typo'],
  [/\bplagarism\b/gi, 'plagiarism'],
  [/\bsuccesful\b/gi, 'successful'],
  [/\bneccessary\b/gi, 'necessary'],
  [/\bpublically\b/gi, 'publicly'],
  [/\bmaintainance\b/gi, 'maintenance'],
  [/\bpriviledge\b/gi, 'privilege'],
  [/\bknowlege\b/gi, 'knowledge'],
  [/\bwriten\b/gi, 'written'],
  [/\barticel\b/gi, 'article'],
];

function preserveCase(orig: string, replacement: string): string {
  if (!orig) return replacement;
  if (orig === orig.toUpperCase() && orig.length > 1) return replacement.toUpperCase();
  if (orig[0] === orig[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

/**
 * Cleans common editorial typos, doubled words ("the the"), extra spaces,
 * and awkward punctuation spacing inside text nodes while leaving tags,
 * attributes, URLs, and code blocks untouched.
 */
export function proofreadArticleHtml(html: string): string {
  if (!html) return '';
  const tokens = tokenize(html);
  const ctx = new Ctx();
  const skipTags = new Set(['code', 'pre', 'script', 'style', 'svg']);

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (isTag(i)) {
      ctx.update(tk);
      continue;
    }
    if (!tk || ctx.blocked(skipTags)) continue;

    let txt = tk
      .replace(/\b(the|a|an|in|on|at|to|for|of|and|or|with|that|this|is|are|was|were|be|it|by|as)\s+\1\b/gi, '$1')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([,.;:!?])(?=\s|$)/g, '$1')
      .replace(/([a-z])([.!?])([A-Z][a-z])/g, '$1$2 $3');

    for (const [re, rep] of TYPO_REPLACEMENTS) {
      txt = txt.replace(re, (m) => preserveCase(m, rep));
    }
    tokens[i] = txt;
  }
  return tokens.join('');
}

function trigramSet(s: string): Set<string> {
  const words = s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const grams = new Set<string>();
  for (let i = 0; i <= words.length - 3; i++) {
    grams.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return grams;
}

function trigramSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((g) => { if (b.has(g)) inter++; });
  return inter / Math.min(a.size, b.size);
}

/**
 * Removes exact or near-duplicate <p> paragraphs (>= 72% trigram overlap)
 * so generated or edited articles never repeat cloned boilerplate across chapters.
 */
export function dedupeSimilarParagraphs(html: string): string {
  if (!html) return '';
  const seenExact = new Set<string>();
  const seenGrams: Set<string>[] = [];

  return html.replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, (block) => {
    const plain = htmlToPlain(block);
    if (plain.length < 70) return block;
    const norm = plain.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seenExact.has(norm)) return '';
    const grams = trigramSet(norm);
    for (const prev of seenGrams) {
      if (trigramSimilarity(grams, prev) >= 0.72) {
        return '';
      }
    }
    seenExact.add(norm);
    if (grams.size >= 4) seenGrams.push(grams);
    return block;
  });
}

export function enhanceArticleHtml(html: string, o: EnhanceOptions = {}): { html: string; report: EnhanceReport } {
  const proofread = proofreadArticleHtml(html);
  const tidy = tidyArticleHtml(proofread);
  const autoExtracted =
    (!o.secondaryKeywords?.length || !o.lsiKeywords?.length)
      ? extractKeywords(tidy.html, o.primaryKeyword || '')
      : { relevant: [], lsi: [] };
  const mergedSecondary = o.secondaryKeywords?.length ? o.secondaryKeywords : autoExtracted.relevant;
  const mergedLsi = o.lsiKeywords?.length ? o.lsiKeywords : autoExtracted.lsi;
  const emph = emphasizeKeywords(tidy.html, {
    ...o,
    secondaryKeywords: mergedSecondary,
    lsiKeywords: mergedLsi,
  });
  const links = o.internalLinks?.length ? addInternalLinks(emph.html, o.internalLinks, o.maxInternalLinks ?? 4) : { html: emph.html, added: 0 };
  return {
    html: links.html,
    report: { ...tidy.report, primaryBolded: emph.primary, othersBolded: emph.others, internalLinksAdded: links.added },
  };
}

export function beautifyArticleHtml(input: string): string {
  return tidyArticleHtml(input).html
    .replace(/>\s+</g, '><')
    .replace(/(<\/(?:p|h[1-6]|ul|ol|blockquote|table|pre|figure|details|div)>|<(?:hr)\s*\/?>)/gi, '$1\n\n')
    .replace(/(<(?:ul|ol|thead|tbody|tr|div class="(?:table-wrap|callout|pros-cons|video-wrap|article-tldr|bz-visual-card)[^"]*"|figure[^>]*)>)/gi, '$1\n')
    .replace(/(<\/(?:li|tr)>)/gi, '$1\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// Public: pasted-content cleaner (Claude / ChatGPT / Google Docs / Word -> clean semantic HTML)
// ---------------------------------------------------------------------------

const PASTE_TAGS = new Set(['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'u', 's', 'a', 'blockquote', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'img', 'pre', 'code', 'hr', 'sup', 'sub', 'mark', 'figure', 'figcaption', 'video', 'source', 'iframe', 'details', 'summary']);
const PASTE_ATTRS: Record<string, string[]> = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title', 'loading', 'decoding'],
  figure: ['class'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  iframe: ['src', 'title', 'allow', 'allowfullscreen', 'loading'],
  video: ['src', 'controls', 'preload', 'poster'],
  source: ['src', 'type'],
};

export function cleanPastedHtml(input: string): string {
  let html = (input || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|head|title|xml)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(meta|link)\b[^>]*>/gi, '')
    .replace(/<\/?(html|body)[^>]*>/gi, '');
  for (let i = 0; i < 6; i++) {
    const next = html.replace(new RegExp(`<div(?:\\s[^>]*)?>((?:(?!<\\/?${BLOCK_INNER}\\b)[\\s\\S])*?)<\\/div>`, 'gi'), '<p>$1</p>');
    if (next === html) break;
    html = next;
  }
  const tokens = tokenize(html);
  const out: string[] = [];
  const closeStack: string[][] = []; // for spans: closing tags to emit
  const dropB: boolean[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (!isTag(i)) { out.push(tk); continue; }
    const p = parseTag(tk);
    if (!p) continue;

    if (p.closing) {
      if (p.name === 'span') { (closeStack.pop() || []).forEach((c) => out.push(c)); continue; }
      if (p.name === 'b') { if (dropB.pop() === false) out.push('</strong>'); continue; }
      if (p.name === 'i') { out.push('</em>'); continue; }
      if (p.name === 'div') continue;
      if (PASTE_TAGS.has(p.name)) out.push(`</${p.name === 'h1' ? 'h2' : p.name}>`);
      continue;
    }

    if (p.name === 'span') {
      const st = (getAttr(p, 'style') || '').toLowerCase();
      const close: string[] = [];
      if (/font-weight\s*:\s*(bold|[6-9]00)/.test(st)) { out.push('<strong>'); close.unshift('</strong>'); }
      if (/font-style\s*:\s*italic/.test(st)) { out.push('<em>'); close.unshift('</em>'); }
      closeStack.push(close);
      continue;
    }
    if (p.name === 'b') {
      const st = (getAttr(p, 'style') || '').toLowerCase();
      const fake = /font-weight\s*:\s*normal/.test(st);
      dropB.push(fake);
      if (!fake) out.push('<strong>');
      continue;
    }
    if (p.name === 'i') { out.push('<em>'); continue; }
    if (!PASTE_TAGS.has(p.name)) continue; // unwrap unknown tags, keep their text

    if (p.name === 'iframe') {
      const src = getAttr(p, 'src') || '';
      if (!SAFE_EMBED_RE.test(src)) continue;
    }
    const allowed = PASTE_ATTRS[p.name] || [];
    const attrs = p.attrs.filter(([k, v]) => allowed.includes(k) && v !== null && !/^\s*javascript:/i.test(v || ''));
    const name = p.name === 'h1' ? 'h2' : p.name;
    if (name === 'img' || name === 'source') { out.push(buildTag(name, attrs, true)); continue; }
    if (name === 'br' || name === 'hr') { out.push(`<${name} />`); continue; }
    out.push(buildTag(name, attrs));
  }
  html = out.join('')
    .replace(/<p>\s*(?:&nbsp;|\u00a0|<br \/>)?\s*<\/p>/gi, '')
    .replace(/<li>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/gi, '<li>$1</li>')
    .replace(/(<\/(?:p|h[2-6]|ul|ol|li|blockquote|table|tr)>)(?=<)/gi, '$1\n')
    .trim();
  return html;
}

// ---------------------------------------------------------------------------
// Public: keyword extraction (relevant + LSI) from the article text itself
// ---------------------------------------------------------------------------

const STOP = new Set(('a about above after again against all also am an and any are aren\'t as at be because been before being below between both but by can can\'t cannot could couldn\'t did didn\'t do does doesn\'t doing don\'t down during each few for from further get got had hadn\'t has hasn\'t have haven\'t having he her here hers herself him himself his how i if in into is isn\'t it it\'s its itself just let\'s me more most mustn\'t my myself no nor not of off on once only or other ought our ours ourselves out over own same shan\'t she should shouldn\'t so some such than that that\'s the their theirs them themselves then there there\'s these they this those through to too under until up very was wasn\'t we were weren\'t what what\'s when where which while who whom why will with won\'t would wouldn\'t you your yours yourself yourselves may might must shall one two three first second third new old many much every even still well way ways make makes made making use used uses using need needs needed like likely however therefore thus although though whether often usually really actually simply quite rather several something anything everything nothing someone anyone everyone take takes taking give gives given going goes come comes see sees look looks find finds want wants keep keeps able across along among around away back become becomes best better big right sure whole today now already ever never always better good great important key')
  .split(' '));
const GENERIC = new Set(['people', 'thing', 'things', 'time', 'times', 'part', 'parts', 'case', 'cases', 'point', 'points', 'kind', 'type', 'types', 'lot', 'example', 'examples', 'step', 'steps', 'result', 'results', 'process', 'ones', 'users', 'user', 'article', 'guide', 'section', 'chapter', 'tips', 'work', 'works', 'working', 'help', 'helps', 'add', 'adds', 'check', 'start', 'end', 'level', 'number', 'amount', 'place', 'person', 'day', 'days', 'year', 'years', 'month', 'months', 'week', 'weeks', 'change', 'changes', 'plan', 'plans', 'detail', 'details', 'idea', 'ideas', 'question', 'questions', 'answer', 'answers', 'problem', 'problems', 'reason', 'reasons', 'factor', 'factors', 'option', 'options', 'choice', 'choices']);

export interface ExtractedKeywords { relevant: string[]; lsi: string[] }

export function extractKeywords(html: string, primaryKeyword = '', extraHeadings: string[] = [], limit = { relevant: 8, lsi: 12 }): ExtractedKeywords {
  const headings: string[] = [...extraHeadings];
  (html || '').replace(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi, (_m, inner: string) => { headings.push(htmlToPlain(inner)); return ''; });
  // sentence boundaries: block-level closings and punctuation, so phrases never span two sentences or two paragraphs
  const text = htmlToPlain((html || '').replace(/<\/(p|h[1-6]|li|td|th|tr|blockquote|div|figcaption)>/gi, ' . ')).toLowerCase();
  const pk = primaryKeyword.trim().toLowerCase();
  const pkTokens = new Set(pk.split(/\s+/).filter(Boolean));

  const words = (s: string) => s.toLowerCase().match(/[a-z][a-z0-9'-]*/g) || [];
  const isContent = (w: string) => w.length > 2 && !STOP.has(w) && !GENERIC.has(w);

  const headWords = new Set<string>();
  headings.forEach((h) => words(h).forEach((w) => headWords.add(w)));

  const freq = new Map<string, number>();
  const bump = (k: string) => freq.set(k, (freq.get(k) || 0) + 1);
  text.split(/[.!?;:()\n\u2014\u2013|]+|,\s/).forEach((sentence) => {
    const toks = words(sentence);
    for (let i = 0; i < toks.length; i++) {
      for (let n = 1; n <= 3; n++) {
        const slice = toks.slice(i, i + n);
        if (slice.length < n) break;
        if (!slice.every(isContent)) continue;
        if (n === 1 && slice[0].length < 5) continue;
        bump(slice.join(' '));
      }
    }
  });

  // headings: phrases are strong signals even with one mention
  headings.forEach((h) => {
    const ws = words(h).filter(isContent);
    for (let n = 2; n <= 3; n++) for (let i = 0; i + n <= ws.length; i++) bump(ws.slice(i, i + n).join(' '));
  });

  const scored: { k: string; score: number; n: number }[] = [];
  freq.forEach((f, k) => {
    const parts = k.split(' ');
    const n = parts.length;
    const inHead = parts.every((w) => headWords.has(w));
    if (n === 1 && f < 4) return;
    if (n >= 2 && f < 2 && !inHead) return;
    if (pk && (k === pk || (pk.includes(k) && n === 1))) return;
    const overlapsPrimary = parts.some((w) => pkTokens.has(w));
    const score = f * (1 + 0.6 * (n - 1)) * (inHead ? 1.8 : 1) * (overlapsPrimary ? 1.15 : 1);
    scored.push({ k, score, n });
  });
  scored.sort((a, b) => b.score - a.score);

  const near = (a: string, b: string) => {
    if (a.includes(b) || b.includes(a)) return true;
    const A = new Set(a.split(' ')); const B = b.split(' ');
    return B.filter((w) => A.has(w)).length / Math.max(A.size, B.length) >= 0.67;
  };
  const picked: { k: string; n: number }[] = [];
  for (const s of scored) {
    if (picked.length >= limit.relevant + limit.lsi + 6) break;
    if (pk && near(s.k, pk) && s.n > 1 && s.k.includes(pk)) continue; // variants of the primary add nothing
    if (picked.some((p) => near(p.k, s.k))) continue;
    picked.push({ k: s.k, n: s.n });
  }
  const relevant = picked.filter((p) => p.n >= 2).slice(0, limit.relevant).map((p) => p.k);
  const used = new Set(relevant);
  const lsi = picked.filter((p) => !used.has(p.k)).slice(0, limit.lsi).map((p) => p.k);
  return { relevant, lsi };
}

// ---------------------------------------------------------------------------
// Public: live numbers for the editor status bar
// ---------------------------------------------------------------------------

export interface KeywordStats {
  words: number;
  readingMinutes: number;
  primaryCount: number;
  primaryDensity: number; // percent
  inFirstParagraph: boolean;
  inHeadings: number;
  primaryBold: number;
  linksInternal: number;
  linksExternal: number;
  images: number;
  imagesNoAlt: number;
  headingCount: number;
}

export function keywordStats(html: string, primaryKeyword = ''): KeywordStats {
  const plain = htmlToPlain(html);
  const words = plain ? plain.split(/\s+/).length : 0;
  const re = primaryKeyword.trim() ? keywordRegex(primaryKeyword) : null;
  const count = (s: string) => { if (!re) return 0; re.lastIndex = 0; return (s.match(re) || []).length; };
  const firstP = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(html || '');
  let inHeadings = 0;
  let headingCount = 0;
  (html || '').replace(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi, (_m, inner: string) => { headingCount++; if (count(htmlToPlain(inner)) > 0) inHeadings++; return ''; });
  let internal = 0, external = 0;
  (html || '').replace(/<a\b[^>]*\bhref="([^"]+)"/gi, (_m, href: string) => {
    if (/^https?:\/\//i.test(href) && !SITE_HOSTS.includes(href.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].toLowerCase())) external++;
    else if (!href.startsWith('#') && !/^(mailto|tel):/i.test(href)) internal++;
    return '';
  });
  const imgs = (html || '').match(/<img\b[^>]*>/gi) || [];
  const pc = count(plain);
  return {
    words,
    readingMinutes: Math.max(1, Math.ceil(words / 200)),
    primaryCount: pc,
    primaryDensity: words ? Math.round((pc / words) * 10000) / 100 : 0,
    inFirstParagraph: firstP ? count(htmlToPlain(firstP[1])) > 0 : false,
    inHeadings,
    primaryBold: re ? boldCount(html || '', re) : 0,
    linksInternal: internal,
    linksExternal: external,
    images: imgs.length,
    imagesNoAlt: imgs.filter((t) => !/\balt="[^"]+"/i.test(t)).length,
    headingCount,
  };
}
