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
  // Generate tailored actionable implementation steps based on category & keywords
  const generateSteps = (): ChecklistItem[] => {
    const cat = article.category.toLowerCase();

    if (cat.includes('cyber') || cat.includes('security')) {
      return [
        {
          id: 'step-1',
          phase: 'Phase 1 • Assessment',
          title: 'Audit Credential & Ephemeral Access Surfaces',
          detail: 'Conduct a thorough inventory of service accounts, API keys, and machine-to-machine tokens across all microservices.',
        },
        {
          id: 'step-2',
          phase: 'Phase 2 • Architecture',
          title: 'Enforce Continuous Microsegmentation',
          detail: 'Implement least-privilege egress filtering and mutual TLS (mTLS) across internal service boundaries.',
        },
        {
          id: 'step-3',
          phase: 'Phase 3 • Governance',
          title: 'Verify Hardware-Backed 2FA & Post-Quantum Agility',
          detail: 'Rotate root cryptographic secrets and configure FIDO2 WebAuthn keys for administrative and production consoles.',
        },
        {
          id: 'step-4',
          phase: 'Phase 4 • Monitoring',
          title: 'Simulate Automated Red-Team Intrusion Drill',
          detail: 'Trigger simulated lateral movement tests to validate SIEM detection windows within a 15-minute SLA.',
        },
        {
          id: 'step-5',
          phase: 'Phase 5 • Signoff',
          title: 'Publish Executive Risk & Board Compliance Scorecard',
          detail: 'Deliver verified E-E-A-T audit results to C-suite and legal counsel for quarterly SEC/GDPR disclosure.',
        },
      ];
    }

    if (cat.includes('finance') || cat.includes('saas') || cat.includes('market')) {
      return [
        {
          id: 'step-1',
          phase: 'Phase 1 • Economics',
          title: 'Audit Net Dollar Retention (NDR) & Cohort Payback',
          detail: 'Calculate trailing 12-month customer churn, logo renewal rates, and blended CAC payback velocity.',
        },
        {
          id: 'step-2',
          phase: 'Phase 2 • Capital Efficiency',
          title: 'Benchmark Rule of 40 & FCF Margin Trajectory',
          detail: 'Model annual revenue growth percentage plus Free Cash Flow margin against top quartile enterprise peers.',
        },
        {
          id: 'step-3',
          phase: 'Phase 3 • Treasury',
          title: 'Diversify Cash Reserves Across Insured Depository Networks',
          detail: 'Distribute operational liquidity across short-duration Treasury bills and sweep accounts yielding >5% APY.',
        },
        {
          id: 'step-4',
          phase: 'Phase 4 • Monetization',
          title: 'Recalibrate Pricing Tiers to Value Metrics',
          detail: 'Shift from seat-based licenses to usage or outcome-based pricing models to capitalize on high-intent accounts.',
        },
        {
          id: 'step-5',
          phase: 'Phase 5 • Governance',
          title: 'Finalize Board Deck & Investor Sensitivity Model',
          detail: 'Present downside macroeconomic stress-tests and runway projections for the upcoming fiscal cycle.',
        },
      ];
    }

    // Default Tech, AI & Strategy Checklist
    return [
      {
        id: 'step-1',
        phase: 'Phase 1 • Scoping',
        title: `Validate Core Assumptions for ${article.primaryKeyword || 'Initiative'}`,
        detail: 'Document measurable KPIs, latency tolerances, and baseline resource constraints before engineering rollout.',
      },
      {
        id: 'step-2',
        phase: 'Phase 2 • Prototype',
        title: 'Run Sandboxed Pilot Benchmark & Cost Stress-Test',
        detail: 'Deploy a controlled proof-of-concept cluster measuring tokens-per-second, error budgets, and unit costs.',
      },
      {
        id: 'step-3',
        phase: 'Phase 3 • Integration',
        title: 'Configure Guardrails, Zero-Data Retention & Fallbacks',
        detail: 'Establish circuit breakers and deterministic fallbacks to guarantee 99.9% uptime during API outages.',
      },
      {
        id: 'step-4',
        phase: 'Phase 4 • Deployment',
        title: 'Execute Canary Release with Real-Time Observability',
        detail: 'Route 5% of production traffic through the new pipeline while monitoring error rates and P99 response times.',
      },
      {
        id: 'step-5',
        phase: 'Phase 5 • Scale',
        title: 'Conduct Post-Implementation Retrospective & Knowledge Base',
        detail: 'Document operational runbooks and train internal operators to ensure sustained organizational leverage.',
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
