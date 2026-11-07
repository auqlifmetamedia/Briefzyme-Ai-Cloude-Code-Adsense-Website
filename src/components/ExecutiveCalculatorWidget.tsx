import React, { useState, useMemo } from 'react';
import { Article } from '../types.ts';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  Cpu,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

import { HealthCalorieCalculatorSuite } from './health/HealthCalorieCalculatorSuite.tsx';

interface ExecutiveCalculatorWidgetProps {
  article: Article;
}

export const ExecutiveCalculatorWidget: React.FC<ExecutiveCalculatorWidgetProps> = ({
  article,
}) => {
  const category = article.category.toLowerCase();
  const isHealth =
    category.includes('health') ||
    category.includes('wellness') ||
    category.includes('fitness') ||
    category.includes('nutrition') ||
    category.includes('calorie') ||
    article.tags?.some((t) => {
      const low = t.toLowerCase();
      return (
        low.includes('health') ||
        low.includes('calorie') ||
        low.includes('workout') ||
        low.includes('fitness') ||
        low.includes('nutrition')
      );
    });

  if (isHealth) {
    return (
      <div className="my-10">
        <HealthCalorieCalculatorSuite />
      </div>
    );
  }

  const isFinance = category.includes('finance') || category.includes('saas') || category.includes('market');
  const isCyber = category.includes('cyber') || category.includes('security');

  // State for SaaS / Finance
  const [arr, setArr] = useState(24); // $24M ARR
  const [revenueGrowth, setRevenueGrowth] = useState(38); // 38% YoY
  const [fcfMargin, setFcfMargin] = useState(12); // 12% FCF Margin
  const [ndr, setNdr] = useState(115); // 115% Net Dollar Retention

  // State for AI & Compute / Tech
  const [teamSize, setTeamSize] = useState(45); // 45 engineers/analysts
  const [hourlyCost, setHourlyCost] = useState(85); // $85/hr
  const [hoursSavedPerWeek, setHoursSavedPerWeek] = useState(5.5); // 5.5 hrs saved per week

  // State for Cybersecurity
  const [endpoints, setEndpoints] = useState(1200); // 1200 endpoints
  const [securityScore, setSecurityScore] = useState(82); // 82% posture

  const [isCopied, setIsCopied] = useState(false);

  // Calculations
  const financeResults = useMemo(() => {
    const ruleOf40 = revenueGrowth + fcfMargin;
    // Base multiple of 6x ARR, adjusted by Rule of 40 performance and NDR
    const multiple = Math.max(
      2.5,
      Number((5.5 + (ruleOf40 > 40 ? (ruleOf40 - 40) * 0.18 : (ruleOf40 - 40) * 0.1) + ((ndr - 100) * 0.08)).toFixed(1))
    );
    const valuation = Number((arr * multiple).toFixed(1));
    return {
      ruleOf40,
      multiple,
      valuation,
      status: ruleOf40 >= 40 ? 'Top Quartile (Premium Multiple)' : 'Moderate Yield (Scale Candidate)',
    };
  }, [arr, revenueGrowth, fcfMargin, ndr]);

  const aiResults = useMemo(() => {
    const weeklyHoursTotal = teamSize * hoursSavedPerWeek;
    const weeklySavings = weeklyHoursTotal * hourlyCost;
    const annualSavings = Math.round(weeklySavings * 48); // 48 working weeks
    const efficiencyBoostPct = Math.round((hoursSavedPerWeek / 40) * 100);
    return {
      annualSavings,
      weeklyHoursTotal: Math.round(weeklyHoursTotal),
      efficiencyBoostPct,
    };
  }, [teamSize, hourlyCost, hoursSavedPerWeek]);

  const cyberResults = useMemo(() => {
    // Average breach liability estimation
    const potentialExposure = Number(((endpoints * 3400) / 1_000_000).toFixed(2));
    const mitigatedLoss = Number((potentialExposure * (securityScore / 100)).toFixed(2));
    const residualRisk = Number((potentialExposure - mitigatedLoss).toFixed(2));
    return {
      potentialExposure,
      mitigatedLoss,
      residualRisk,
    };
  }, [endpoints, securityScore]);

  const handleCopyReport = () => {
    let text = '';
    if (isFinance) {
      text = `Briefzy Strategic Valuator Report (${article.title}):
- ARR: $${arr}M | YoY Growth: ${revenueGrowth}% | FCF Margin: ${fcfMargin}% | NDR: ${ndr}%
- Rule of 40 Score: ${financeResults.ruleOf40}% (${financeResults.status})
- Implied Revenue Multiple: ${financeResults.multiple}x ARR
- Implied Enterprise Valuation: $${financeResults.valuation}M
Calculated via Briefzy Intelligence (briefzy.me)`;
    } else if (isCyber) {
      text = `Briefzy Zero-Trust Exposure Audit (${article.title}):
- Monitored Endpoints: ${endpoints} | Security Posture: ${securityScore}%
- Baseline Breach Exposure: $${cyberResults.potentialExposure}M
- Modeled Loss Mitigated: $${cyberResults.mitigatedLoss}M
- Residual Enterprise Risk: $${cyberResults.residualRisk}M
Calculated via Briefzy Intelligence (briefzy.me)`;
    } else {
      text = `Briefzy Enterprise AI Efficiency Model (${article.title}):
- Knowledge Team Size: ${teamSize} | Hourly Cost: $${hourlyCost}/hr | Saved: ${hoursSavedPerWeek} hrs/wk/seat
- Annual Value Unlocked: $${aiResults.annualSavings.toLocaleString()}
- Total Productivity Lift: +${aiResults.efficiencyBoostPct}%
Calculated via Briefzy Intelligence (briefzy.me)`;
    }

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="my-10 p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-teal-500 to-indigo-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-heading text-white">
                  {isFinance
                    ? 'SaaS Valuation & Rule of 40 Modeler'
                    : isCyber
                    ? 'Zero-Trust Breach Exposure Calculator'
                    : 'Enterprise AI & Compute ROI Modeler'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Interactive Decision Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculate live economic sensitivity and strategic trade-offs for this briefing topic.
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyReport}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95"
            title="Copy calculations to clipboard"
          >
            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Report Copied!' : 'Copy Calculation Brief'}</span>
          </button>
        </div>

        {/* Dynamic Calculator Form & Output Grid */}
        {isFinance ? (
          /* FINANCE / SAAS VALUATION ENGINE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Annual Recurring Revenue (ARR)</span>
                  <span className="text-cyan-400 font-mono font-bold">${arr}M</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="120"
                  value={arr}
                  onChange={(e) => setArr(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">YoY Revenue Growth Rate</span>
                  <span className="text-cyan-400 font-mono font-bold">+{revenueGrowth}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={revenueGrowth}
                  onChange={(e) => setRevenueGrowth(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Free Cash Flow (FCF) Margin</span>
                  <span className="text-cyan-400 font-mono font-bold">{fcfMargin}%</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="40"
                  value={fcfMargin}
                  onChange={(e) => setFcfMargin(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Net Dollar Retention (NDR)</span>
                  <span className="text-cyan-400 font-mono font-bold">{ndr}%</span>
                </div>
                <input
                  type="range"
                  min="85"
                  max="140"
                  value={ndr}
                  onChange={(e) => setNdr(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-400">Rule of 40 Score</span>
                <div>
                  <div className="text-2xl font-extrabold font-mono text-white">
                    {financeResults.ruleOf40}%
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {financeResults.ruleOf40 >= 40 ? '✓ Top-Tier Health' : 'Needs Optimization'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-400">Implied Multiple</span>
                <div>
                  <div className="text-2xl font-extrabold font-mono text-cyan-400">
                    {financeResults.multiple}x
                  </div>
                  <span className="text-[10px] text-slate-400">Revenue Multiplier</span>
                </div>
              </div>

              <div className="col-span-2 p-5 rounded-2xl bg-gradient-to-r from-cyan-950/80 to-indigo-950/80 border border-cyan-500/40">
                <span className="text-[11px] uppercase font-bold text-cyan-300">
                  Implied Enterprise Valuation
                </span>
                <div className="text-3xl font-extrabold font-mono text-white mt-1">
                  ${financeResults.valuation} Million
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  Based on current Tier-1 public software comps and cost-of-capital environment.
                </p>
              </div>
            </div>
          </div>
        ) : isCyber ? (
          /* CYBERSECURITY RISK ENGINE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Managed Corporate Endpoints</span>
                  <span className="text-cyan-400 font-mono font-bold">{endpoints.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="10000"
                  step="100"
                  value={endpoints}
                  onChange={(e) => setEndpoints(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Zero-Trust Posture Readiness Score</span>
                  <span className="text-cyan-400 font-mono font-bold">{securityScore}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="98"
                  value={securityScore}
                  onChange={(e) => setSecurityScore(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 gap-3">
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Baseline Exposure</span>
                  <div className="text-xl font-bold font-mono text-rose-400">
                    ${cyberResults.potentialExposure}M
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Loss Mitigated</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    ${cyberResults.mitigatedLoss}M
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/40">
                <span className="text-[11px] uppercase font-bold text-emerald-300">
                  Residual Risk Exposure
                </span>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  ${cyberResults.residualRisk}M
                </div>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Estimated annualized risk with proactive mTLS, FIDO2, and automated SOC.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ENTERPRISE AI & TECH ROI ENGINE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Engineers & Analysts Enabled</span>
                  <span className="text-cyan-400 font-mono font-bold">{teamSize} FTEs</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="250"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Average Blended Hourly Compensation</span>
                  <span className="text-cyan-400 font-mono font-bold">${hourlyCost}/hr</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="200"
                  value={hourlyCost}
                  onChange={(e) => setHourlyCost(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Weekly Hours Recovered Per Worker</span>
                  <span className="text-cyan-400 font-mono font-bold">{hoursSavedPerWeek} hrs/week</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={hoursSavedPerWeek}
                  onChange={(e) => setHoursSavedPerWeek(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 gap-3">
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Weekly Hours Freed</span>
                  <div className="text-xl font-bold font-mono text-cyan-400">
                    +{aiResults.weeklyHoursTotal} hrs
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Productivity Lift</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    +{aiResults.efficiencyBoostPct}%
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 to-indigo-950/80 border border-cyan-500/40">
                <span className="text-[11px] uppercase font-bold text-cyan-300">
                  Annual Value Created
                </span>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  ${aiResults.annualSavings.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Calculated based on 48 working weeks and autonomous agentic augmentation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
