import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  User,
  Bot,
  Key,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  hasVisitorKey,
  callVisitorGemini,
  stripHtml,
} from '../utils/visitorAi.ts';
import { Article } from '../types.ts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  source?: 'gemini' | 'heuristic_faq' | 'heuristic_summary';
}

interface ArticleCompanionProps {
  article: Article;
  onOpenKeyModal: () => void;
}

export const ArticleCompanion: React.FC<ArticleCompanionProps> = ({
  article,
  onOpenKeyModal,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am your AI Research Companion for "${article.title}". You can query this article about executive implications, market repercussions, or specific tactical recommendations.`,
      source: 'heuristic_summary',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const quickChips = [
    'What are the most critical business implications?',
    'Provide 3 actionable execution steps',
    'What are the biggest unaddressed downside risks?',
    'Synthesize the core framework in 1 concise paragraph',
  ];

  const handleAsk = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isLoading) return;

    // Add user question
    const updatedMessages: Message[] = [...messages, { role: 'user', content: q }];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    const hasKey = hasVisitorKey();

    if (hasKey) {
      // Call Gemini API using visitor's own key
      const systemPrompt = `You are a world-class senior investigative research companion for Tier-1 publication Briefzy (briefzy.me). Your role is to answer reader inquiries regarding the article "${article.title}" with incisive, factual, articulate, executive-grade analysis in fluent English. When relevant, offer structured takeaways, tactical execution steps, or brief real-world business analogies.`;

      const userPrompt = `ARTICLE CONTEXT:
Title: ${article.title}
Subject: ${article.primaryKeyword}
Summary: ${article.metaDescription}
Key Takeaways: ${article.keyTakeaways?.join('; ') || ''}
Article Excerpt: ${stripHtml(article.content).slice(0, 3000)}

READER INQUIRY: "${q}"`;

      const response = await callVisitorGemini(userPrompt, systemPrompt);
      setIsLoading(false);

      if (response.text) {
        setMessages([
          ...updatedMessages,
          {
            role: 'assistant',
            content: response.text,
            source: 'gemini',
          },
        ]);
      } else {
        setMessages([
          ...updatedMessages,
          {
            role: 'assistant',
            content:
              'Encountered an issue processing your query with your Gemini key. Please verify your API key is active with available quota.',
            source: 'heuristic_summary',
          },
        ]);
      }
    } else {
      // Fallback without visitor key: Search in-article FAQs & Key takeaways
      setTimeout(() => {
        setIsLoading(false);
        const lowerQ = q.toLowerCase();

        // Check FAQs first
        const matchedFaq = article.faqs?.find(
          (f) =>
            f.question.toLowerCase().includes(lowerQ) ||
            f.answer.toLowerCase().includes(lowerQ) ||
            lowerQ.split(' ').some((word) => word.length > 3 && f.question.toLowerCase().includes(word))
        );

        let answer = '';
        if (matchedFaq) {
          answer = `Based on the editorial documentation for "${matchedFaq.question}":\n\n${matchedFaq.answer}`;
        } else if (lowerQ.includes('implication') || lowerQ.includes('business') || lowerQ.includes('step')) {
          answer = `Based on the key findings of "${article.title}":\n\n1. ${
            article.keyTakeaways?.[0] || 'Mandates rapid tactical adaptation on core operational infrastructure.'
          }\n2. ${
            article.keyTakeaways?.[1] || 'Cost containment and systemic risk insulation.'
          }\n3. ${
            article.keyTakeaways?.[2] || 'Continuous empirical measurement of key velocity metrics.'
          }\n\n💡 *Tip: Connect your free Gemini API Key to enable limitless, deep conversational reasoning!*`;
        } else {
          answer = `Based on the editorial executive brief "${article.title}": ${article.metaDescription}\n\nPrimary analytical pillars: ${
            article.keyTakeaways?.slice(0, 2).join(' as well as ') || 'strategic foresight and operational discipline'
          }.\n\n💡 *Want bespoke, conversational answers tailored to your specific team? Add your free Google Gemini API key to unlock full AI capabilities!*`;
        }

        setMessages([
          ...updatedMessages,
          {
            role: 'assistant',
            content: answer,
            source: 'heuristic_faq',
          },
        ]);
      }, 500);
    }
  };

  return (
    <div className="my-10 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900/10 via-slate-900/5 to-cyan-900/10 dark:from-indigo-950/60 dark:via-slate-900/40 dark:to-cyan-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
              <span>AI Smart Companion</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-cyan-300 border border-indigo-500/20">
                Ask This Article Anything
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Query strategic implications, clarify complexities, or explore edge cases interactively
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!hasVisitorKey() && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenKeyModal();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-400/50 bg-white dark:bg-slate-800 text-indigo-700 dark:text-cyan-300 text-xs font-semibold hover:border-indigo-600 transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Connect Gemini Key</span>
            </button>
          )}

          <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Chat Area */}
      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-4">
          {/* Messages list */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-xs sm:text-sm ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`p-3.5 sm:p-4 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-medium rounded-tr-xs'
                      : 'bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.source === 'gemini' && (
                    <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-cyan-500 font-mono flex items-center gap-1">
                      <span>Powered by Gemini 3.8 Flash (Your Key)</span>
                    </div>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 items-center text-xs text-slate-400">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span>Analyzing deep context...</span>
              </div>
            )}
          </div>

          {/* Quick Questions Chips */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Recommended Inquiries:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleAsk(chip)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-cyan-400 text-slate-700 dark:text-slate-300 text-xs transition-colors cursor-pointer text-left disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(inputText);
            }}
            className="flex items-center gap-2 pt-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask any specific question about this article..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40 transition-transform active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          {/* BYOK Note */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-500" />
              Context-grounded editorial intelligence
            </span>
            <button
              onClick={onOpenKeyModal}
              className="text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>{hasVisitorKey() ? 'Your Gemini Key is Active' : 'Connect Free Gemini API Key'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
