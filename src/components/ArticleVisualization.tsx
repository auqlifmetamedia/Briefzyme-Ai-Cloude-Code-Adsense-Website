import React, { useMemo, useState } from 'react';
import { BarChart3, GitBranch, Sparkles, CheckCircle2, ExternalLink } from 'lucide-react';
import type { Article } from '../types.ts';
import { deriveArticleVisualization, getDomainPalette } from '../utils/topicVisuals.ts';

interface Props {
  article: Article;
}

export const ArticleVisualization: React.FC<Props> = ({ article }) => {
  const viz = useMemo(
    () =>
      article.visualization && article.visualization.nodes?.length
        ? article.visualization
        : deriveArticleVisualization(article),
    [article]
  );

  const palette = useMemo(
    () => getDomainPalette(`${article.title} ${article.primaryKeyword}`, article.category),
    [article.title, article.primaryKeyword, article.category]
  );

  const [tab, setTab] = useState<'flow' | 'chart'>('flow');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const activeNode = viz.nodes[selectedIdx] || viz.nodes[0];

  return (
    <section
      aria-label="Topic Visual Breakdown"
      className="my-10 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/80 dark:bg-slate-950/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{palette.label} Visual Map</span>
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
            {viz.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{viz.subtitle}</p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTab('flow')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === 'flow'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Concept Flow
          </button>
          <button
            type="button"
            onClick={() => setTab('chart')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === 'chart'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Verified Data
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {tab === 'flow' ? (
          <div className="space-y-5">
            {/* Visual Interactive Diagram Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {viz.nodes.map((node, idx) => {
                const isActive = idx === selectedIdx;
                return (
                  <button
                    key={`${node.label}-${idx}`}
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    className={`group relative text-left p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-sm ring-1 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-extrabold ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      {node.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {node.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-3">
                      {node.label}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Active Node Detail Box */}
            {activeNode && (
              <div className="rounded-2xl border border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/60 via-white to-cyan-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-cyan-950/20 p-4 sm:p-5 flex items-start gap-3.5">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {activeNode.badge || `Stage ${selectedIdx + 1}`} — {activeNode.label}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    {activeNode.detail}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Empirical benchmarks &amp; published standards relevant to{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{article.primaryKeyword}</span>
            </div>
            <div className="space-y-3.5">
              {viz.bars.map((bar, idx) => (
                <div key={`${bar.label}-${idx}`} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{bar.label}</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {bar.displayValue || `${bar.value}%`}
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(12, bar.value))}%`,
                        background: `linear-gradient(90deg, ${palette.accent}, ${palette.highlight})`,
                      }}
                    />
                  </div>
                  {(bar.note || bar.source) && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {bar.note}
                      {bar.source ? <span className="font-semibold text-slate-600 dark:text-slate-300"> ({bar.source})</span> : null}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {(viz.sourceSummary || viz.sourceUrl) && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Source: <strong className="text-slate-700 dark:text-slate-200">{viz.sourceSummary || 'Credible Public Standards'}</strong></span>
                {viz.sourceUrl && (
                  <a
                    href={viz.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-cyan-400 hover:underline"
                  >
                    <span>Verify Primary Report</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
