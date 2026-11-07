import React, { useState, useMemo } from 'react';
import {
  HeartPulse,
  Flame,
  Scale,
  Activity,
  ArrowUpRight,
  Sparkles,
  Zap,
} from 'lucide-react';

interface HealthCalculatorSidebarWidgetProps {
  onOpenFullSuite: () => void;
}

export const HealthCalculatorSidebarWidget: React.FC<HealthCalculatorSidebarWidgetProps> = ({
  onOpenFullSuite,
}) => {
  const [weightKg, setWeightKg] = useState<number>(72);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [activity, setActivity] = useState<'moderate' | 'high'>('moderate');

  // Quick BMR & Maintenance
  const bmr = useMemo(() => {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * 30 + 5);
  }, [weightKg, heightCm]);

  const tdee = useMemo(() => {
    const mult = activity === 'moderate' ? 1.55 : 1.725;
    return Math.round(bmr * mult);
  }, [bmr, activity]);

  const bmi = useMemo(() => {
    const heightM = heightCm / 100;
    return Number((weightKg / (heightM * heightM)).toFixed(1));
  }, [weightKg, heightCm]);

  const bmiLabel = useMemo(() => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Optimal / Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }, [bmi]);

  return (
    <div className="p-5 rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-white dark:to-slate-900 dark:from-emerald-950/20 dark:via-slate-900 shadow-sm relative overflow-hidden group">
      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-500 text-white shadow-xs">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 tracking-wider">
              Interactive Tool
            </div>
            <h4 className="font-bold font-heading text-sm text-slate-900 dark:text-white leading-tight">
              Health & Calorie Quick Calc
            </h4>
          </div>
        </div>
      </div>

      {/* Sliders for instant feedback */}
      <div className="space-y-3 my-3">
        {/* Weight */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Weight:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{weightKg} kg</span>
          </div>
          <input
            type="range"
            min="45"
            max="140"
            value={weightKg}
            onChange={(e) => setWeightKg(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
          />
        </div>

        {/* Height */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Height:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{heightCm} cm</span>
          </div>
          <input
            type="range"
            min="145"
            max="205"
            value={heightCm}
            onChange={(e) => setHeightCm(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
          />
        </div>
      </div>

      {/* Fast Live Metrics */}
      <div className="grid grid-cols-2 gap-2 my-3 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-500" />
            <span>Daily TDEE</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
            {tdee} <span className="text-[10px] font-normal text-slate-500">kcal</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Scale className="w-3 h-3 text-emerald-500" />
            <span>BMI Index</span>
          </div>
          <div className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-400 mt-0.5">
            {bmi} <span className="text-[10px] font-normal text-slate-500">({bmiLabel})</span>
          </div>
        </div>
      </div>

      {/* Activity burn teaser */}
      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between mb-3.5">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>45-min Run or HIIT:</span>
        </span>
        <strong className="font-mono text-emerald-800 dark:text-emerald-400 font-bold">
          ~{Math.round(8.5 * weightKg * 0.75)} kcal
        </strong>
      </div>

      {/* Action Button to launch full suite */}
      <button
        onClick={onOpenFullSuite}
        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 group-hover:shadow-emerald-600/30"
      >
        <span>Open Full Health & Calorie Suite</span>
        <ArrowUpRight className="w-4 h-4" />
      </button>
    </div>
  );
};
