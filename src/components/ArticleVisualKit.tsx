import React, { useMemo, useState } from 'react';
import type { Article } from '../types.ts';
import {
  buildParagraphImageHtml,
  buildTopicVisualPack,
  pickTopicImages,
  pickTopicVideo,
} from '../utils/articleMediaCatalog.ts';
import { BarChart3, ExternalLink, GitBranch, Layers, Network, PencilRuler, PlayCircle } from 'lucide-react';

/**
 * Interleaves up to 2 topic- and keyword-matched inline <figure> photographs
 * at chapter boundaries if the article body does not already contain >= 2 images.
 */
export function injectInlineParagraphImages(html: string, article: Pick<Article, 'title' | 'primaryKeyword' | 'category'>): string {
  if (!html) return html;
  const imgCount = (html.match(/<img\b/gi) || []).length;
  if (imgCount >= 2) return html;

  const images = pickTopicImages(article);
  const parts = html.split(/(?=<h2[\s>])/i);
  if (parts.length < 3) {
    return imgCount === 0 ? `${html}\n\n${buildParagraphImageHtml(images[0], 1)}` : html;
  }

  const slotA = Math.max(1, Math.min(parts.length - 1, 2));
  const slotB = Math.max(slotA + 1, Math.min(parts.length - 1, Math.floor(parts.length * 0.65)));

  return parts
    .map((chunk, idx) => {
      if (idx === slotA && imgCount === 0) return `${buildParagraphImageHtml(images[0], 1)}\n\n${chunk}`;
      if (idx === slotB && slotB !== slotA) return `${buildParagraphImageHtml(images[1] || images[0], imgCount === 0 ? 2 : 1)}\n\n${chunk}`;
      return chunk;
    })
    .join('');
}

const wrapText = (text: string, max = 18): string[] => {
  const words = String(text || '').trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur ? cur + ' ' : '') + w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
};

interface VisualProps {
  article: Article;
}

export const DataAndInfographicVisual: React.FC<VisualProps> = ({ article }) => {
  const hasInlineVisualCard = useMemo(
    () => /class="[^"]*\bbz-visual-card\b/i.test(article.content || ''),
    [article.content]
  );
  const pack = useMemo(
    () =>
      buildTopicVisualPack({
        title: article.title,
        primaryKeyword: article.primaryKeyword,
        category: article.category,
        secondaryKeywords: article.secondaryKeywords,
      }),
    [article.title, article.primaryKeyword, article.category, article.secondaryKeywords]
  );

  if (hasInlineVisualCard) return null;

  return (
    <section aria-label="Research data benchmark and infographic" className="my-9 space-y-6">
      {/* Real-Data Chart Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-cyan-400 mb-1">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>{pack.topicTag}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white leading-snug">
              {pack.chartTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              {pack.chartSubtitle}
            </p>
          </div>
          <a
            href={pack.chartSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bz-link inline-flex items-center gap-1 text-xs shrink-0"
          >
            <span>Source: {pack.chartSource.year}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-4">
          {pack.metrics.map((m, idx) => (
            <div key={idx}>
              <div className="flex items-baseline justify-between gap-3 text-sm mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{m.label}</span>
                <span className="font-mono tabular-nums font-bold text-indigo-700 dark:text-cyan-300 shrink-0">
                  {m.displayValue}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500"
                  style={{ width: `${Math.max(12, Math.min(100, m.value))}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>
            Reference:{' '}
            <a href={pack.chartSource.url} target="_blank" rel="noopener noreferrer" className="bz-link">
              {pack.chartSource.name}
            </a>
          </span>
          <span className="font-mono tabular-nums">Topic: {article.primaryKeyword}</span>
        </div>
      </div>

      {/* 4-Step Editorial Infographic */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-cyan-400 mb-1">
              <Layers className="w-4 h-4 shrink-0" />
              <span>Visual Infographic</span>
            </div>
            <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
              {pack.infographicTitle}
            </h3>
          </div>
          <a
            href={pack.infographicSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bz-link inline-flex items-center gap-1 text-xs"
          >
            <span>{pack.infographicSource.name}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {pack.infographicSteps.map((st, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="font-mono tabular-nums text-xs font-bold text-indigo-600 dark:text-cyan-400 mb-1.5">
                  Step {st.num}
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 leading-snug">
                  {st.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {st.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const InteractiveDiagramSuite: React.FC<VisualProps> = ({ article }) => {
  const [view, setView] = useState<'all' | 'flowchart' | 'mindmap' | 'sketch'>('all');

  const pack = useMemo(
    () =>
      buildTopicVisualPack({
        title: article.title,
        primaryKeyword: article.primaryKeyword,
        category: article.category,
        secondaryKeywords: article.secondaryKeywords,
      }),
    [article.title, article.primaryKeyword, article.category, article.secondaryKeywords]
  );

  const showFlow = view === 'all' || view === 'flowchart';
  const showMind = view === 'all' || view === 'mindmap';
  const showSketch = view === 'all' || view === 'sketch';

  const branchCoords = [
    { x: 145, y: 78, anchor: 'end' as const, lineEndX: 245, lineEndY: 118 },
    { x: 615, y: 78, anchor: 'start' as const, lineEndX: 515, lineEndY: 118 },
    { x: 145, y: 262, anchor: 'end' as const, lineEndX: 245, lineEndY: 222 },
    { x: 615, y: 262, anchor: 'start' as const, lineEndX: 515, lineEndY: 222 },
  ];

  return (
    <section
      aria-label="Topic diagrams: Flowchart, Mind Map and Architectural Sketch"
      className="my-9 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-indigo-700 dark:text-cyan-400">
            Visual Architecture · {article.category}
          </p>
          <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white mt-0.5">
            Flowchart, Mind Map &amp; Sketch Blueprint for {article.primaryKeyword}
          </h3>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All Diagrams' },
              { id: 'flowchart', label: 'Flowchart' },
              { id: 'mindmap', label: 'Mind Map' },
              { id: 'sketch', label: 'Sketch' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                view === tab.id
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Vector Process Flowchart */}
      {showFlow && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <GitBranch className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
              <span>{pack.flowchartTitle}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Process Flowchart</span>
          </div>

          <div className="overflow-x-auto">
            <svg
              viewBox="0 0 760 175"
              className="w-full min-w-[600px] h-auto"
              role="img"
              aria-label={pack.flowchartTitle}
            >
              <defs>
                <marker id="bz-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#4f46e5" />
                </marker>
              </defs>
              {pack.flowchartNodes.map((node, i) => {
                const x = 14 + i * 190;
                const y = 32;
                const w = 162;
                const h = 92;
                const lines = wrapText(node.step, 18);
                const isDecision = node.role === 'decision';
                const isOutcome = node.role === 'outcome';
                return (
                  <g key={i}>
                    {i < pack.flowchartNodes.length - 1 && (
                      <line
                        x1={x + w + 2}
                        y1={y + h / 2}
                        x2={x + 184}
                        y2={y + h / 2}
                        stroke="#4f46e5"
                        strokeWidth="2"
                        markerEnd="url(#bz-arrow)"
                      />
                    )}
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx={node.role === 'start' || isOutcome ? 16 : 8}
                      fill={isOutcome ? '#ecfdf5' : isDecision ? '#eef2ff' : '#ffffff'}
                      stroke={isOutcome ? '#10b981' : isDecision ? '#4f46e5' : '#94a3b8'}
                      strokeWidth={isDecision || isOutcome ? '2' : '1.5'}
                      strokeDasharray={isDecision ? '5 3' : undefined}
                    />
                    <text x={x + w / 2} y={y + 20} textAnchor="middle" fontSize="10" fontWeight="700" fill="#4f46e5">
                      {node.role === 'start' ? 'START' : node.role === 'decision' ? 'CHECK' : node.role === 'process' ? 'ACTION' : 'OUTCOME'}
                    </text>
                    {lines.map((ln, li) => (
                      <text
                        key={li}
                        x={x + w / 2}
                        y={y + 42 + li * 15}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="700"
                        fill="#0f172a"
                      >
                        {ln}
                      </text>
                    ))}
                    <text x={x + w / 2} y={y + h + 18} textAnchor="middle" fontSize="10" className="fill-slate-600 dark:fill-slate-400">
                      {wrapText(node.note, 26)[0] || ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* 2. Radial Mind Map SVG */}
      {showMind && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Network className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
              <span>Topic Mind Map: {pack.mindMapCenter}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Concept Relations</span>
          </div>

          <div className="overflow-x-auto">
            <svg
              viewBox="0 0 760 340"
              className="w-full min-w-[600px] h-auto"
              role="img"
              aria-label={`Mind map for ${pack.mindMapCenter}`}
            >
              {/* Curved connectors */}
              {pack.mindMapBranches.slice(0, 4).map((_, idx) => {
                const c = branchCoords[idx];
                const midX = (380 + c.lineEndX) / 2;
                return (
                  <path
                    key={`path-${idx}`}
                    d={`M 380 170 C ${midX} 170, ${midX} ${c.lineEndY}, ${c.lineEndX} ${c.lineEndY}`}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.2"
                  />
                );
              })}

              {/* Center topic pill */}
              <rect x="275" y="132" width="210" height="76" rx="18" fill="#4f46e5" />
              {wrapText(pack.mindMapCenter, 22).map((ln, i, arr) => (
                <text
                  key={i}
                  x="380"
                  y={170 - (arr.length - 1) * 8 + i * 18}
                  textAnchor="middle"
                  fontSize="13.5"
                  fontWeight="700"
                  fill="#ffffff"
                >
                  {ln}
                </text>
              ))}

              {/* 4 Branches */}
              {pack.mindMapBranches.slice(0, 4).map((b, idx) => {
                const isLeft = idx % 2 === 0;
                const boxX = isLeft ? 20 : 515;
                const boxY = idx < 2 ? 22 : 196;
                return (
                  <g key={b.branch}>
                    <rect
                      x={boxX}
                      y={boxY}
                      width="225"
                      height="118"
                      rx="14"
                      fill="#ffffff"
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                    />
                    <rect x={boxX} y={boxY} width="225" height="30" rx="14" fill="#e0e7ff" />
                    <text x={boxX + 14} y={boxY + 20} fontSize="12" fontWeight="700" fill="#312e81">
                      {b.branch}
                    </text>
                    {b.nodes.slice(0, 3).map((nodeText, ni) => (
                      <text
                        key={ni}
                        x={boxX + 16}
                        y={boxY + 54 + ni * 22}
                        fontSize="11.5"
                        fontWeight="500"
                        fill="#334155"
                      >
                        • {nodeText.length > 28 ? nodeText.slice(0, 26) + '...' : nodeText}
                      </text>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* 3. Architectural / Hand-Drawn Sketch Blueprint SVG */}
      {showSketch && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfaf7] dark:bg-slate-950 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-cyan-400">
                <PencilRuler className="w-4 h-4" />
                <span>Editorial Sketch Blueprint</span>
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {pack.sketchTitle}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{pack.sketchSubtitle}</p>
            </div>
            <a
              href={pack.sketchSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bz-link inline-flex items-center gap-1 text-xs"
            >
              <span>{pack.sketchSource.name}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="overflow-x-auto mb-4">
            <svg
              viewBox="0 0 760 155"
              className="w-full min-w-[600px] h-auto"
              role="img"
              aria-label={pack.sketchTitle}
            >
              <defs>
                <pattern id="bz-dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#94a3b8" fillOpacity="0.35" />
                </pattern>
              </defs>
              <rect width="760" height="155" rx="12" fill="url(#bz-dot-grid)" stroke="#cbd5e1" strokeDasharray="6 4" />
              {pack.sketchCallouts.map((c, idx) => {
                const bx = 22 + idx * 246;
                const by = 22;
                return (
                  <g key={idx}>
                    {idx < pack.sketchCallouts.length - 1 && (
                      <path
                        d={`M ${bx + 226} ${by + 54} Q ${bx + 236} ${by + 38} ${bx + 245} ${by + 54}`}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />
                    )}
                    <rect
                      x={bx}
                      y={by}
                      width="224"
                      height="110"
                      rx="10"
                      fill="#ffffff"
                      stroke="#334155"
                      strokeWidth="1.75"
                      strokeDasharray="10 2 4 2"
                    />
                    <text x={bx + 14} y={by + 25} fontSize="11" fontWeight="700" fill="#4f46e5">
                      {c.metric}
                    </text>
                    <text x={bx + 14} y={by + 45} fontSize="12.5" fontWeight="700" fill="#0f172a">
                      {c.label}
                    </text>
                    {wrapText(c.note, 31).map((ln, li) => (
                      <text key={li} x={bx + 14} y={by + 67 + li * 15} fontSize="10.5" fill="#475569">
                        {ln}
                      </text>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </section>
  );
};

export const EndVideoEmbedSection: React.FC<VisualProps> = ({ article }) => {
  const hasInlineVideo = useMemo(
    () => /<(iframe|video)\b/i.test(article.content || '') || /class="[^"]*\bvideo-wrap\b/i.test(article.content || ''),
    [article.content]
  );
  const video = useMemo(
    () =>
      pickTopicVideo({
        title: article.title,
        primaryKeyword: article.primaryKeyword,
        category: article.category,
      }),
    [article.title, article.primaryKeyword, article.category]
  );

  if (hasInlineVideo) return null;

  return (
    <section
      aria-label="Topic video walkthrough"
      className="my-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-cyan-400">
            <PlayCircle className="w-4 h-4 shrink-0" />
            <span>Video Walkthrough · {video.channel}</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white mt-0.5">
            {video.title}
          </h3>
        </div>
        <a
          href={video.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bz-link inline-flex items-center gap-1 text-xs shrink-0"
        >
          <span>Watch on YouTube</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
        {video.summary}
      </p>

      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800">
        <iframe
          src={video.embedUrl}
          title={video.title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </section>
  );
};
