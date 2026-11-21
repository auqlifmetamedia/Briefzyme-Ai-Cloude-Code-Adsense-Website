import React, { useState } from 'react';
import { articleUrl } from '../utils/routes.ts';
import { Article } from '../types.ts';
import {
  CheckSquare,
  Square,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ListTodo,
  Share2,
} from 'lucide-react';

interface ArticleActionChecklistProps {
  article: Article;
}

interface ChecklistItem {
  id: string;
  phase: string;
  title: string;
  detail: string;
}

export const ArticleActionChecklist: React.FC<ArticleActionChecklistProps> = ({
  article,
}) => {
  // Generate tailored practical steps directly from this article's takeaways, topic, and category
  const generateSteps = (): ChecklistItem[] => {
    const topicLabel = article.primaryKeyword || article.title;
    if (article.keyTakeaways && article.keyTakeaways.length >= 3) {
      return article.keyTakeaways.slice(0, 5).map((takeaway, idx) => ({
        id: `step-${idx + 1}`,
        phase: `Step ${idx + 1} • ${article.category}`,
        title:
          takeaway.length > 72
            ? takeaway.split(/[:.—–-]/)[0].trim().slice(0, 72)
            : takeaway,
        detail: takeaway,
      }));
    }

    const cat = article.category.toLowerCase();

    if (cat.includes('security') || cat.includes('privacy')) {
      return [
        {
          id: 'step-1',
          phase: 'Step 1 • Audit',
          title: `Check Your Current ${topicLabel} Exposure`,
          detail: 'Review affected accounts, browsers, or devices and spot weak default settings right away.',
        },
        {
          id: 'step-2',
          phase: 'Step 2 • Harden',
          title: 'Enable Strong Authentication & Verification',
          detail: 'Turn on app-based 2FA or passkeys and replace any reused passwords with unique random ones.',
        },
        {
          id: 'step-3',
          phase: 'Step 3 • Backup',
          title: 'Save Recovery Codes & Offline Backups',
          detail: 'Store emergency recovery keys somewhere safe outside your primary phone or inbox.',
        },
        {
          id: 'step-4',
          phase: 'Step 4 • Habit',
          title: 'Set a Monthly 5-Minute Review',
          detail: 'Double-check recent logins, software updates, and connected third-party app permissions.',
        },
      ];
    }

    if (cat.includes('remote') || cat.includes('work')) {
      return [
        {
          id: 'step-1',
          phase: 'Step 1 • Setup',
          title: `Audit Your Daily Workflow for ${topicLabel}`,
          detail: 'Identify the top two friction points slowing down focus, posture, or team handoffs.',
        },
        {
          id: 'step-2',
          phase: 'Step 2 • Structure',
          title: 'Separate Async Updates From Live Calls',
          detail: 'Document decisions in shared notes so teammates across time zones stay aligned without extra meetings.',
        },
        {
          id: 'step-3',
          phase: 'Step 3 • Focus',
          title: 'Protect Dedicated Deep-Work Blocks',
          detail: 'Mute non-urgent chat notifications during peak focus hours and define a clear end-of-day shutdown.',
        },
        {
          id: 'step-4',
          phase: 'Step 4 • Review',
          title: 'Test Adjustments for One Week',
          detail: 'Keep the routines that noticeably lower fatigue and adjust anything that adds unnecessary overhead.',
        },
      ];
    }

    if (cat.includes('how') || cat.includes('tech')) {
      return [
        {
          id: 'step-1',
          phase: 'Step 1 • Baseline',
          title: `Measure Current State Before Changing ${topicLabel}`,
          detail: 'Note current storage, startup speed, or settings so you know what actually improved afterward.',
        },
        {
          id: 'step-2',
          phase: 'Step 2 • Cleanup',
          title: 'Apply Built-In System Tools First',
          detail: 'Start with native OS utilities and official settings before installing third-party utilities.',
        },
        {
          id: 'step-3',
          phase: 'Step 3 • Verify',
          title: 'Test Safety & Restorability',
          detail: 'Confirm backups open cleanly and important files remain intact after making changes.',
        },
        {
          id: 'step-4',
          phase: 'Step 4 • Maintain',
          title: 'Keep a Simple Repeatable Routine',
          detail: 'Automate updates and monthly checks so performance stays reliable without constant tinkering.',
        },
      ];
    }

    // Productivity & AI Tools / General
    return [
      {
        id: 'step-1',
        phase: 'Step 1 • Goal',
        title: `Define One Practical Use Case for ${topicLabel}`,
        detail: 'Pick a repeatable weekly task instead of trying to overhaul every workflow at once.',
      },
      {
        id: 'step-2',
        phase: 'Step 2 • Structure',
        title: 'Provide Clear Context, Constraints & Examples',
        detail: 'Specify audience, length, tone, and what to avoid so outputs need minimal editing.',
      },
      {
        id: 'step-3',
        phase: 'Step 3 • Verify',
        title: 'Fact-Check Names, Numbers, and Links',
        detail: 'Treat drafts as a starting point and verify every factual claim before sharing or publishing.',
      },
      {
        id: 'step-4',
        phase: 'Step 4 • Reuse',
        title: 'Save Your Best Template for Next Time',
        detail: 'Keep a small personal library of tested prompts and checklists that reliably save time.',
      },
    ];
  };

  const steps = generateSteps();
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [isCopied, setIsCopied] = useState(false);

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  const handleCopyMarkdown = () => {
    const md = `# Executive Action Plan: ${article.title}
Source: ${articleUrl(article)}
Verified Columnist: ${article.author.name} (${article.author.role})

${steps
  .map(
    (s, i) =>
      `- [${completedSteps[s.id] ? 'x' : ' '}] **Step ${i + 1} (${s.phase})**: ${s.title}\n  > ${s.detail}`
  )
  .join('\n\n')}

Execution Readiness: ${progressPct}% (${completedCount}/${steps.length} Steps Completed)
Generated via Briefzy Editorial Intelligence (briefzy.me)`;

    navigator.clipboard.writeText(md);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const resetChecklist = () => {
    setCompletedSteps({});
  };

  return (
    <div className="my-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-cyan-950/20 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-cyan-950/40 border-2 border-indigo-500/30 dark:border-indigo-500/40 shadow-sm backdrop-blur-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-indigo-500/20 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xs">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                Implementation Checklist & Action Plan
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                Executive Action
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Practical, step-by-step roadmap to solve the core challenges outlined in this brief.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
            title="Copy formatted checklist for Notion, Slack, or Jira"
          >
            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Plan Copied!' : 'Copy Action Plan'}</span>
          </button>

          {completedCount > 0 && (
            <button
              onClick={resetChecklist}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Reset progress"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Readiness Meter */}
      <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>Execution Readiness:</span>
            <strong className="text-indigo-600 dark:text-cyan-400">{progressPct}%</strong>
          </span>
          <span className="font-mono text-slate-400 text-[11px]">
            {completedCount} of {steps.length} Steps Completed
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {progressPct === 100 && (
          <div className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Outstanding! All implementation criteria verified for executive sign-off.</span>
          </div>
        )}
      </div>

      {/* Checklist Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isDone = Boolean(completedSteps[step.id]);

          return (
            <div
              key={step.id}
              onClick={() => toggleStep(step.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-950/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                className="mt-0.5 shrink-0 text-slate-400 transition-colors"
              >
                {isDone ? (
                  <CheckSquare className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-indigo-500" />
                )}
              </button>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-cyan-400">
                    {step.phase}
                  </span>
                  <h4
                    className={`text-sm font-bold transition-all ${
                      isDone
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {step.title}
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
