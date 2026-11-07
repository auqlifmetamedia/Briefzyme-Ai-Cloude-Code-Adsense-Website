import React, { useState } from 'react';
import {
  FileText,
  Zap,
  Smile,
  Microscope,
  Scale,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  hasVisitorKey,
  callVisitorGemini,
  getHeuristicLensContent,
  stripHtml,
} from '../utils/visitorAi.ts';

export type LensMode = 'standard' | 'executive' | 'eli5' | 'deep_dive' | 'contrarian';

interface MultiLensSwitcherProps {
  currentLens: LensMode;
  onChangeLens: (lens: LensMode) => void;
  article: {
    title: string;
    metaDescription: string;
    keyTakeaways: string[];
    content: string;
    primaryKeyword: string;
  };
  onOpenKeyModal: () => void;
}

export const MultiLensSwitcher: React.FC<MultiLensSwitcherProps> = ({
  currentLens,
  onChangeLens,
  article,
  onOpenKeyModal,
}) => {
  const [customAiLensData, setCustomAiLensData] = useState<{
    [key in LensMode]?: { title: string; subtitle: string; content: string };
  }>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const lenses: { id: LensMode; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
    {
      id: 'standard',
      label: 'Standard Brief',
      icon: FileText,
      desc: 'Full original investigative story',
    },
    {
      id: 'executive',
      label: 'Executive (60s)',
      icon: Zap,
      desc: 'Strategic bottom-line & metrics',
    },
    {
      id: 'eli5',
      label: 'ELI5 (Plain English)',
      icon: Smile,
      desc: 'Intuitive analogies without jargon',
    },
    {
      id: 'deep_dive',
      label: 'Deep Technical Dive',
      icon: Microscope,
      desc: 'Architectural & data mechanics',
    },
    {
      id: 'contrarian',
      label: 'Contrarian Debate',
      icon: Scale,
      desc: 'Blind spots, costs & bear case',
    },
  ];

  // Visitor generates custom AI lens analysis using their own Gemini key
  const handleGenerateCustomLens = async (lens: LensMode) => {
    if (lens === 'standard') return;

    if (!hasVisitorKey()) {
      onOpenKeyModal();
      return;
    }

    setIsGenerating(true);
    let promptInstruction = '';
    if (lens === 'executive') {
      promptInstruction =
        'Write a 60-second executive decision memo in 4 distinct sections: Strategic Bottom Line, Velocity & Performance Metrics, Risk Vulnerabilities, and 30-Day Tactical Mandate. Format with clean markdown.';
    } else if (lens === 'eli5') {
      promptInstruction =
        "Explain the fundamental dynamics of this article as if the reader is 5 years old. Use engaging, real-world playground or workshop analogies completely free of corporate jargon.";
    } else if (lens === 'deep_dive') {
      promptInstruction =
        'Provide an exhaustive architectural and systems engineering critique of this topic. Detail operational throughput, empirical bottlenecks, and scalability dynamics.';
    } else if (lens === 'contrarian') {
      promptInstruction =
        'Scrutinize this article through a relentless contrarian and devil’s advocate lens. Highlight consensus blind spots, hidden overhead, regulatory liabilities, and worst-case bear scenarios.';
    }

    const userPrompt = `Deconstruct this investigative briefing through the specified cognitive lens:
Title: ${article.title}
Primary Subject: ${article.primaryKeyword}
Summary: ${article.metaDescription}
Content Excerpt: ${stripHtml(article.content).slice(0, 1800)}`;

    const response = await callVisitorGemini(userPrompt, promptInstruction);
    setIsGenerating(false);

    if (response.text) {
      setCustomAiLensData((prev) => ({
        ...prev,
        [lens]: {
          title: `AI Lens: ${lenses.find((l) => l.id === lens)?.label}`,
          subtitle: 'Dynamically generated via your private Google Gemini API key.',
          content: response.text,
        },
      }));
    } else if (response.error === 'NO_KEY_PROVIDED') {
      onOpenKeyModal();
    }
  };

  const heuristicData = getHeuristicLensContent(currentLens, article);
  const activeCustomAiData = customAiLensData[currentLens];

  return (
    <div className="my-8">
      {/* Lens Selector Bar */}
      <div className="p-2 sm:p-2.5 rounded-3xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between px-3 py-2 mb-1.5 border-b border-slate-200/70 dark:border-slate-800 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>AI Multi-Lens Reading Switcher</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            Tailor analytical depth to your cognitive preference
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
          {lenses.map((lens) => {
            const Icon = lens.icon;
            const isActive = currentLens === lens.id;
            return (
              <button
                key={lens.id}
                onClick={() => onChangeLens(lens.id)}
                className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-cyan-400 shadow-sm border border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                  <span className="font-bold text-xs leading-none">{lens.label}</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  {lens.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Selected Lens Box when not standard */}
      {currentLens !== 'standard' && (
        <div className="mt-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-cyan-500/5 to-transparent border-2 border-indigo-500/30 dark:border-indigo-500/40 shadow-xs animate-in fade-in duration-200">
          {/* Header of the Active Lens */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-indigo-500/20 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                  {activeCustomAiData ? activeCustomAiData.title : heuristicData.title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-cyan-300 border border-indigo-500/20">
                  {activeCustomAiData ? 'Personal AI Active' : 'Instant Pre-Synthesis'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {activeCustomAiData ? activeCustomAiData.subtitle : heuristicData.subtitle}
              </p>
            </div>

            {/* Custom AI Regenerate Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleGenerateCustomLens(currentLens)}
                disabled={isGenerating}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-400/50 hover:border-indigo-600 text-indigo-700 dark:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                title="Generate custom analysis using your Gemini Key"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-cyan-500' : ''}`} />
                <span>{isGenerating ? 'Synthesizing with AI...' : 'Personalize with Gemini AI'}</span>
              </button>
            </div>
          </div>

          {/* Body Content of Active Lens */}
          {activeCustomAiData ? (
            <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
              {activeCustomAiData.content}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {heuristicData.sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {sec.heading}
                    </h4>
                    {sec.badge && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-cyan-300">
                        {sec.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {sec.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Quick Notice to return to original */}
          <div className="mt-6 pt-4 border-t border-indigo-500/20 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Prefer reading the complete investigative manuscript?</span>
            <button
              onClick={() => onChangeLens('standard')}
              className="text-indigo-600 dark:text-cyan-400 font-bold hover:underline cursor-pointer"
            >
              Return to Standard Brief →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
