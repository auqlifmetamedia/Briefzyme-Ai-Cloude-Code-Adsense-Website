import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough, Superscript, Subscript, Palette, Highlighter,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, CheckSquare, IndentIncrease, IndentDecrease,
  Quote, Info, Code, Terminal, Minus, Link2, Unlink, FileText, Table2, Image as ImageIcon, Video, RemoveFormatting,
  Sparkles, Wand2, CheckCircle2, AlertTriangle, Search, Maximize2, Minimize2, Columns2, Upload, X,
} from 'lucide-react';
import type { Article } from '../../types.ts';
import { beautifyArticleHtml, cleanPastedHtml, keywordStats } from '../../utils/articleEnhancer.ts';
import { uploadImageFile } from '../../utils/imageUpload.ts';
import { toArticleHtml } from '../../utils/markdown.ts';

const PLACEHOLDER_HREF = 'https://briefzy.invalid/__pending__';
const TEXT_COLORS = ['#0f172a', '#4f46e5', '#0891b2', '#059669', '#d97706', '#e11d48', '#64748b'];
const HIGHLIGHTS = ['#fef08a', '#cffafe', '#e0e7ff', '#dcfce7', '#fce7f3', '#fed7aa'];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const baseBtn = 'p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed';
const inputCls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
const Sep = () => <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />;

/** Converts YouTube / Vimeo / Loom share URLs or direct MP4/WebM URLs into safe, responsive article video HTML. */
export function buildVideoEmbedHtml(rawUrl: string, caption = ''): { html: string; error?: string } {
  const url = rawUrl.trim();
  if (!url) return { html: '', error: 'Please paste a YouTube, Vimeo, Loom, or MP4 video URL.' };

  let embedSrc = '';
  let isDirectVideo = false;

  // YouTube (watch, youtu.be, shorts, embed)
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    embedSrc = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
  } else {
    // Vimeo
    const vmMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vmMatch) {
      embedSrc = `https://player.vimeo.com/video/${vmMatch[1]}`;
    } else {
      // Loom
      const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
      if (loomMatch) {
        embedSrc = `https://www.loom.com/embed/${loomMatch[1]}`;
      } else if (/^https?:\/\/.+\.(?:mp4|webm|ogg)(?:[?#].*)?$/i.test(url) || url.startsWith('/')) {
        embedSrc = url;
        isDirectVideo = true;
      }
    }
  }

  if (!embedSrc) {
    return {
      html: '',
      error: 'Unsupported video link. Paste a YouTube, Vimeo, Loom URL or a direct .mp4 / .webm link.',
    };
  }

  const safeCaption = caption.trim();
  const titleAttr = safeCaption ? esc(safeCaption) : 'Embedded article video';
  const mediaTag = isDirectVideo
    ? `<video controls preload="metadata" src="${esc(embedSrc)}" title="${titleAttr}"></video>`
    : `<iframe src="${esc(embedSrc)}" title="${titleAttr}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

  const html = `<figure class="video-wrap"><div class="video-frame">${mediaTag}</div>${
    safeCaption ? `<figcaption>${esc(safeCaption)}</figcaption>` : ''
  }</figure><p><br></p>`;

  return { html };
}

export function buildImageHtml(url: string, alt: string, caption = ''): string {
  const safeUrl = esc(url.trim());
  const safeAlt = esc(alt.trim());
  const safeCaption = caption.trim();
  if (!safeUrl) return '';
  if (safeCaption) {
    return `<figure><img src="${safeUrl}" alt="${safeAlt}" loading="lazy" decoding="async" /><figcaption>${esc(safeCaption)}</figcaption></figure><p><br></p>`;
  }
  return `<img src="${safeUrl}" alt="${safeAlt}" loading="lazy" decoding="async" />`;
}

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
  /** Managed Undo/Redo snapshot history */
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  /** Focus/fullscreen editor toggle */
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

type Panel = null | 'link' | 'internal' | 'table' | 'image' | 'video' | 'color' | 'highlight' | 'callout' | 'find';

export const RichToolbar: React.FC<RichToolbarProps> = ({
  editorRef,
  onChange,
  articles,
  currentArticleId,
  articleHref,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [panel, setPanel] = useState<Panel>(null);
  const savedRange = useRef<Range | null>(null);
  const editingAnchor = useRef<HTMLAnchorElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [linkUrl, setLinkUrl] = useState('');
  const [linkNewTab, setLinkNewTab] = useState(true);
  const [linkNofollow, setLinkNofollow] = useState(false);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const [imgUrl, setImgUrl] = useState('');
  const [imgAlt, setImgAlt] = useState('');
  const [imgCaption, setImgCaption] = useState('');
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError, setImgError] = useState('');

  const [videoUrl, setVideoUrl] = useState('');
  const [videoCaption, setVideoCaption] = useState('');
  const [videoError, setVideoError] = useState('');

  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [findStatus, setFindStatus] = useState('');

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

  // ---- editor-level behaviour: default <p> paragraphs, clean paste, Ctrl+K, Ctrl+Z/Y, Tab indent
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
      const clean = html && /<(p|h[1-6]|ul|ol|li|table|strong|b|em|i|a|br|blockquote|figure|iframe|video)\b/i.test(html) ? cleanPastedHtml(html) : toArticleHtml(text);
      document.execCommand('insertHTML', false, clean);
      emit();
    };
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); openLink(); return; }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey && onUndo) {
        ev.preventDefault();
        onUndo();
        return;
      }
      if (((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.shiftKey && ev.key.toLowerCase() === 'z'))) && onRedo) {
        ev.preventDefault();
        onRedo();
        return;
      }
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
  }, [editorRef.current, onUndo, onRedo]);

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
  const insertCallout = (kind: 'note' | 'tip' | 'warning' | 'tldr') => {
    const label = kind === 'tip' ? 'Pro tip' : kind === 'warning' ? 'Heads-up' : kind === 'tldr' ? 'Quick Answer' : 'Note';
    const cls = kind === 'note' ? 'callout' : kind === 'tldr' ? 'article-tldr' : `callout ${kind}`;
    const txt = selectedText().trim();
    insertHtml(`<div class="${cls}"><p><strong>${label}:</strong> ${txt ? esc(txt) : 'Write the key point here.'}</p></div><p><br></p>`);
  };
  const insertProsCons = () => {
    insertHtml(
      `<div class="pros-cons"><div class="pros-col"><h4>Key Strengths</h4><ul><li>Fast setup and predictable performance</li><li>Clear pricing and strong documentation</li></ul></div><div class="cons-col"><h4>Trade-offs to Watch</h4><ul><li>Requires initial workflow configuration</li><li>Advanced automation needs higher tiers</li></ul></div></div><p><br></p>`
    );
  };
  const insertChecklist = () => {
    const txt = selectedText().trim();
    const items = txt
      ? txt.split('\n').filter(Boolean).map((line) => `<li>${esc(line.trim())}</li>`).join('')
      : '<li>Verify primary prerequisites</li><li>Run pilot test with real data</li><li>Document final team settings</li>';
    insertHtml(`<ul class="checklist">${items}</ul><p><br></p>`);
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
    if (!imgUrl.trim()) { setImgError('Paste an image URL or upload an image file.'); return; }
    insertHtml(buildImageHtml(imgUrl, imgAlt, imgCaption));
    setImgUrl(''); setImgAlt(''); setImgCaption(''); setImgError('');
  };
  const handleFileUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    setImgError('');
    setImgUploading(true);
    try {
      const uploadedUrl = await uploadImageFile(file);
      setImgUrl(uploadedUrl);
      if (!imgAlt) {
        const cleanName = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
        setImgAlt(cleanName);
      }
    } catch (err: any) {
      setImgError(err?.message || 'Upload failed.');
    } finally {
      setImgUploading(false);
    }
  };

  const insertVideo = () => {
    setVideoError('');
    const { html, error } = buildVideoEmbedHtml(videoUrl, videoCaption);
    if (error || !html) { setVideoError(error || 'Invalid video URL.'); return; }
    insertHtml(html);
    setVideoUrl(''); setVideoCaption(''); setVideoError('');
  };

  const handleFindReplace = () => {
    const e = ed();
    const target = findQuery.trim();
    if (!e || !target) { setFindStatus('Enter text to find.'); return; }
    const escRe = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?![^<]*>)${escRe}`, 'gi');
    const current = e.innerHTML;
    const matches = current.match(re);
    if (!matches || matches.length === 0) {
      setFindStatus('No visible text matches found.');
      return;
    }
    e.innerHTML = current.replace(re, esc(replaceQuery));
    emit();
    setFindStatus(`Replaced ${matches.length} occurrence${matches.length === 1 ? '' : 's'}.`);
  };

  const internalMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles
      .filter((a) => a.id !== currentArticleId && !a.draft && (!q || a.title.toLowerCase().includes(q) || (a.primaryKeyword || '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [articles, query, currentArticleId]);

  const toggle = (p: Panel) => { if (panel === p) { setPanel(null); return; } saveSel(); setPanel(p); };
  const enterGuard = (fn: () => void) => (ev: React.KeyboardEvent) => { if (ev.key === 'Enter') { ev.preventDefault(); fn(); } if (ev.key === 'Escape') setPanel(null); };

  const B = (title: string, onClick: () => void, icon: React.ReactNode, active = false, disabled = false) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`${baseBtn} ${active ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-cyan-300' : ''}`}
    >
      {icon}
    </button>
  );
  const ic = 'w-3.5 h-3.5';

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/80 text-xs">
        {B('Undo (Ctrl+Z)', () => (onUndo ? onUndo() : run('undo')), <Undo2 className={ic} />, false, onUndo ? !canUndo : false)}
        {B('Redo (Ctrl+Y)', () => (onRedo ? onRedo() : run('redo')), <Redo2 className={ic} />, false, onRedo ? !canRedo : false)}
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
        {B('Checklist', insertChecklist, <CheckSquare className={ic} />)}
        {B('Decrease indent (Shift+Tab in lists)', () => run('outdent'), <IndentDecrease className={ic} />)}
        {B('Increase indent (Tab in lists)', () => run('indent'), <IndentIncrease className={ic} />)}
        <Sep />
        {B('Quote', () => run('formatBlock', 'blockquote'), <Quote className={ic} />)}
        {B('Callout / Quick Answer box', () => toggle('callout'), <Info className={ic} />, panel === 'callout')}
        {B('Pros & Cons comparison box', insertProsCons, <Columns2 className={ic} />)}
        {B('Inline code', wrapInlineCode, <Code className={ic} />)}
        {B('Code block', insertCodeBlock, <Terminal className={ic} />)}
        {B('Horizontal line', () => run('insertHorizontalRule'), <Minus className={ic} />)}
        <Sep />
        {B('Insert / edit link (Ctrl+K)', openLink, <Link2 className={ic} />, panel === 'link')}
        {B('Remove link', removeLink, <Unlink className={ic} />)}
        {B('Link to another Briefzy article', () => toggle('internal'), <FileText className={ic} />, panel === 'internal')}
        {B('Insert table', () => toggle('table'), <Table2 className={ic} />, panel === 'table')}
        {B('Add picture (upload or URL)', () => toggle('image'), <ImageIcon className={`${ic} text-indigo-600 dark:text-cyan-400`} />, panel === 'image')}
        {B('Add video (YouTube, Vimeo, Loom, MP4)', () => toggle('video'), <Video className={`${ic} text-rose-500`} />, panel === 'video')}
        <Sep />
        {B('Find & replace text', () => toggle('find'), <Search className={ic} />, panel === 'find')}
        {B('Clear formatting', () => run('removeFormat'), <RemoveFormatting className={`${ic} text-slate-400`} />)}
        {onToggleFullscreen && B(isFullscreen ? 'Exit focus mode' : 'Focus / fullscreen editor', onToggleFullscreen, isFullscreen ? <Minimize2 className={ic} /> : <Maximize2 className={ic} />, isFullscreen)}
      </div>

      {panel && (
        <div className="absolute left-3 top-full z-30 mt-1 w-[min(92vw,390px)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3 space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
              {{ link: 'Insert / Edit Link', internal: 'Internal Briefzy Link', table: 'Insert Table', image: 'Add Picture', video: 'Add Video', color: 'Text Colour', highlight: 'Highlight', callout: 'Callout / Answer Box', find: 'Find & Replace' }[panel]}
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
              <p className="text-[10px] text-slate-500">Select text first to turn it into a Briefzy-colored internal link; otherwise the article title is inserted.</p>
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
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500">Paste image URL or upload directly</span>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFileUpload} />
                <button
                  type="button"
                  disabled={imgUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-cyan-300 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer hover:bg-indigo-100 disabled:opacity-50"
                >
                  <Upload className="w-3 h-3" />
                  <span>{imgUploading ? 'Uploading…' : 'Upload file'}</span>
                </button>
              </div>
              <input autoFocus value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="https://… or /img/… image URL" className={inputCls} onKeyDown={enterGuard(insertImage)} />
              <input value={imgAlt} onChange={(e) => setImgAlt(e.target.value)} placeholder="Alt text (describe the image + keyword for Google Images)" className={inputCls} onKeyDown={enterGuard(insertImage)} />
              <input value={imgCaption} onChange={(e) => setImgCaption(e.target.value)} placeholder="Optional caption displayed under the image" className={inputCls} onKeyDown={enterGuard(insertImage)} />
              {imgError && <p className="text-[11px] text-rose-500 font-semibold">{imgError}</p>}
              <button type="button" onClick={insertImage} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">Insert picture</button>
            </>
          )}

          {panel === 'video' && (
            <>
              <input
                autoFocus
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="YouTube, Vimeo, Loom, or .mp4 URL"
                className={inputCls}
                onKeyDown={enterGuard(insertVideo)}
              />
              <input
                value={videoCaption}
                onChange={(e) => setVideoCaption(e.target.value)}
                placeholder="Optional video caption / title (improves reader dwell time)"
                className={inputCls}
                onKeyDown={enterGuard(insertVideo)}
              />
              {videoError && <p className="text-[11px] text-rose-500 font-semibold">{videoError}</p>}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Uses privacy-enhanced responsive 16:9 framing.</span>
                <button type="button" onClick={insertVideo} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer">Embed video</button>
              </div>
            </>
          )}

          {panel === 'color' && (
            <div className="flex flex-wrap gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button key={c} type="button" title={c} aria-label={`Text colour ${c}`} onClick={() => { restoreSel(); run('foreColor', c); setPanel(null); }} className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer" style={{ background: c }} />
              ))}
              <p className="w-full text-[10px] text-slate-500">Links always keep the Briefzy brand colour. Use &quot;Clear formatting&quot; to reset.</p>
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
              <button type="button" onClick={() => insertCallout('tldr')} className="text-left px-2.5 py-1.5 rounded-lg border-l-4 border-emerald-500 bg-slate-50 dark:bg-slate-800 cursor-pointer"><b>Quick Answer (Speakable)</b> — snippet box for Google &amp; AI answers</button>
              <button type="button" onClick={() => insertCallout('note')} className="text-left px-2.5 py-1.5 rounded-lg border-l-4 border-indigo-500 bg-slate-50 dark:bg-slate-800 cursor-pointer"><b>Note</b> — neutral highlight</button>
              <button type="button" onClick={() => insertCallout('tip')} className="text-left px-2.5 py-1.5 rounded-lg border-l-4 border-emerald-500 bg-slate-50 dark:bg-slate-800 cursor-pointer"><b>Pro tip</b> — helpful advice</button>
              <button type="button" onClick={() => insertCallout('warning')} className="text-left px-2.5 py-1.5 rounded-lg border-l-4 border-amber-500 bg-slate-50 dark:bg-slate-800 cursor-pointer"><b>Heads-up</b> — risk or caveat</button>
            </div>
          )}

          {panel === 'find' && (
            <>
              <input autoFocus value={findQuery} onChange={(e) => setFindQuery(e.target.value)} placeholder="Find phrase…" className={inputCls} onKeyDown={enterGuard(handleFindReplace)} />
              <input value={replaceQuery} onChange={(e) => setReplaceQuery(e.target.value)} placeholder="Replace with…" className={inputCls} onKeyDown={enterGuard(handleFindReplace)} />
              {findStatus && <p className="text-[10px] font-semibold text-indigo-600 dark:text-cyan-400">{findStatus}</p>}
              <button type="button" onClick={handleFindReplace} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">Replace all</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// HTML View Toolbar (for <> HTML source editing with Undo/Redo, Picture, Video & Formatting)
// ---------------------------------------------------------------------------------------------

interface HtmlToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (html: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const HtmlToolbar: React.FC<HtmlToolbarProps> = ({
  textareaRef,
  value,
  onChange,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [panel, setPanel] = useState<null | 'image' | 'video' | 'link'>(null);
  const [imgUrl, setImgUrl] = useState('');
  const [imgAlt, setImgAlt] = useState('');
  const [imgCaption, setImgCaption] = useState('');
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError, setImgError] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCaption, setVideoCaption] = useState('');
  const [videoError, setVideoError] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const insertSnippet = (before: string, after = '', placeholder = '') => {
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}\n${before}${placeholder}${after}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const sel = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorPos = start + before.length + sel.length + after.length;
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleFileUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    setImgError('');
    setImgUploading(true);
    try {
      const url = await uploadImageFile(file);
      setImgUrl(url);
      if (!imgAlt) setImgAlt(file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim());
    } catch (err: any) {
      setImgError(err?.message || 'Upload failed.');
    } finally {
      setImgUploading(false);
    }
  };

  const B = (title: string, onClick: () => void, content: React.ReactNode, active = false, disabled = false) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`${baseBtn} px-2 font-mono text-[11px] font-bold inline-flex items-center gap-1 ${active ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-cyan-300' : ''}`}
    >
      {content}
    </button>
  );
  const ic = 'w-3.5 h-3.5';

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/80 text-xs">
        {B('Undo (Ctrl+Z)', () => onUndo?.(), <Undo2 className={ic} />, false, !canUndo)}
        {B('Redo (Ctrl+Y)', () => onRedo?.(), <Redo2 className={ic} />, false, !canRedo)}
        <Sep />
        {B('Heading 2', () => insertSnippet('<h2>', '</h2>\n', 'Section Heading'), 'H2')}
        {B('Heading 3', () => insertSnippet('<h3>', '</h3>\n', 'Subsection Heading'), 'H3')}
        {B('Paragraph', () => insertSnippet('<p>', '</p>\n', 'Write paragraph here.'), '<p>')}
        {B('Strong / Bold Keyword', () => insertSnippet('<strong>', '</strong>', 'keyword'), <Bold className={ic} />)}
        {B('Italic', () => insertSnippet('<em>', '</em>', 'emphasized phrase'), <Italic className={ic} />)}
        <Sep />
        {B('Bullet List', () => insertSnippet('<ul>\n  <li>', '</li>\n  <li>Second item</li>\n</ul>\n', 'First item'), <List className={ic} />)}
        {B('Checklist', () => insertSnippet('<ul class="checklist">\n  <li>', '</li>\n  <li>Step two</li>\n</ul>\n', 'Step one'), <CheckSquare className={ic} />)}
        {B('Blockquote', () => insertSnippet('<blockquote><p>', '</p></blockquote>\n', 'Key editorial takeaway.'), <Quote className={ic} />)}
        {B('Callout', () => insertSnippet('<div class="callout"><p><strong>Pro tip:</strong> ', '</p></div>\n', 'Highlight point.'), <Info className={ic} />)}
        {B('Pros & Cons', () => insertSnippet('<div class="pros-cons">\n  <div class="pros-col"><h4>Pros</h4><ul><li>Benefit 1</li></ul></div>\n  <div class="cons-col"><h4>Cons</h4><ul><li>Trade-off 1</li></ul></div>\n</div>\n'), <Columns2 className={ic} />)}
        {B('Table', () => insertSnippet('<div class="table-wrap"><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody><tr><td>', '</td><td>Benchmark</td></tr></tbody></table></div>\n', 'Item'), <Table2 className={ic} />)}
        <Sep />
        {B('Insert Link', () => setPanel(panel === 'link' ? null : 'link'), <Link2 className={ic} />, panel === 'link')}
        {B('Add Picture', () => setPanel(panel === 'image' ? null : 'image'), <ImageIcon className={`${ic} text-indigo-600 dark:text-cyan-400`} />, panel === 'image')}
        {B('Add Video', () => setPanel(panel === 'video' ? null : 'video'), <Video className={`${ic} text-rose-500`} />, panel === 'video')}
        <Sep />
        {B('Tidy / Format HTML', () => onChange(beautifyArticleHtml(value)), <><Wand2 className={ic} /><span>Tidy HTML</span></>)}
        {onToggleFullscreen && B(isFullscreen ? 'Exit focus mode' : 'Focus / fullscreen editor', onToggleFullscreen, isFullscreen ? <Minimize2 className={ic} /> : <Maximize2 className={ic} />, isFullscreen)}
      </div>

      {panel && (
        <div className="absolute left-3 top-full z-30 mt-1 w-[min(92vw,380px)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3 space-y-2 text-xs text-slate-700 dark:text-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
              {panel === 'image' ? 'Add Picture HTML' : panel === 'video' ? 'Add Video Embed HTML' : 'Insert Hyperlink HTML'}
            </span>
            <button type="button" onClick={() => setPanel(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-3 h-3" /></button>
          </div>

          {panel === 'link' && (
            <>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://… or /category/slug" className={inputCls} />
              <input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Anchor text" className={inputCls} />
              <button
                type="button"
                onClick={() => {
                  const u = linkUrl.trim();
                  if (!u) return;
                  const ext = /^https?:\/\//i.test(u) && !/briefzy\.me/i.test(u);
                  insertSnippet(`<a href="${esc(u)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>`, '</a>', linkText.trim() || u);
                  setLinkUrl(''); setLinkText(''); setPanel(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold cursor-pointer"
              >
                Insert &lt;a&gt; tag
              </button>
            </>
          )}

          {panel === 'image' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Paste URL or upload file</span>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFileUpload} />
                <button type="button" disabled={imgUploading} onClick={() => fileInputRef.current?.click()} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-cyan-300 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3" /><span>{imgUploading ? 'Uploading…' : 'Upload file'}</span>
                </button>
              </div>
              <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="https://… or /img/…" className={inputCls} />
              <input value={imgAlt} onChange={(e) => setImgAlt(e.target.value)} placeholder="SEO Alt text" className={inputCls} />
              <input value={imgCaption} onChange={(e) => setImgCaption(e.target.value)} placeholder="Optional caption" className={inputCls} />
              {imgError && <p className="text-[11px] text-rose-500">{imgError}</p>}
              <button
                type="button"
                onClick={() => {
                  const tag = buildImageHtml(imgUrl, imgAlt, imgCaption);
                  if (!tag) { setImgError('Image URL required.'); return; }
                  insertSnippet(tag + '\n');
                  setImgUrl(''); setImgAlt(''); setImgCaption(''); setPanel(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold cursor-pointer"
              >
                Insert picture HTML
              </button>
            </>
          )}

          {panel === 'video' && (
            <>
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube, Vimeo, Loom, or .mp4 URL" className={inputCls} />
              <input value={videoCaption} onChange={(e) => setVideoCaption(e.target.value)} placeholder="Optional video caption" className={inputCls} />
              {videoError && <p className="text-[11px] text-rose-500">{videoError}</p>}
              <button
                type="button"
                onClick={() => {
                  const { html, error } = buildVideoEmbedHtml(videoUrl, videoCaption);
                  if (error || !html) { setVideoError(error || 'Invalid video URL.'); return; }
                  insertSnippet(html + '\n');
                  setVideoUrl(''); setVideoCaption(''); setPanel(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
              >
                Insert video HTML
              </button>
            </>
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
  const totalBoldTerms = useMemo(() => (content.match(/<(?:strong|b)\b[^>]*>[\s\S]*?<\/(?:strong|b)>/gi) || []).length, [content]);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip ok={null} label="Words" value={stats.words.toLocaleString()} />
        <Chip ok={null} label="Read" value={`${stats.readingMinutes} min`} />
        {hasKw && <Chip ok={dOk} label="Keyword density" value={`${stats.primaryDensity}% (${stats.primaryCount}×)`} hint="Aim for roughly 0.5–1.5%. Never stuff." />}
        {hasKw && <Chip ok={stats.inFirstParagraph} label="In 1st paragraph" value={stats.inFirstParagraph ? 'yes' : 'no'} />}
        {hasKw && <Chip ok={stats.inHeadings > 0} label="In headings" value={`${stats.inHeadings}/${stats.headingCount}`} />}
        {hasKw && <Chip ok={stats.primaryBold > 0} label="Bold primary" value={`${stats.primaryBold}×`} hint="First mention bold, plus ~2 spread-out mentions." />}
        <Chip ok={totalBoldTerms >= 3} label="SEO bolded terms" value={totalBoldTerms} hint="Primary + relevant secondary + LSI keywords bolded smoothly." />
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
          <Wand2 className="w-3.5 h-3.5" /> Auto-optimize (tidy, bold keywords + LSI, internal links)
        </button>
        {message && <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{message}</span>}
      </div>
    </div>
  );
};
