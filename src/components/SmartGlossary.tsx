import React, { useState } from 'react';
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface GlossaryTerm {
  term: string;
  definition: string;
  whyItMatters: string;
  analogy: string;
  category: 'Finance' | 'Technology' | 'SEO' | 'Strategy';
}

const GLOBAL_GLOSSARY: GlossaryTerm[] = [
  {
    term: 'eCPM',
    definition: 'Effective Cost Per Mille: Total estimated revenue earned by a publisher per 1,000 ad impressions rendered.',
    whyItMatters: 'The benchmark KPI that determines publication monetization efficiency and AdSense algorithmic auction yield.',
    analogy: 'The rental fee earned every time 1,000 drivers pass a highway digital billboard.',
    category: 'Finance',
  },
  {
    term: 'E-E-A-T',
    definition: 'Experience, Expertise, Authoritativeness, and Trustworthiness: Google’s core human quality evaluation framework for search ranking.',
    whyItMatters: 'Governs whether an investigative article ranks on page one of Google or gets relegated to secondary search tiers.',
    analogy: 'A verified board-certified surgeon giving medical analysis versus an anonymous forum comment.',
    category: 'SEO',
  },
  {
    term: 'Zero-Click Search',
    definition: 'A search engine query where the user receives their immediate answer directly on the SERP without clicking through to any website.',
    whyItMatters: 'Forces premium digital publications to produce expansive, proprietary long-form reporting (1,500+ words) that AI snippets cannot compress.',
    analogy: 'Skimming magazine headlines at a kiosk without purchasing the print edition.',
    category: 'SEO',
  },
  {
    term: 'Arbitrage',
    definition: 'The simultaneous purchase and sale of equivalent assets or traffic in different markets to exploit pricing differentials.',
    whyItMatters: 'Provides risk-mitigated margin yield when structural capital or advertising inefficiencies exist.',
    analogy: 'Buying agricultural produce at wholesale farm gates and selling at premium specialty grocery stores.',
    category: 'Finance',
  },
  {
    term: 'Core Web Vitals',
    definition: 'Google’s standardized performance telemetry measuring loading speed (LCP), user responsiveness (INP), and visual stability (CLS).',
    whyItMatters: 'Direct ranking factor and prerequisite for high ad viewability and low reader bounce rate.',
    analogy: 'An automatic hotel revolving door that glides effortlessly without snagging luggage.',
    category: 'Technology',
  },
  {
    term: 'Throughput',
    definition: 'The quantifiable volume of data, transactions, or concurrent sessions processed across a system within a given timeframe.',
    whyItMatters: 'Determines whether digital publishing architectures can sustain sudden viral traffic surges without latency spikes.',
    analogy: 'The number of transit vehicles clearing a toll plaza per minute during peak rush hour.',
    category: 'Technology',
  },
  {
    term: 'Hedging',
    definition: 'A risk-management strategy employed to offset potential downside in an existing asset holding through countervailing positions.',
    whyItMatters: 'Protects institutional balance sheets during macro volatility and liquidity compressions.',
    analogy: 'Purchasing comprehensive storm insurance for your commercial property before hurricane season.',
    category: 'Finance',
  },
  {
    term: 'Tokenomics',
    definition: 'The mathematical economic architecture, incentive structures, and supply distribution governing a digital decentralized asset.',
    whyItMatters: 'Dictates long-term solvency, liquidity depth, and fundamental protocol sustainability.',
    analogy: 'A central bank monetary charter setting reserve ratios, interest benchmarks, and currency issuance.',
    category: 'Finance',
  },
];

interface SmartGlossaryProps {
  content: string;
  onAskCompanion?: (term: string) => void;
}

export const SmartGlossary: React.FC<SmartGlossaryProps> = ({
  content,
  onAskCompanion,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  // Filter glossary terms that match keywords in the article content
  const lowerContent = content.toLowerCase();
  const relevantTerms = GLOBAL_GLOSSARY.filter((g) =>
    lowerContent.includes(g.term.toLowerCase())
  );

  // If no direct matches, show top 4 fundamental terms
  const displayTerms = relevantTerms.length > 0 ? relevantTerms : GLOBAL_GLOSSARY.slice(0, 4);

  return (
    <div className="my-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
              <span>Smart Glossary & Terminology Context</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                {displayTerms.length} Terms Identified
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Master complex financial and technical concepts without switching browser tabs
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs text-indigo-600 dark:text-cyan-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>{isOpen ? 'Hide' : 'View All'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Terms Chips */}
      <div className="flex flex-wrap gap-2 pt-4">
        {displayTerms.map((item, idx) => {
          const isSelected = selectedTerm?.term === item.term;
          return (
            <button
              key={idx}
              onClick={() => setSelectedTerm(isSelected ? null : item)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400'
              }`}
            >
              <span>{item.term}</span>
              <span className="text-[10px] opacity-70">({item.category})</span>
            </button>
          );
        })}
      </div>

      {/* Selected Term Detail Card */}
      {selectedTerm && (
        <div className="mt-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
            <span className="font-bold text-base text-amber-900 dark:text-amber-300">
              {selectedTerm.term}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
              Category: {selectedTerm.category}
            </span>
          </div>

          <div>
            <strong className="text-slate-900 dark:text-white">Definition:</strong>{' '}
            <span>{selectedTerm.definition}</span>
          </div>

          <div>
            <strong className="text-indigo-600 dark:text-cyan-400">Relevance in This Article:</strong>{' '}
            <span>{selectedTerm.whyItMatters}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-amber-500/10 text-xs">
            <strong className="text-emerald-600 dark:text-emerald-400">Everyday Analogy:</strong>{' '}
            <span className="italic">{selectedTerm.analogy}</span>
          </div>

          {onAskCompanion && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onAskCompanion(selectedTerm.term)}
                className="text-xs text-indigo-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Query {selectedTerm.term} in AI Companion →</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Expand all full list */}
      {isOpen && !selectedTerm && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-150">
          {displayTerms.map((item, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
            >
              <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{item.term}</span>
                <span className="text-[10px] text-slate-400">{item.category}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.definition}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
