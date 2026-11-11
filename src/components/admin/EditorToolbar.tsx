import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough, Superscript, Subscript, Palette, Highlighter,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, IndentIncrease, IndentDecrease,
  Quote, Info, Code, Terminal, Minus, Link2, Unlink, FileText, Table2, Image as ImageIcon, RemoveFormatting,
  Sparkles, Wand2, CheckCircle2, AlertTriangle, X,
} from 'lucide-react';
import type { Article } from '../../types.ts';
import { cleanPastedHtml, keywordStats } from '../../utils/articleEnhancer.ts';
import { toArticleHtml } from '../../utils/markdown.ts';

// ---------------------------------------------------------------------------------------------
// Rich toolbar (Compose view)
// ---------------------------------------------------------------------------------------------

interface RichToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  /** Called with the editor's innerHTML after every change made through the toolbar / paste handler. */
  onChange: (html: string) => void;
  /** Existing articles, for the internal-link picker. */
  articles: Article[];
  currentArticleId?: string | null;
  articleHref: (a: Article) => string;
}

type Panel = null | 'link' | 'internal' | 'table' | 'image' | 'color' | 'highlight' | 'callout';

const PLACEHOLDER_HREF = 'https://briefzy.invalid/__pending__';
const TEXT_COLORS = ['#0f172a', '#4f46e5', '#0891b2', '#059669', '#d97706', '#e11d48', '#64748b'];
const HIGHLIGHTS = ['#fef08a', '#cffafe', '#e0e7ff', '#dcfce7', '#fce7f3', '#fed7aa'];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const baseBtn = 'p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer';
const inputCls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
const Sep = () => <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />;

export const RichToolbar: React.FC<RichToolbarProps> = ({ editorRef, onChange, articles, currentArticleId, articleHref }) => {
  const [panel, setPanel] = useState<Panel>(null);
  const savedRange = useRef<Range | null>(null);
  const editingAnchor = useRef<HTMLAnchorElement | null>(null);

  const [linkUrl, setLinkUrl] = useState('');
  const [linkNewTab, setLinkNewTab] = useState(true);
  const [linkNofollow, setLinkNofollow] = useState(false);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [imgUrl, setImgUrl] = useState('');
  const [imgAlt, setImgAlt] = useState('');

  const ed = () => editorRef.current;
  const emit = () => { const e = ed(); if (e) onChange(e.innerHTML); };

  const saveSel = () => {
    const sel = window.getSelection();
    const e = ed();
    if (sel && sel.rangeCount && e && e.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    } else {
      savedRange.current = null;
    }
  };
  const restoreSel = () => {
    const e = ed();
    if (!e) return;
    e.focus();
    const sel = window.getSelection();
    if (sel && savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current); }
  };
  const selectedText = () => (savedRange.current ? savedRange.current.toString() : window.getSelection()?.toString() || '');

  const run = (cmd: string, val?: string) => {
    const e = ed();
    if (!e) return;
    e.focus();
    document.execCommand('styleWithCSS', false, cmd === 'foreColor' || cmd === 'hiliteColor' || cmd.startsWith('justify') ? 'true' : 'false');
    document.execCommand(cmd, false, val);
    emit();
  };
  const insertHtml = (html: string) => { restoreSel(); document.execCommand('insertHTML', false, html); emit(); setPanel(null); };

  // ---- editor-level behaviour: default <p> paragraphs, clean paste, Ctrl+K, Tab indent
  useEffect(() => {
    const e = ed();
    if (!e) return;
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* ignore */ }

    const onPaste = (ev: ClipboardEvent) => {
      const dt = ev.clipboardData;
      if (!dt) return;
      const html = dt.getData('text/html');
      const text = dt.getData('text/plain');
      if (!html && !text) return;
      ev.preventDefault();
      const clean = html && /<(p|h[1-6]|ul|ol|li|table|strong|b|em|i|a|br|blockquote)\b/i.test(html) ? cleanPastedHtml(html) : toArticleHtml(text);
      document.execCommand('insertHTML', false, clean);
      emit();
    };
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); openLink(); return; }
      if (ev.key === 'Tab') {
        const sel = window.getSelection();
        const node = sel?.anchorNode as Node | null;
        const inLi = node && (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest('li');
        if (inLi) { ev.preventDefault(); run(ev.shiftKey ? 'outdent' : 'indent'); }
      }
    };
    e.addEventListener('paste', onPaste);
    e.addEventListener('keydown', onKey);
    return () => { e.removeEventListener('paste', onPaste); e.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorRef.current]);

  // ---- links
  function openLink() {
    saveSel();
    const sel = window.getSelection();
    const node = sel?.anchorNode as Node | null;
    const a = node ? ((node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest('a') as HTMLAnchorElement | null) : null;
    editingAnchor.current = a && ed()?.contains(a) ? a : null;
    setLinkUrl(editingAnchor.current?.getAttribute('href') || '');
    setLinkNewTab(editingAnchor.current ? editingAnchor.current.getAttribute('target') === '_blank' : true);
    setLinkNofollow(/\bnofollow\b/.test(editingAnchor.current?.getAttribute('rel') || ''));
    setPanel('link');
  }

  const applyLink = (hrefRaw: string, newTab: boolean, nofollow: boolean, fallbackText?: string) => {
    const e = ed();
    let href = hrefRaw.trim();
    if (!e || !href) return;
    if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href)) href = 'https://' + href;
    const external = /^https?:\/\//i.test(href) && !/^https?:\/\/(www\.)?briefzy\.me(\/|$)/i.test(href);
    const style = (a: HTMLAnchorElement) => {
      a.setAttribute('href', href);
      if (newTab && external) a.setAttribute('target', '_blank'); else a.removeAttribute('target');
      const rel = new Set<string>();
      if (external) { rel.add('noopener'); rel.add('noreferrer'); }
      if (nofollow) rel.add('nofollow');
      if (rel.size) a.setAttribute('rel', [...rel].join(' ')); else a.removeAttribute('rel');
    };
    restoreSel();
    if (editingAnchor.current && e.contains(editingAnchor.current)) {
      style(editingAnchor.current);
    } else {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) document.execCommand('insertHTML', false, `<a href="${PLACEHOLDER_HREF}">${esc(fallbackText || href.replace(/^https?:\/\//i, ''))}</a>&nbsp;`);
      else document.execCommand('createLink', false, PLACEHOLDER_HREF);
      e.querySelectorAll<HTMLAnchorElement>(`a[href="${PLACEHOLDER_HREF}"]`).forEach(style);
    }
    editingAnchor.current = null;
    emit();
    setPanel(null);
  };

  const removeLink = () => { restoreSel(); run('unlink'); setPanel(null); };

  // ---- inserts
  const insertCallout = (kind: 'note' | 'tip' | 'warning') => {
    const label = kind === 'tip' ? 'Pro tip' : kind === 'warning' ? 'Heads-up' : 'Note';
    const txt = selectedText().trim();
    insertHtml(`<div class="callout${kind === 'note' ? '' : ' ' + kind}"><p><strong>${label}:</strong> ${txt ? esc(txt) : 'Write the key point here.'}</p></div><p><br></p>`);
  };
  const insertCodeBlock = () => { saveSel(); const t = selectedText(); insertHtml(`<pre><code>${esc(t) || 'code'}</code></pre><p><br></p>`); };
  const wrapInlineCode = () => { saveSel(); const t = selectedText(); if (t) insertHtml(`<code>${esc(t)}</code>&nbsp;`); };
  const insertTable = () => {
    const r = Math.min(20, Math.max(1, rows)); const c = Math.min(8, Math.max(1, cols));
    const head = `<tr>${Array.from({ length: c }, (_, i) => `<th>Column ${i + 1}</th>`).join('')}</tr>`;
    const body = Array.from({ length: r }, () => `<tr>${Array.from({ length: c }, () => '<td>&nbsp;</td>').join('')}</tr>`).join('');
    insertHtml(`<div class="table-wrap"><table><thead>${head}</thead><tbody>${body}</tbody></table></div><p><br></p>`);
  };
  const insertImage = () => {
    if (!imgUrl.trim()) return;
    insertHtml(`<img src="${esc(imgUrl.trim())}" alt="${esc(imgAlt.trim())}" loading="lazy" decoding="async" />`);
    setImgUrl(''); setImgAlt('');
  };

  const internalMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles
      .filter((a) => a.id !== currentArticleId && !a.draft && (!q || a.title.toLowerCase().includes(q) || (a.primaryKeyword || '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [articles, query, currentArticleId]);

  const toggle = (p: Panel) => { if (panel === p) { setPanel(null); return; } saveSel(); setPanel(p); };
  const enterGuard = (fn: () => void) => (ev: React.KeyboardEvent) => { if (ev.key === 'Enter') { ev.preventDefault(); fn(); } if (ev.key === 'Escape') setPanel(null); };

  const B = (title: string, onClick: () => void, icon: React.ReactNode, active = false) => (
    <button type="button" title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`${baseBtn} ${active ? 'bg-slate-200 dark:bg-slate-700' : ''}`}>{icon}</button>
  );
  const ic = 'w-3.5 h-3.5';

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/80 text-xs">
        {B('Undo (Ctrl+Z)', () => run('undo'), <Undo2 className={ic} />)}
        {B('Redo (Ctrl+Y)', () => run('redo'), <Redo2 className={ic} />)}
        <Sep />
        <select
          onChange={(e) => { if (e.target.value) { run('formatBlock', e.target.value); e.target.value = ''; } }}
          defaultValue=""
          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
          title="Paragraph or heading style"
        >
          <option value="" disabled>Style…</option>
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2 (section)</option>
          <option value="h3">Heading 3 (sub-section)</option>
          <option value="h4">Heading 4</option>
        </select>
        <Sep />
        {B('Bold (Ctrl+B)', () => run('bold'), <Bold className={ic} />)}
        {B('Italic (Ctrl+I)', () => run('italic'), <Italic className={ic} />)}
        {B('Underline (Ctrl+U)', () => run('underline'), <Underline className={ic} />)}
        {B('Strikethrough', () => run('strikeThrough'), <Strikethrough className={ic} />)}
        {B('Superscript', () => run('superscript'), <Superscript className={ic} />)}
        {B('Subscript', () => run('subscript'), <Subscript className={ic} />)}
        <Sep />
        {B('Text colour', () => toggle('color'), <Palette className={ic} />, panel === 'color')}
        {B('Highlight', () => toggle('highlight'), <Highlighter className={ic} />, panel === 'highlight')}
        <Sep />
        {B('Align left', () => run('justifyLeft'), <AlignLeft className={ic} />)}
        {B('Align centre', () => run('justifyCenter'), <AlignCenter className={ic} />)}
        {B('Align right', () => run('justifyRight'), <AlignRight className={ic} />)}
        {B('Justify', () => run('justifyFull'), <AlignJustify className={ic} />)}
        <Sep />
        {B('Bullet list', () => run('insertUnorderedList'), <List className={ic} />)}
        {B('Numbered list', () => run('insertOrderedList'), <ListOrdered className={ic} />)}
        {B('Decrease indent (Shift+Tab in lists)', () => run('outdent'), <IndentDecrease className={ic} />)}
        {B('Increase indent (Tab in lists)', () => run('indent'), <IndentIncrease className={ic} />)}
        <Sep />
        {B('Quote', () => run('formatBlock', 'blockquote'), <Quote className={ic} />)}
        {B('Callout box (note / tip / warning)', () => toggle('callout'), <Info className={ic} />, panel === 'callout')}
        {B('Inline code', wrapInlineCode, <Code className={ic} />)}
        {B('Code block', insertCodeBlock, <Terminal className={ic} />)}
        {B('Horizontal line', () => run('insertHorizontalRule'), <Minus className={ic} />)}
        <Sep />
        {B('Insert / edit link (Ctrl+K)', openLink, <Link2 className={ic} />, panel === 'link')}
        {B('Remove link', removeLink, <Unlink className={ic} />)}
        {B('Link to another Briefzy article', () => toggle('internal'), <FileText className={ic} />, panel === 'internal')}
        {B('Insert table', () => toggle('table'), <Table2 className={ic} />, panel === 'table')}
        {B('Insert image from URL', () => toggle('image'), <ImageIcon className={ic} />, panel === 'image')}
        <Sep />
        {B('Clear formatting', () => run('removeFormat'), <RemoveFormatting className={`${ic} text-slate-400`} />)}
      </div>

      {panel && (
        <div className="absolute left-3 top-full z-30 mt-1 w-[min(92vw,360px)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3 space-y-2 text-xs text-slate-700 dark:text-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
              {{ link: 'Link', internal: 'Internal link', table: 'Table', image: 'Image', color: 'Text colour', highlight: 'Highlight', callout: 'Callout box' }[panel]}
            </span>
            <button type="button" onClick={() => setPanel(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Close"><X className="w-3 h-3" /></button>
          </div>

          {panel === 'link' && (
            <>
              <input autoFocus value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://… or /category/article" className={inputCls}
                onKeyDown={enterGuard(() => applyLink(linkUrl, linkNewTab, linkNofollow))} />
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={linkNewTab} onChange={(e) => setLinkNewTab(e.target.checked)} /> Open external links in a new tab</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={linkNofollow} onChange={(e) => setLinkNofollow(e.target.checked)} /> Add rel=&quot;nofollow&quot; (ads, untrusted sources)</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => applyLink(linkUrl, linkNewTab, linkNofollow)} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">Apply</button>
                {editingAnchor.current && <button type="button" onClick={removeLink} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer">Remove link</button>}
              </div>
            </>
          )}

          {panel === 'internal' && (
            <>
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your articles…" className={inputCls} onKeyDown={enterGuard(() => internalMatches[0] && applyLink(articleHref(internalMatches[0]), false, false, internalMatches[0].title))} />
              <p className="text-[10px] text-slate-500">Select text first to turn it into the link; otherwise the article title is inserted.</p>
              <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {internalMatches.length === 0 && <li className="py-2 text-slate-400">No matching published articles.</li>}
                {internalMatches.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => applyLink(articleHref(a), false, false, a.title)} className="w-full text-left py-1.5 px-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                      <span className="font-semibold block leading-snug">{a.title}</span>
                      <span className="text-[10px] text-slate-400">{a.category}{a.primaryKeyword ? ` · ${a.primaryKeyword}` : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {panel === 'table' && (
            <>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1">Rows <input type="number" min={1} max={20} value={rows} onChange={(e) => setRows(Number(e.target.value))} className={`${inputCls} w-16`} onKeyDown={enterGuard(insertTable)} /></label>
                <label className="flex items-center gap-1">Columns <input type="number" min={1} max={8} value={cols} onChange={(e) => setCols(Number(e.target.value))} className={`${inputCls} w-16`} onKeyDown={enterGuard(insertTable)} /></label>
              </div>
              <button type="button" onClick={insertTable} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">Insert table</button>
            </>
          )}

          {panel === 'image' && (
            <>
              <input autoFocus value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="https://… image address" className={inputCls} onKeyDown={enterGuard(insertImage)} />
              <input value={imgAlt} onChange={(e) => setImgAlt(e.target.value)} placeholder="Alt text (describe the image, add the keyword if natural)" className={inputCls} onKeyDown={enterGuard(insertImage)} />
              <button type="button" onClick={insertImage} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">Insert image</button>
              <p className="text-[10px] text-slate-500">To upload a file instead, use &quot;Insert image into article&quot; above the editor.</p>
            </>
          )}

          {panel === 'color' && (
            <div className="flex flex-wrap gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button key={c} type="button" title={c} aria-label={`Text colour ${c}`} onClick={() => { restoreSel(); run('foreColor', c); setPanel(null); }} className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer" style={{ background: c }} />
              ))}
              <p className="w-full text-[10px] text-slate-500">Links always keep the Briefzy link colour. Use &quot;Clear formatting&quot; to reset.</p>
            </div>
          )}

          {panel === 'highlight' && (
            <div className="flex flex-wrap gap-1.5">
              {HIGHLIGHTS.map((c) => (
                <button key={c} type="button" title={c} aria-label={`Highlight ${c}`} onClick={() => { restoreSel(); run('hiliteColor', c); setPanel(null); }} className="w-6 h-6 rounded-md border border-slate-300 dark:border-slate-600 cursor-pointer" style={{ background: c }} />
              ))}
            </div>
          )}

          {panel === 'callout' && (
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={() => insertCallout('note')} className="text-left px-2.5 py-1.5 rounded-lg border-l-4 border-indigo-500 bg-slate-50 dark:bg-slate-800 cursor-pointer"><b>Note</b> — neutral highlight</button>
              <button type="button" onClick={() => insertCallout('tip')} className="text-left px-2.5 py-1.5 rounded-lg border-l-4 border-emerald-500 bg-slate-50 dark:bg-slate-800 cursor-pointer"><b>Pro tip</b> — helpful advice</button>
              <button type="button" onClick={() => insertCallout('warning')} className="text-left px-2.5 py-1.5 rounded-lg border-l-4 border-amber-500 bg-slate-50 dark:bg-slate-800 cursor-pointer"><b>Heads-up</b> — risk or caveat</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// SEO status bar + one-click actions (works in Compose and HTML view)
// ---------------------------------------------------------------------------------------------

interface SeoStatusBarProps {
  content: string;
  primaryKeyword: string;
  busy?: boolean;
  onSuggestKeywords: () => void;
  onOptimize: () => void;
  message?: string;
}

const Chip: React.FC<{ ok: boolean | null; label: string; value: React.ReactNode; hint?: string }> = ({ ok, label, value, hint }) => (
  <span title={hint} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
    ok === null ? 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
      : ok ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
      : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'}`}>
    {ok === true && <CheckCircle2 className="w-3 h-3" />}
    {ok === false && <AlertTriangle className="w-3 h-3" />}
    <span className="font-normal opacity-80">{label}</span> {value}
  </span>
);

export const SeoStatusBar: React.FC<SeoStatusBarProps> = ({ content, primaryKeyword, busy, onSuggestKeywords, onOptimize, message }) => {
  const [stats, setStats] = useState(() => keywordStats(content, primaryKeyword));
  useEffect(() => {
    const t = setTimeout(() => setStats(keywordStats(content, primaryKeyword)), 350);
    return () => clearTimeout(t);
  }, [content, primaryKeyword]);

  const hasKw = !!primaryKeyword.trim();
  const dOk = stats.primaryDensity >= 0.4 && stats.primaryDensity <= 2;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip ok={null} label="Words" value={stats.words.toLocaleString()} />
        <Chip ok={null} label="Read" value={`${stats.readingMinutes} min`} />
        {hasKw && <Chip ok={dOk} label="Keyword density" value={`${stats.primaryDensity}% (${stats.primaryCount}×)`} hint="Aim for roughly 0.5–1.5%. Never stuff." />}
        {hasKw && <Chip ok={stats.inFirstParagraph} label="In 1st paragraph" value={stats.inFirstParagraph ? 'yes' : 'no'} />}
        {hasKw && <Chip ok={stats.inHeadings > 0} label="In headings" value={`${stats.inHeadings}/${stats.headingCount}`} />}
        {hasKw && <Chip ok={stats.primaryBold > 0} label="Bold keyword" value={`${stats.primaryBold}×`} hint="First mention bold, plus ~2 spread-out mentions." />}
        <Chip ok={stats.linksInternal >= 2} label="Internal links" value={stats.linksInternal} hint="2–4 links to related Briefzy articles speed up crawling and keep readers on the site." />
        <Chip ok={stats.linksExternal >= 1} label="External links" value={stats.linksExternal} hint="Cite at least one authoritative source." />
        <Chip ok={stats.imagesNoAlt === 0} label="Images w/o alt" value={`${stats.imagesNoAlt}/${stats.images}`} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={onSuggestKeywords}
          className="px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer">
          <Sparkles className="w-3.5 h-3.5" /> Find keywords &amp; LSI from this article
        </button>
        <button type="button" disabled={busy} onClick={onOptimize}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 disabled:opacity-50 text-white text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer">
          <Wand2 className="w-3.5 h-3.5" /> Auto-optimize (tidy, bold keywords, internal links)
        </button>
        {message && <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{message}</span>}
      </div>
    </div>
  );
};
