import React, { useState } from 'react';
import { adminFetch } from '../../utils/remote.ts';
import {
  Sparkles,
  ListTree,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

interface AiSeoAssistantProps {
  topic: string;
  category: string;
  primaryKeyword: string;
  currentTitle: string;
  currentMetaDescription: string;
  currentContent: string;
  fieldNotes?: string;
  onApplyOutline?: (outlineText: string, suggestedTitle?: string, suggestedSlug?: string) => void;
  onOutlineGenerated?: (outline: any) => void;
  onExpandOutline?: (outline: any) => Promise<void> | void;
  onApplyKeyword?: (keyword: string, lsiKeywords?: string[]) => void;
  onApplyTitle?: (title: string) => void;
  onApplyMeta?: (meta: string) => void;
  onAutoFixEeat?: (action: string) => void;
}

export const AiSeoAssistant: React.FC<AiSeoAssistantProps> = ({
  topic,
  category,
  primaryKeyword,
  currentTitle,
  currentMetaDescription,
  currentContent,
  fieldNotes = '',
  onApplyOutline,
  onOutlineGenerated,
  onExpandOutline,
  onApplyKeyword,
  onApplyTitle,
  onApplyMeta,
  onAutoFixEeat,
}) => {
  const [activeTab, setActiveTab] = useState<'outline' | 'keywords' | 'audit' | 'copilot'>('outline');
  const [loading, setLoading] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Assistant states
  const [outlineData, setOutlineData] = useState<any>(null);
  const [keywordData, setKeywordData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: 'Hi! I am your Briefzy SEO Copilot. I can help generate comprehensive article outlines, suggest high-paying Tier 1 keywords, or audit your draft against Google\'s Helpful Content & E-E-A-T guidelines.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // 1. Generate Article Outline
  const handleGenerateOutline = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/seo/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'outline',
          topic: topic || currentTitle || 'Enterprise Artificial Intelligence',
          category,
          primaryKeyword,
          fieldNotes,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setOutlineData(data.data);
        onOutlineGenerated?.(data.data);
      }
    } catch (err) {
      console.error('Failed to generate outline:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Suggest Keywords
  const handleSuggestKeywords = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/seo/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'keywords',
          topic: topic || currentTitle || primaryKeyword,
          category,
          primaryKeyword,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setKeywordData(data.data);
      }
    } catch (err) {
      console.error('Failed to suggest keywords:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Real-time SEO Audit
  const handleAuditSeo = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/seo/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'seo-audit',
          title: currentTitle || topic,
          metaDescription: currentMetaDescription,
          primaryKeyword: primaryKeyword || topic,
          category,
          content: currentContent,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setAuditData(data.data);
      }
    } catch (err) {
      console.error('Failed to audit SEO:', err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Chat with Assistant
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;

    const userText = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setLoading(true);

    try {
      const res = await adminFetch('/api/seo/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          prompt: userText,
          topic,
          primaryKeyword,
          category,
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: data.reply || 'Analysis completed.' },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: 'I am currently processing offline. Please check your title length and ensure your primary keyword is within the first 100 words.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-amber-300/60 dark:border-amber-900/40 bg-gradient-to-b from-amber-50/40 via-white to-white dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-900 shadow-lg overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="p-4 md:p-5 border-b border-amber-200/50 dark:border-slate-800 bg-amber-500/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Briefzy AI SEO Assistant</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Google E-E-A-T Co-Pilot
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time Google SEO audits, outlines & high-CPC keyword discovery
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs">
          <span className="text-[11px] text-slate-400">Targeting:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
            Tier-1 Markets (US/UK/CA)
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
        <button
          onClick={() => {
            setActiveTab('outline');
            if (!outlineData) handleGenerateOutline();
          }}
          className={`flex-1 py-3 px-3 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'outline'
              ? 'border-amber-500 text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ListTree className="w-4 h-4" />
          <span>Outline Generator</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('keywords');
            if (!keywordData) handleSuggestKeywords();
          }}
          className={`flex-1 py-3 px-3 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'keywords'
              ? 'border-amber-500 text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Keyword Suggestions</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('audit');
            if (!auditData) handleAuditSeo();
          }}
          className={`flex-1 py-3 px-3 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'audit'
              ? 'border-amber-500 text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Real-Time SEO Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('copilot')}
          className={`flex-1 py-3 px-3 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'copilot'
              ? 'border-amber-500 text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>SEO Chat</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5 flex-1 min-h-[320px]">
        {/* 1. OUTLINE TAB */}
        {activeTab === 'outline' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Google SGE-Optimized Article Outline
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Topic: <strong>{topic || primaryKeyword || 'Current Brief'}</strong>
                </p>
              </div>

              <button
                onClick={handleGenerateOutline}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{outlineData ? 'Regenerate Outline' : 'Generate Outline'}</span>
              </button>
            </div>

            {loading && !outlineData ? (
              <div className="text-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-amber-500" />
                <p className="text-xs">Analyzing Google SERP intent & synthesizing outline...</p>
              </div>
            ) : outlineData ? (
              <div className="space-y-3.5">
                {/* Working title preview */}
                <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-400">
                      Recommended Title
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      {outlineData.workingTitle}
                    </h5>
                  </div>
                  {onApplyTitle && (
                    <button
                      onClick={() => onApplyTitle(outlineData.workingTitle)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs cursor-pointer shrink-0"
                    >
                      Use Title
                    </button>
                  )}
                </div>

                {/* Metadata details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Search Intent</span>
                    <span className="font-bold text-slate-900 dark:text-white">{outlineData.searchIntent}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Target Words</span>
                    <span className="font-bold text-slate-900 dark:text-white">~{outlineData.estimatedWordCount} words</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Suggested Slug</span>
                    <span className="font-mono text-[11px] font-semibold text-amber-800 dark:text-amber-400 truncate block">
                      /{outlineData.suggestedSlug}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Target Readers</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block">
                      {outlineData.targetAudience}
                    </span>
                  </div>
                </div>

                {/* Section breakdown */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Structural Sections & H2/H3 Architecture:
                  </span>
                  {outlineData.sections?.map((sec: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center text-[10px]">
                            H2
                          </span>
                          <span>{sec.heading}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">~{sec.targetWords} words</span>
                      </div>
                      {sec.subtopics && (
                        <div className="pl-6 space-y-0.5 text-slate-600 dark:text-slate-400">
                          {sec.subtopics.map((sub: string, sIdx: number) => (
                            <div key={sIdx} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                              <span>{sub}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {sec.recommendedCitations && (
                        <div className="pl-6 text-[11px] text-amber-700 dark:text-amber-400 italic">
                          Citation tip: {sec.recommendedCitations}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions: Expand into 3,000+ Words (Primary) & Apply Skeleton (Secondary) */}
                <div className="space-y-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  {onExpandOutline && (
                    <button
                      onClick={async () => {
                        setIsExpanding(true);
                        try {
                          await onExpandOutline(outlineData);
                        } finally {
                          setIsExpanding(false);
                        }
                      }}
                      disabled={isExpanding}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.01]"
                    >
                      {isExpanding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                          <span>Expanding Outline into 3,000+ Words...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-slate-950" />
                          <span>Expand Outline into 3,000+ Word Article</span>
                          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-950/15 text-slate-950 font-bold uppercase tracking-wider">
                            3,000+ Words
                          </span>
                        </>
                      )}
                    </button>
                  )}

                  {onApplyOutline && (
                    <button
                      onClick={() => {
                        const outlineHtml = outlineData.sections
                          ?.map(
                            (sec: any) =>
                              `<h2>${sec.heading}</h2>\n<p>[Analysis addressing: ${sec.subtopics?.join(', ')}]</p>`
                          )
                          .join('\n\n');
                        onApplyOutline(outlineHtml, outlineData.workingTitle, outlineData.suggestedSlug);
                      }}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>Apply Outline Skeleton Only (H2 & Subtopics)</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click "Generate Outline" to craft an authoritative editorial structure based on Google E-E-A-T criteria.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. KEYWORDS TAB */}
        {activeTab === 'keywords' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Tier-1 Keyword Intelligence & AdSense CPC Explorer
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Target: United States, United Kingdom, Canada, Australia
                </p>
              </div>
              <button
                onClick={handleSuggestKeywords}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                <span>Refresh Keywords</span>
              </button>
            </div>

            {loading && !keywordData ? (
              <div className="text-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-amber-500" />
                <p className="text-xs">Mining Tier-1 search intent, volume & CPC benchmarks...</p>
              </div>
            ) : keywordData ? (
              <div className="space-y-4 text-xs">
                {/* Primary Keyword Hero Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-300/60 dark:border-amber-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                      Primary Target Keyword
                    </span>
                    <h5 className="text-base font-bold text-slate-900 dark:text-white">
                      {keywordData.primaryKeyword}
                    </h5>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="text-[10px] text-slate-400">Monthly Volume</div>
                      <div className="font-bold text-slate-900 dark:text-white">{keywordData.primaryVolume?.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Est. AdSense CPC</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">{keywordData.primaryCpc}</div>
                    </div>
                  </div>
                </div>

                {/* Secondary LSI Keywords Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-600 dark:text-slate-300 grid grid-cols-12">
                    <span className="col-span-5">Secondary / LSI Keyword</span>
                    <span className="col-span-2 text-center">Volume</span>
                    <span className="col-span-2 text-center">AdSense CPC</span>
                    <span className="col-span-3 text-right">Action</span>
                  </div>
                  {keywordData.secondaryKeywords?.map((kw: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-white dark:bg-slate-900 grid grid-cols-12 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <span className="col-span-5 font-medium text-slate-900 dark:text-white truncate">
                        {kw.keyword}
                      </span>
                      <span className="col-span-2 text-center text-slate-600 dark:text-slate-400 font-mono">
                        {kw.volume?.toLocaleString()}
                      </span>
                      <span className="col-span-2 text-center text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                        {kw.cpc}
                      </span>
                      <div className="col-span-3 text-right">
                        {onApplyKeyword && (
                          <button
                            onClick={() => onApplyKeyword(kw.keyword)}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-semibold text-[11px] cursor-pointer transition-colors"
                          >
                            Add to LSI
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Long-tail Questions for FAQ Schema */}
                {keywordData.longTailQuestions && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Questions People Ask (Google "People Also Ask" Engine)</span>
                    </div>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                      {keywordData.longTailQuestions.map((q: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                <KeyRound className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-xs text-slate-500">
                  Click "Refresh Keywords" to uncover high-CPC search terms and Tier-1 audience volume.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 3. REAL-TIME SEO AUDIT TAB */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Live Google SEO & Helpful Content Audit
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Instant evaluation of title, meta description, keyword density, and E-E-A-T signals
                </p>
              </div>
              <button
                onClick={handleAuditSeo}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Re-Audit Draft</span>
              </button>
            </div>

            {loading && !auditData ? (
              <div className="text-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-amber-500" />
                <p className="text-xs">Auditing content against 2026 Google algorithm updates...</p>
              </div>
            ) : auditData ? (
              <div className="space-y-4 text-xs">
                {/* Score Bar */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Overall Content Readiness Score
                    </span>
                    <h5 className="text-2xl font-black font-heading text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{auditData.overallScore}/100</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        auditData.overallScore >= 90
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {auditData.overallScore >= 90 ? 'Ready for Google Index' : 'Optimization Recommended'}
                      </span>
                    </h5>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">E-E-A-T Rating</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {auditData.contentAnalysis?.eeatRating || 'High'}
                    </span>
                  </div>
                </div>

                {/* Helpful Content & E-E-A-T Signal Breakdown */}
                {auditData.helpfulContentMetrics && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Title Case</span>
                      <span className={`font-bold ${auditData.helpfulContentMetrics.titleCaseOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                        {auditData.helpfulContentMetrics.titleCaseOk ? 'Clean' : 'Lowercase'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Title Promise</span>
                      <span className={`font-bold ${auditData.helpfulContentMetrics.promiseAligned ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                        {auditData.helpfulContentMetrics.promiseAligned ? 'Aligned' : 'Gap Found'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Uniqueness</span>
                      <span className={`font-bold ${auditData.helpfulContentMetrics.uniqueParagraphPct >= 95 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                        {auditData.helpfulContentMetrics.uniqueParagraphPct}% Unique
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Experience</span>
                      <span className={`font-bold ${auditData.helpfulContentMetrics.hasExperienceSignals ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                        {auditData.helpfulContentMetrics.hasExperienceSignals ? 'Verified' : 'Missing'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Sources &amp; Limits</span>
                      <span className={`font-bold ${auditData.helpfulContentMetrics.hasSourcesAndLimits ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                        {auditData.helpfulContentMetrics.hasSourcesAndLimits ? 'Cited' : 'Incomplete'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Guidelines Checklist */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block mb-2">
                    Google Algorithm Compliance Checklist
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {auditData.googleGuidelinesChecklist?.map((chk: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        {chk.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <span className={chk.passed ? 'text-slate-700 dark:text-slate-300' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                          {chk.item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actionable Fixes & Priority Advice */}
                {auditData.contentAnalysis?.actionableFixes && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Actionable Fixes for Higher SERP Rankings:</span>
                      </div>
                      {onAutoFixEeat && (
                        <button
                          type="button"
                          onClick={() => {
                            onAutoFixEeat('upgrade-eeat');
                            setTimeout(() => void handleAuditSeo(), 150);
                          }}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] cursor-pointer transition-colors"
                        >
                          Apply Fixes to Draft
                        </button>
                      )}
                    </div>
                    <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                      {auditData.contentAnalysis.actionableFixes.map((fix: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-xs text-slate-500">
                  Click "Re-Audit Draft" to analyze your current article inputs against Google SEO standards.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4. CHAT TAB */}
        {activeTab === 'copilot' && (
          <div className="flex flex-col h-[340px]">
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Analyzing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask SEO question (e.g. 'How to optimize for Google AI snapshots?')..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={loading || !chatInput.trim()}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
