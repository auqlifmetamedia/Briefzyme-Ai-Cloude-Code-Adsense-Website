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
  category: 'AI Tools' | 'Online Security' | 'Tech How-To' | 'Remote Work' | 'SEO';
}

const GLOBAL_GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Prompt Engineering',
    definition: 'Structuring clear instructions, context, examples, and output constraints when working with AI language models.',
    whyItMatters: 'Well-framed prompts eliminate vague generic replies and cut editing time in half.',
    analogy: 'Giving a carpenter exact cabinet dimensions and wood specs instead of saying "build a shelf."',
    category: 'AI Tools',
  },
  {
    term: 'Context Window',
    definition: 'The maximum amount of text, code, or documents an AI assistant can hold in working memory during one conversation.',
    whyItMatters: 'Knowing context limits prevents the model from forgetting earlier instructions on long files.',
    analogy: 'The size of your desk—larger desks let you spread out multiple reference binders at once.',
    category: 'AI Tools',
  },
  {
    term: 'RAG (Retrieval-Augmented Generation)',
    definition: 'Connecting an AI model to your verified documents or database so answers rely on real source files instead of guesswork.',
    whyItMatters: 'Dramatically reduces fabricated facts and keeps company workflows auditable.',
    analogy: 'Taking an open-book exam with indexed reference manuals right beside you.',
    category: 'AI Tools',
  },
  {
    term: 'Passkey',
    definition: 'A cryptographic sign-in credential stored on your phone or laptop that replaces typed passwords with biometrics or device PIN.',
    whyItMatters: 'Immune to traditional phishing sites because the credential is mathematically bound to the real domain.',
    analogy: 'A smart hotel key that only unlocks the exact room door it was issued for—never a decoy door.',
    category: 'Online Security',
  },
  {
    term: 'Two-Factor Authentication',
    definition: 'A second verification layer beyond your password—ideally an authenticator app or hardware security key.',
    whyItMatters: 'Blocks over 99% of automated credential-stuffing and leaked-password account takeovers.',
    analogy: 'Needing both your front door key and a one-time alarm code to enter your house.',
    category: 'Online Security',
  },
  {
    term: 'Phishing',
    definition: 'Deceptive emails, texts, or fake sign-in pages crafted to trick people into revealing logins or payment details.',
    whyItMatters: 'Still the number-one entry point for consumer account hijacks and identity theft.',
    analogy: 'A caller pretending to be your bank teller asking for your PIN "to verify your account."',
    category: 'Online Security',
  },
  {
    term: 'Mesh Wi-Fi',
    definition: 'A multi-node home router system that shares one network name across multiple rooms to eliminate wireless dead zones.',
    whyItMatters: 'Keeps video calls, cloud backups, and smart home devices stable across floors without manual switching.',
    analogy: 'Syncing paired walkie-talkie repeaters so your signal stays strong from basement to attic.',
    category: 'Tech How-To',
  },
  {
    term: 'Core Web Vitals',
    definition: 'Google’s standardized performance metrics measuring page load speed (LCP), responsiveness (INP), and visual stability (CLS).',
    whyItMatters: 'Fast, layout-stable pages rank higher in search and feel effortless on mobile connections.',
    analogy: 'An automatic hotel revolving door that glides smoothly without snagging luggage.',
    category: 'SEO',
  },
  {
    term: 'Asynchronous Work',
    definition: 'Collaborating across teammates via clear written updates, docs, and recorded walkthroughs without requiring everyone online simultaneously.',
    whyItMatters: 'Protects deep focus blocks and eliminates unnecessary calendar meetings across time zones.',
    analogy: 'Leaving detailed shift notes on a clean clipboard rather than calling a 60-minute team huddle.',
    category: 'Remote Work',
  },
  {
    term: 'Deep Work',
    definition: 'Uninterrupted blocks of distraction-free concentration dedicated to demanding creative or analytical tasks.',
    whyItMatters: 'Producing high-quality remote output relies more on protected focus blocks than hours logged in chat.',
    analogy: 'Closing your studio door and silencing phones while painting a detailed canvas.',
    category: 'Remote Work',
  },
  {
    term: 'E-E-A-T',
    definition: 'Experience, Expertise, Authoritativeness, and Trustworthiness: Google’s quality evaluation framework for helpful content.',
    whyItMatters: 'Signals to search engines and AI answer engines that a guide reflects real hands-on testing.',
    analogy: 'Trusting a mechanic who shows step-by-step repair photos over an anonymous comment.',
    category: 'SEO',
  },
  {
    term: 'End-to-End Encryption',
    definition: 'Scrambling messages or files on the sender’s device so only the intended recipient holds the key to read them.',
    whyItMatters: 'Protects sensitive conversations even if a service provider or public Wi-Fi network is compromised.',
    analogy: 'Sending a locked steel box whose combination only you and the receiver know.',
    category: 'Online Security',
  },
];

interface SmartGlossaryProps {
  content: string;
  category?: string;
}

export const SmartGlossary: React.FC<SmartGlossaryProps> = ({
  content,
  category = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  const lowerContent = (content || '').toLowerCase();
  const catLower = category.toLowerCase();

  // Prioritize terms mentioned in text, then terms matching the article category
  const mentioned = GLOBAL_GLOSSARY.filter((g) => lowerContent.includes(g.term.toLowerCase()));
  const byCategory = GLOBAL_GLOSSARY.filter((g) => {
    if (mentioned.some((m) => m.term === g.term)) return false;
    if (catLower.includes('security') && g.category === 'Online Security') return true;
    if (catLower.includes('ai') && g.category === 'AI Tools') return true;
    if (catLower.includes('remote') && g.category === 'Remote Work') return true;
    if (catLower.includes('tech') && g.category === 'Tech How-To') return true;
    return false;
  });

  const displayTerms = [...mentioned, ...byCategory].slice(0, 6);
  const finalTerms = displayTerms.length >= 3 ? displayTerms : [...displayTerms, ...GLOBAL_GLOSSARY.filter((g) => !displayTerms.includes(g))].slice(0, 5);

  return (
    <div className="my-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>Quick Reference Glossary</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                {finalTerms.length} Key Terms
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tap any term to read a plain-English breakdown without opening a new tab
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setSelectedTerm(null);
          }}
          className="text-xs text-indigo-600 dark:text-cyan-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>{isOpen ? 'Hide All' : 'Expand All'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Terms Chips */}
      <div className="flex flex-wrap gap-2 pt-4">
        {finalTerms.map((item, idx) => {
          const isSelected = selectedTerm?.term === item.term;
          return (
            <button
              type="button"
              key={idx}
              onClick={() => setSelectedTerm(isSelected ? null : item)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
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
        <div className="mt-4 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-indigo-500/20">
            <span className="font-bold text-base text-indigo-900 dark:text-cyan-300">
              {selectedTerm.term}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-cyan-300">
              {selectedTerm.category}
            </span>
          </div>

          <div>
            <strong className="text-slate-900 dark:text-white">Definition:</strong>{' '}
            <span>{selectedTerm.definition}</span>
          </div>

          <div>
            <strong className="text-indigo-600 dark:text-cyan-400">Why It Matters:</strong>{' '}
            <span>{selectedTerm.whyItMatters}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-indigo-500/10 text-xs">
            <strong className="text-emerald-600 dark:text-emerald-400">Plain Analogy:</strong>{' '}
            <span className="italic">{selectedTerm.analogy}</span>
          </div>
        </div>
      )}

      {/* Expand all full list */}
      {isOpen && !selectedTerm && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-150">
          {finalTerms.map((item, i) => (
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
