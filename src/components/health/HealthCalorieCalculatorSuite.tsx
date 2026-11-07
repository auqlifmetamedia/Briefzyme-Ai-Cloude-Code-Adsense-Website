import React, { useState, useMemo } from 'react';
import {
  Flame,
  Activity,
  Scale,
  Utensils,
  Droplet,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  HeartPulse,
  Info,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Target,
  ExternalLink,
} from 'lucide-react';
import { AdSenseBanner } from '../AdSenseBanner.tsx';

export type CalculatorTab = 'tdee' | 'bmi' | 'exercise' | 'food' | 'hydration';

interface FoodItem {
  id: string;
  name: string;
  category: 'Protein' | 'Carbs' | 'Fats' | 'Produce';
  servingGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
}

const COMMON_FOODS: FoodItem[] = [
  { id: 'f-1', name: 'Boneless Skinless Chicken Breast', category: 'Protein', servingGrams: 150, caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0 },
  { id: 'f-2', name: 'Wild Atlantic Salmon Fillet', category: 'Protein', servingGrams: 160, caloriesPer100g: 208, proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 13, fiberPer100g: 0 },
  { id: 'f-3', name: 'Whole Large Eggs (2 eggs)', category: 'Protein', servingGrams: 100, caloriesPer100g: 143, proteinPer100g: 12.6, carbsPer100g: 0.8, fatPer100g: 9.5, fiberPer100g: 0 },
  { id: 'f-4', name: 'Liquid Egg Whites', category: 'Protein', servingGrams: 150, caloriesPer100g: 52, proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2, fiberPer100g: 0 },
  { id: 'f-5', name: 'Non-Fat Plain Greek Yogurt', category: 'Protein', servingGrams: 170, caloriesPer100g: 59, proteinPer100g: 10.2, carbsPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 0 },
  { id: 'f-6', name: '100% Whey Protein Isolate (1 scoop)', category: 'Protein', servingGrams: 30, caloriesPer100g: 375, proteinPer100g: 86, carbsPer100g: 3, fatPer100g: 1.5, fiberPer100g: 0 },
  { id: 'f-7', name: 'Rolled Whole Grain Oats', category: 'Carbs', servingGrams: 80, caloriesPer100g: 389, proteinPer100g: 16.9, carbsPer100g: 66.3, fatPer100g: 6.9, fiberPer100g: 10.6 },
  { id: 'f-8', name: 'Cooked Jasmine Brown Rice', category: 'Carbs', servingGrams: 180, caloriesPer100g: 123, proteinPer100g: 2.7, carbsPer100g: 25.6, fatPer100g: 1.0, fiberPer100g: 1.6 },
  { id: 'f-9', name: 'Baked Sweet Potato', category: 'Carbs', servingGrams: 180, caloriesPer100g: 90, proteinPer100g: 2.0, carbsPer100g: 20.7, fatPer100g: 0.2, fiberPer100g: 3.3 },
  { id: 'f-10', name: 'Cooked Quinoa', category: 'Carbs', servingGrams: 150, caloriesPer100g: 120, proteinPer100g: 4.4, carbsPer100g: 21.3, fatPer100g: 1.9, fiberPer100g: 2.8 },
  { id: 'f-11', name: 'Fresh Hass Avocado', category: 'Fats', servingGrams: 100, caloriesPer100g: 160, proteinPer100g: 2.0, carbsPer100g: 8.5, fatPer100g: 14.7, fiberPer100g: 6.7 },
  { id: 'f-12', name: 'Raw Whole Almonds', category: 'Fats', servingGrams: 30, caloriesPer100g: 579, proteinPer100g: 21.2, carbsPer100g: 21.6, fatPer100g: 49.9, fiberPer100g: 12.5 },
  { id: 'f-13', name: 'Extra Virgin Olive Oil (1 tbsp)', category: 'Fats', servingGrams: 14, caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, fiberPer100g: 0 },
  { id: 'f-14', name: 'Natural Peanut Butter', category: 'Fats', servingGrams: 32, caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50, fiberPer100g: 6 },
  { id: 'f-15', name: 'Steamed Broccoli Florets', category: 'Produce', servingGrams: 150, caloriesPer100g: 35, proteinPer100g: 2.4, carbsPer100g: 7.2, fatPer100g: 0.4, fiberPer100g: 3.3 },
  { id: 'f-16', name: 'Fresh Blueberries', category: 'Produce', servingGrams: 120, caloriesPer100g: 57, proteinPer100g: 0.7, carbsPer100g: 14.5, fatPer100g: 0.3, fiberPer100g: 2.4 },
  { id: 'f-17', name: 'Fresh Banana (Medium)', category: 'Produce', servingGrams: 118, caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 22.8, fatPer100g: 0.3, fiberPer100g: 2.6 },
  { id: 'f-18', name: 'Firm Organic Tofu', category: 'Protein', servingGrams: 150, caloriesPer100g: 83, proteinPer100g: 10, carbsPer100g: 1.9, fatPer100g: 5.3, fiberPer100g: 1.0 },
];

interface WorkoutActivity {
  id: string;
  name: string;
  category: 'Cardio' | 'Strength' | 'Sports' | 'Recovery';
  met: number;
  description: string;
}

const WORKOUT_ACTIVITIES: WorkoutActivity[] = [
  { id: 'w-1', name: 'Running (Moderate, 8.5 km/h / 5.3 mph)', category: 'Cardio', met: 9.0, description: 'Steady aerobic endurance running' },
  { id: 'w-2', name: 'Running (Vigorous, 11 km/h / 7 mph)', category: 'Cardio', met: 11.5, description: 'High-speed tempo lactate threshold run' },
  { id: 'w-3', name: 'Zone 2 Steady-State Cardio / Jogging', category: 'Cardio', met: 7.0, description: 'Aerobic mitochondrial base conditioning' },
  { id: 'w-4', name: 'Outdoor Road Cycling (Moderate, 20 km/h)', category: 'Cardio', met: 8.0, description: 'Continuous cycling on flat/rolling terrain' },
  { id: 'w-5', name: 'Indoor Stationary Bike / Spin Class', category: 'Cardio', met: 8.5, description: 'High-resistance intervals and hill simulations' },
  { id: 'w-6', name: 'Swimming (Freestyle, Moderate Pace)', category: 'Cardio', met: 8.0, description: 'Full-body low-impact aerobic resistance' },
  { id: 'w-7', name: 'HIIT / Functional Circuit Training', category: 'Cardio', met: 8.8, description: 'High-intensity interval bursts and plyometrics' },
  { id: 'w-8', name: 'Rowing Machine (Moderate to Hard)', category: 'Cardio', met: 7.8, description: 'Synchronous posterior chain and cardiovascular pull' },
  { id: 'w-9', name: 'Jump Rope (Continuous)', category: 'Cardio', met: 11.0, description: 'Rapid anaerobic footwork and calf elasticity' },
  { id: 'w-10', name: 'Heavy Resistance & Weightlifting (Compound)', category: 'Strength', met: 6.0, description: 'Squats, deadlifts, presses with recovery intervals' },
  { id: 'w-11', name: 'Hypertrophy / Bodybuilding Training', category: 'Strength', met: 5.0, description: 'Targeted machine and dumbbell volume' },
  { id: 'w-12', name: 'Calisthenics & Bodyweight Training', category: 'Strength', met: 5.5, description: 'Pull-ups, dips, push-ups, and core holds' },
  { id: 'w-13', name: 'Brisk Incline Treadmill Walk (12% grade, 5 km/h)', category: 'Cardio', met: 7.2, description: 'Zero-impact posterior chain fat oxidation' },
  { id: 'w-14', name: 'Casual Walking (4.5 km/h)', category: 'Recovery', met: 3.5, description: 'NEAT booster and lymphatic circulation' },
  { id: 'w-15', name: 'Singles Tennis / Squash', category: 'Sports', met: 8.0, description: 'Agility, directional cuts, and anaerobic sprints' },
  { id: 'w-16', name: 'Vinyasa Flow Yoga / Mat Pilates', category: 'Recovery', met: 3.8, description: 'Isometric core stability and mobility' },
];

interface PlateItem {
  food: FoodItem;
  quantityGrams: number;
}

interface HealthCalorieCalculatorSuiteProps {
  initialTab?: CalculatorTab;
  onSelectArticleTopic?: (topic: string) => void;
  className?: string;
  isCompact?: boolean;
}

export const HealthCalorieCalculatorSuite: React.FC<HealthCalorieCalculatorSuiteProps> = ({
  initialTab = 'tdee',
  onSelectArticleTopic,
  className = '',
  isCompact = false,
}) => {
  const [activeTab, setActiveTab] = useState<CalculatorTab>(initialTab);
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  // Core Physical Profile
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<number>(32);
  const [weightKg, setWeightKg] = useState<number>(75); // kg
  const [heightCm, setHeightCm] = useState<number>(178); // cm
  const [activityMultiplier, setActivityMultiplier] = useState<number>(1.55); // moderate
  const [fitnessGoal, setFitnessGoal] = useState<'fat_loss' | 'mild_loss' | 'maintenance' | 'lean_gain' | 'muscle_bulk'>('fat_loss');
  const [macroPreset, setMacroPreset] = useState<'balanced' | 'high_protein' | 'low_carb' | 'endurance'>('high_protein');

  // Exercise Mode State
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>('w-1');
  const [workoutDurationMins, setWorkoutDurationMins] = useState<number>(45);
  const [workoutIntensity, setWorkoutIntensity] = useState<'normal' | 'high'>('normal');

  // Food Plate State
  const [plate, setPlate] = useState<PlateItem[]>([
    { food: COMMON_FOODS[0], quantityGrams: 180 }, // chicken breast
    { food: COMMON_FOODS[7], quantityGrams: 150 }, // brown rice
    { food: COMMON_FOODS[14], quantityGrams: 120 }, // broccoli
    { food: COMMON_FOODS[12], quantityGrams: 10 }, // olive oil
  ]);
  const [foodSearch, setFoodSearch] = useState<string>('');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string>('All');

  // Copy Feedback
  const [copied, setCopied] = useState<boolean>(false);

  // Imperial conversions for display/input
  const weightLbs = Math.round(weightKg * 2.20462);
  const totalInches = Math.round(heightCm / 2.54);
  const heightFeet = Math.floor(totalInches / 12);
  const heightInches = totalInches % 12;

  const handleWeightChange = (val: number, system: 'metric' | 'imperial') => {
    if (system === 'metric') {
      setWeightKg(Math.max(30, Math.min(250, val)));
    } else {
      setWeightKg(Math.max(30, Math.min(250, Math.round(val / 2.20462))));
    }
  };

  const handleHeightChange = (val: number, system: 'metric' | 'imperial') => {
    if (system === 'metric') {
      setHeightCm(Math.max(100, Math.min(240, val)));
    } else {
      setHeightCm(Math.max(100, Math.min(240, Math.round(val * 2.54))));
    }
  };

  // 1. BMR via Mifflin-St Jeor equation
  const bmr = useMemo(() => {
    if (gender === 'male') {
      return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    } else {
      return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
    }
  }, [gender, weightKg, heightCm, age]);

  // 2. TDEE
  const tdee = useMemo(() => {
    return Math.round(bmr * activityMultiplier);
  }, [bmr, activityMultiplier]);

  // 3. Goal Calorie Target
  const targetCalories = useMemo(() => {
    switch (fitnessGoal) {
      case 'fat_loss':
        return Math.max(1200, Math.round(tdee * 0.8)); // 20% deficit
      case 'mild_loss':
        return Math.max(1200, Math.round(tdee * 0.9)); // 10% deficit
      case 'maintenance':
        return tdee;
      case 'lean_gain':
        return Math.round(tdee * 1.1); // +10% surplus
      case 'muscle_bulk':
        return Math.round(tdee * 1.18); // +18% surplus
      default:
        return tdee;
    }
  }, [tdee, fitnessGoal]);

  // 4. Macronutrients Target (g & kcal)
  const macros = useMemo(() => {
    let pPct = 0.35;
    let cPct = 0.40;
    let fPct = 0.25;

    if (macroPreset === 'high_protein') {
      pPct = 0.40;
      cPct = 0.35;
      fPct = 0.25;
    } else if (macroPreset === 'low_carb') {
      pPct = 0.35;
      cPct = 0.15;
      fPct = 0.50;
    } else if (macroPreset === 'endurance') {
      pPct = 0.20;
      cPct = 0.60;
      fPct = 0.20;
    }

    const proteinKcal = targetCalories * pPct;
    const carbsKcal = targetCalories * cPct;
    const fatKcal = targetCalories * fPct;

    const proteinGrams = Math.round(proteinKcal / 4);
    const carbsGrams = Math.round(carbsKcal / 4);
    const fatGrams = Math.round(fatKcal / 9);

    return {
      proteinGrams,
      carbsGrams,
      fatGrams,
      pPct: Math.round(pPct * 100),
      cPct: Math.round(cPct * 100),
      fPct: Math.round(fPct * 100),
      proteinPerKg: Number((proteinGrams / weightKg).toFixed(1)),
    };
  }, [targetCalories, macroPreset, weightKg]);

  // 5. BMI & Weight Range
  const bmiResults = useMemo(() => {
    const heightM = heightCm / 100;
    const rawBmi = weightKg / (heightM * heightM);
    const bmiVal = Number(rawBmi.toFixed(1));

    let category = 'Normal Weight';
    let colorClass = 'text-emerald-700 dark:text-emerald-400';
    let riskLevel = 'Low Cardiovascular Risk';
    let barPercent = Math.min(100, Math.max(10, ((bmiVal - 15) / 25) * 100));

    if (bmiVal < 18.5) {
      category = 'Underweight';
      colorClass = 'text-amber-700 dark:text-amber-400';
      riskLevel = 'Elevated Nutritional Risk';
    } else if (bmiVal < 25) {
      category = 'Healthy Normal Range';
      colorClass = 'text-emerald-700 dark:text-emerald-400';
      riskLevel = 'Optimal Longevity & Metabolic Baseline';
    } else if (bmiVal < 30) {
      category = 'Overweight';
      colorClass = 'text-amber-800 dark:text-amber-300';
      riskLevel = 'Moderate Cardiovascular & Insulin Risk';
    } else {
      category = 'Obesity Classification';
      colorClass = 'text-rose-700 dark:text-rose-400';
      riskLevel = 'Elevated Chronic Biomarker Risk';
    }

    const minHealthyKg = Math.round(18.5 * heightM * heightM);
    const maxHealthyKg = Math.round(24.9 * heightM * heightM);

    return {
      bmi: bmiVal,
      category,
      colorClass,
      riskLevel,
      barPercent,
      minHealthyKg,
      maxHealthyKg,
      minHealthyLbs: Math.round(minHealthyKg * 2.20462),
      maxHealthyLbs: Math.round(maxHealthyKg * 2.20462),
    };
  }, [heightCm, weightKg]);

  // 6. Workout Calorie Burn
  const currentWorkout = WORKOUT_ACTIVITIES.find((w) => w.id === selectedWorkoutId) || WORKOUT_ACTIVITIES[0];
  const workoutBurn = useMemo(() => {
    const intensityMultiplier = workoutIntensity === 'high' ? 1.15 : 1.0;
    const hours = workoutDurationMins / 60;
    const effectiveMet = currentWorkout.met * intensityMultiplier;
    // Standard MET formula: Calories = MET * weightKg * hours
    const caloriesBurned = Math.round(effectiveMet * weightKg * hours);
    const epocBonus = Math.round(caloriesBurned * (workoutIntensity === 'high' ? 0.12 : 0.05));

    // Food equivalents
    const bananas = (caloriesBurned / 89).toFixed(1);
    const avocados = (caloriesBurned / 240).toFixed(1);
    const proteinBars = (caloriesBurned / 220).toFixed(1);

    return {
      caloriesBurned,
      epocBonus,
      totalNetBurn: caloriesBurned + epocBonus,
      effectiveMet: Number(effectiveMet.toFixed(1)),
      bananas,
      avocados,
      proteinBars,
    };
  }, [currentWorkout, workoutIntensity, workoutDurationMins, weightKg]);

  // 7. Food Plate Totals
  const plateTotals = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;

    plate.forEach((item) => {
      const factor = item.quantityGrams / 100;
      calories += item.food.caloriesPer100g * factor;
      protein += item.food.proteinPer100g * factor;
      carbs += item.food.carbsPer100g * factor;
      fat += item.food.fatPer100g * factor;
      fiber += item.food.fiberPer100g * factor;
    });

    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      fiber: Math.round(fiber),
    };
  }, [plate]);

  // 8. Hydration Recommendation
  const hydrationLiters = useMemo(() => {
    // 35ml per kg baseline + 500ml per 45 min workout
    const baselineMl = weightKg * 35;
    const workoutMl = (workoutDurationMins / 45) * 500;
    const totalLiters = (baselineMl + workoutMl) / 1000;
    return {
      liters: Number(totalLiters.toFixed(1)),
      cups: Math.round((totalLiters * 1000) / 240),
    };
  }, [weightKg, workoutDurationMins]);

  // Add food to plate
  const handleAddFood = (food: FoodItem) => {
    setPlate((prev) => [...prev, { food, quantityGrams: food.servingGrams }]);
  };

  const handleUpdatePlateQuantity = (index: number, newGrams: number) => {
    setPlate((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantityGrams: Math.max(10, newGrams) } : item))
    );
  };

  const handleRemoveFromPlate = (index: number) => {
    setPlate((prev) => prev.filter((_, i) => i !== index));
  };

  // Copy plan to clipboard
  const handleCopyPlan = () => {
    const text = `=== BRIEFZY HEALTH & CALORIC PROTOCOL ===
Target Profile: ${gender.toUpperCase()}, ${age} yrs, ${weightKg}kg / ${weightLbs}lbs, ${heightCm}cm
Basal Metabolic Rate (BMR): ${bmr} kcal/day
Total Daily Energy Expenditure (TDEE): ${tdee} kcal/day
Goal Target Calorie Intake: ${targetCalories} kcal/day (${fitnessGoal.replace('_', ' ').toUpperCase()})
Macronutrient Partitioning:
  - Protein: ${macros.proteinGrams}g (${macros.proteinPerKg}g/kg) [${macros.pPct}%]
  - Carbohydrates: ${macros.carbsGrams}g [${macros.cPct}%]
  - Healthy Fats: ${macros.fatGrams}g [${macros.fPct}%]
Body Mass Index (BMI): ${bmiResults.bmi} (${bmiResults.category})
Healthy Weight Range: ${bmiResults.minHealthyKg} - ${bmiResults.maxHealthyKg} kg
Recommended Hydration: ${hydrationLiters.liters} L/day (${hydrationLiters.cups} cups)
Calculated via Briefzy Sports Science & Metabolic Intelligence Engine.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredFoods = COMMON_FOODS.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(foodSearch.toLowerCase());
    const matchesCat = selectedFoodCategory === 'All' || f.category === selectedFoodCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div
      className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden transition-all ${className}`}
    >
      {/* Top Header & Unit Toggle */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-cyan-600/10 dark:from-emerald-950/40 dark:via-slate-900/40 dark:to-teal-950/40 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                <span>Clinical Metabolic & Sports Nutrition Engine</span>
                <span aria-hidden="true">·</span>
                <span>2026 Guidelines</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white">
                Health, Fitness & Calorie Calculator
              </h3>
            </div>
          </div>

          {/* Unit Toggle and Quick Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center text-xs font-semibold">
              <button
                onClick={() => setUnitSystem('metric')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  unitSystem === 'metric'
                    ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Metric (kg/cm)
              </button>
              <button
                onClick={() => setUnitSystem('imperial')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  unitSystem === 'imperial'
                    ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Imperial (lbs/ft)
              </button>
            </div>

            <button
              onClick={handleCopyPlan}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Copy personalized nutrition plan"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-800 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Copy Plan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-xs">
          {[
            { id: 'tdee' as CalculatorTab, label: 'BMR & Daily Calories', icon: Flame },
            { id: 'bmi' as CalculatorTab, label: 'BMI & Body Composition', icon: Scale },
            { id: 'exercise' as CalculatorTab, label: 'Workout Calorie Burn', icon: Activity },
            { id: 'food' as CalculatorTab, label: 'Food & Meal Macros', icon: Utensils },
            { id: 'hydration' as CalculatorTab, label: 'Hydration Intake', icon: Droplet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[130px] sm:min-w-0 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="p-6 md:p-8">
        {/* TAB 1: BMR & TDEE DAILY CALORIE CALCULATOR */}
        {activeTab === 'tdee' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Controls */}
            <div className="lg:col-span-7 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Biological Sex
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <button
                      onClick={() => setGender('male')}
                      className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        gender === 'male'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      onClick={() => setGender('female')}
                      className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        gender === 'female'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>

                {/* Age */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Age (Years)
                    </label>
                    <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-400">{age} yrs</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="85"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Weight & Height */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Weight */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Body Weight
                    </label>
                    <span className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-400">
                      {unitSystem === 'metric' ? `${weightKg} kg` : `${weightLbs} lbs`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={unitSystem === 'metric' ? '40' : '90'}
                    max={unitSystem === 'metric' ? '180' : '400'}
                    value={unitSystem === 'metric' ? weightKg : weightLbs}
                    onChange={(e) => handleWeightChange(Number(e.target.value), unitSystem)}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>{unitSystem === 'metric' ? '40 kg' : '90 lbs'}</span>
                    <span>{unitSystem === 'metric' ? '180 kg' : '400 lbs'}</span>
                  </div>
                </div>

                {/* Height */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Stature / Height
                    </label>
                    <span className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-400">
                      {unitSystem === 'metric' ? `${heightCm} cm` : `${heightFeet}' ${heightInches}"`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="140"
                    max="215"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>140 cm (4'7")</span>
                    <span>215 cm (7'1")</span>
                  </div>
                </div>
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Physical Activity Factor (PAL)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { mult: 1.2, name: 'Sedentary', desc: 'Desk job, little to no exercise' },
                    { mult: 1.375, name: 'Lightly Active', desc: 'Light workouts 1-3 days/week' },
                    { mult: 1.55, name: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
                    { mult: 1.725, name: 'Very Active', desc: 'Hard training 6-7 days/week' },
                  ].map((act) => (
                    <button
                      key={act.mult}
                      onClick={() => setActivityMultiplier(act.mult)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        activityMultiplier === act.mult
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-slate-900 dark:text-white shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{act.name}</span>
                        <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400">x{act.mult}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{act.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Body Composition Target
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                  {[
                    { id: 'fat_loss', label: 'Fat Loss (-20%)' },
                    { id: 'mild_loss', label: 'Gradual (-10%)' },
                    { id: 'maintenance', label: 'Maintain' },
                    { id: 'lean_gain', label: 'Lean (+10%)' },
                    { id: 'muscle_bulk', label: 'Bulk (+18%)' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setFitnessGoal(g.id as any)}
                      className={`py-2 px-1 rounded-lg text-center font-semibold transition-all cursor-pointer ${
                        fitnessGoal === g.id
                          ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Macro Partitioning Strategy */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Macronutrient Distribution
                  </label>
                  <span className="text-xs text-slate-500">
                    Protein: {macros.proteinPerKg}g/kg bodyweight
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'high_protein', label: 'High Protein / Lean', split: '40P / 35C / 25F' },
                    { id: 'balanced', label: 'Zone Balanced', split: '30P / 40C / 30F' },
                    { id: 'low_carb', label: 'Low Carb / Keto', split: '35P / 15C / 50F' },
                    { id: 'endurance', label: 'High Carb Athletic', split: '20P / 60C / 20F' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setMacroPreset(p.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        macroPreset === p.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{p.label}</div>
                      <div className="text-[10px] font-mono opacity-80">{p.split}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Output Panel */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-3xl bg-slate-950 text-white shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="text-xs uppercase font-bold text-emerald-400 tracking-wider mb-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Target Daily Intake</span>
                </div>

                <div className="flex items-baseline gap-2 my-2">
                  <span className="text-4xl md:text-5xl font-black font-heading tracking-tight text-white">
                    {targetCalories.toLocaleString()}
                  </span>
                  <span className="text-base font-semibold text-emerald-400">kcal / day</span>
                </div>

                <div className="text-xs text-slate-400 border-b border-slate-800 pb-4 mb-4 flex items-center justify-between">
                  <span>BMR Baseline: <strong className="text-slate-200">{bmr} kcal</strong></span>
                  <span>TDEE Maintenance: <strong className="text-slate-200">{tdee} kcal</strong></span>
                </div>

                {/* Macro Distribution Cards */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Optimal Daily Macronutrients
                  </div>

                  {/* Protein */}
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                        <span>Lean Protein</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{macros.pPct}% of calories ({macros.proteinPerKg}g/kg)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold font-mono text-white">{macros.proteinGrams}g</span>
                      <div className="text-[10px] text-slate-400">{macros.proteinGrams * 4} kcal</div>
                    </div>
                  </div>

                  {/* Carbohydrates */}
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        <span>Complex Carbs</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{macros.cPct}% of calories (Glycogen fuel)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold font-mono text-white">{macros.carbsGrams}g</span>
                      <div className="text-[10px] text-slate-400">{macros.carbsGrams * 4} kcal</div>
                    </div>
                  </div>

                  {/* Healthy Fats */}
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                        <span>Essential Fats</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{macros.fPct}% of calories (Hormone synthesis)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold font-mono text-white">{macros.fatGrams}g</span>
                      <div className="text-[10px] text-slate-400">{macros.fatGrams * 9} kcal</div>
                    </div>
                  </div>
                </div>

                {/* Macro Ratio Visual Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="h-3 w-full rounded-full overflow-hidden flex">
                    <div style={{ width: `${macros.pPct}%` }} className="bg-cyan-400 h-full" title={`Protein: ${macros.pPct}%`} />
                    <div style={{ width: `${macros.cPct}%` }} className="bg-amber-400 h-full" title={`Carbs: ${macros.cPct}%`} />
                    <div style={{ width: `${macros.fPct}%` }} className="bg-rose-400 h-full" title={`Fats: ${macros.fPct}%`} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1.5">
                    <span className="text-cyan-400">Protein: {macros.proteinGrams}g</span>
                    <span className="text-amber-400">Carbs: {macros.carbsGrams}g</span>
                    <span className="text-rose-400">Fats: {macros.fatGrams}g</span>
                  </div>
                </div>
              </div>

              {/* Action Recommendation Box */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Clinical Metabolic Advice</span>
                </div>
                <p>
                  To maximize fat loss while preserving metabolic rate, maintain your caloric target of{' '}
                  <strong className="text-slate-900 dark:text-white">{targetCalories} kcal</strong> for 4 consecutive weeks.
                  Ensure you hit at least <strong className="text-slate-900 dark:text-white">{macros.proteinGrams}g</strong> of protein daily to stimulate muscle protein synthesis (MPS).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BMI & BODY COMPOSITION HEALTH INDEX */}
        {activeTab === 'bmi' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-6">
              <div>
                <h4 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-1">
                  Body Mass Index (WHO Standards)
                </h4>
                <p className="text-xs text-slate-500">
                  Assess body mass relative to stature based on World Health Organization clinical thresholds.
                </p>
              </div>

              {/* Weight Slider */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Current Body Weight
                  </label>
                  <span className="font-mono text-base font-bold text-emerald-800 dark:text-emerald-400">
                    {unitSystem === 'metric' ? `${weightKg} kg` : `${weightLbs} lbs`}
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="180"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Height Slider */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Height / Stature
                  </label>
                  <span className="font-mono text-base font-bold text-emerald-800 dark:text-emerald-400">
                    {unitSystem === 'metric' ? `${heightCm} cm` : `${heightFeet}' ${heightInches}"`}
                  </span>
                </div>
                <input
                  type="range"
                  min="130"
                  max="220"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Healthy Weight Benchmark for Height */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Ideal Clinical Weight Range for {heightCm} cm
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-400">
                    {unitSystem === 'metric'
                      ? `${bmiResults.minHealthyKg} - ${bmiResults.maxHealthyKg} kg`
                      : `${bmiResults.minHealthyLbs} - ${bmiResults.maxHealthyLbs} lbs`}
                  </span>
                  <span className="text-xs text-slate-500">(BMI 18.5 – 24.9)</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Maintaining your weight within this window is associated with the lowest all-cause mortality and optimal insulin sensitivity.
                </p>
              </div>
            </div>

            {/* Gauge & Analysis */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-6 md:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
                  Calculated Body Mass Index
                </div>

                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-5xl md:text-6xl font-black font-heading tracking-tight text-white">
                    {bmiResults.bmi}
                  </span>
                  <span className={`text-base font-bold ${bmiResults.colorClass}`}>
                    {bmiResults.category}
                  </span>
                </div>

                {/* Colored Gauge Bar */}
                <div className="my-5">
                  <div className="h-4 w-full rounded-full bg-slate-800 relative overflow-hidden flex">
                    <div className="h-full bg-cyan-500/80 w-[20%]" title="Underweight (<18.5)" />
                    <div className="h-full bg-emerald-500 w-[30%]" title="Normal (18.5-24.9)" />
                    <div className="h-full bg-amber-500 w-[25%]" title="Overweight (25-29.9)" />
                    <div className="h-full bg-rose-500 w-[25%]" title="Obese (>=30)" />
                  </div>
                  {/* Indicator Arrow */}
                  <div
                    className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-white mx-auto transition-all duration-300 mt-1"
                    style={{ marginLeft: `${Math.max(5, Math.min(95, bmiResults.barPercent))}%` }}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                    <span>18.5 (Under)</span>
                    <span className="text-emerald-400 font-bold">24.9 (Normal)</span>
                    <span>29.9 (Over)</span>
                    <span>35+ (Obese)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-xs space-y-1">
                  <div className="font-bold text-slate-200">Epidemiological Risk Evaluation:</div>
                  <div className="text-slate-300">{bmiResults.riskLevel}</div>
                </div>
              </div>

              {/* Clinical Nuance Warning */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
                <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Clinical Note:</strong> BMI does not distinguish between skeletal muscle mass and adipose tissue. Well-trained athletes and bodybuilders with high lean mass may register as "Overweight" despite having low body fat percentages.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WORKOUT CALORIE BURN & EXERCISE EXPENDITURE */}
        {activeTab === 'exercise' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-5">
              <div>
                <h4 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-1">
                  Exercise Calorie Burn & METs Calculator
                </h4>
                <p className="text-xs text-slate-500">
                  Calculated using the 2026 Compendium of Physical Activities with excess post-exercise oxygen consumption (EPOC).
                </p>
              </div>

              {/* Activity Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Select Exercise Discipline
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {WORKOUT_ACTIVITIES.map((act) => (
                    <button
                      key={act.id}
                      onClick={() => setSelectedWorkoutId(act.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedWorkoutId === act.id
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-slate-900 dark:text-white shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span className="line-clamp-1">{act.name}</span>
                        <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400">{act.met} METs</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{act.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration and Intensity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Duration
                    </label>
                    <span className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-400">
                      {workoutDurationMins} minutes
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="180"
                    step="5"
                    value={workoutDurationMins}
                    onChange={(e) => setWorkoutDurationMins(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>10 min</span>
                    <span>180 min (3 hrs)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Effort Intensity
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setWorkoutIntensity('normal')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        workoutIntensity === 'normal'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      Steady Pace
                    </button>
                    <button
                      onClick={() => setWorkoutIntensity('high')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        workoutIntensity === 'high'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      High Intensity (+15%)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Workout Results Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl">
                <div className="text-xs uppercase font-bold text-amber-400 tracking-wider mb-1 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Session Energy Expenditure</span>
                </div>

                <div className="flex items-baseline gap-2 my-2">
                  <span className="text-4xl md:text-5xl font-black font-heading text-white">
                    {workoutBurn.caloriesBurned}
                  </span>
                  <span className="text-base font-semibold text-amber-400">kcal burned</span>
                </div>

                <div className="text-xs text-slate-400 border-b border-slate-800 pb-3 mb-3 flex items-center justify-between">
                  <span>Effective MET: <strong>{workoutBurn.effectiveMet}</strong></span>
                  <span>EPOC Afterburn: <strong className="text-emerald-400">+{workoutBurn.epocBonus} kcal</strong></span>
                </div>

                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Food Caloric Equivalents
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <span className="text-lg font-bold font-mono text-amber-400">~{workoutBurn.bananas}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Bananas</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <span className="text-lg font-bold font-mono text-emerald-400">~{workoutBurn.avocados}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Avocados</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <span className="text-lg font-bold font-mono text-cyan-400">~{workoutBurn.proteinBars}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Protein Bars</p>
                  </div>
                </div>
              </div>

              {/* Heart Rate Training Zone Insight */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>Target Heart Rate Zone Recommendation</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  For optimal fat mobilization without central fatigue, maintain your heart rate at <strong>{Math.round((220 - age) * 0.65)} - {Math.round((220 - age) * 0.75)} BPM</strong> (Zone 2).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FOOD & MEAL CALORIE / MACRO BUILDER */}
        {activeTab === 'food' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Foods Library */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                    Nutritious Foods Directory
                  </h4>
                  <p className="text-xs text-slate-500">Verified nutritional values per 100g raw / cooked.</p>
                </div>

                {/* Category filters */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                  {['All', 'Protein', 'Carbs', 'Fats', 'Produce'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedFoodCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        selectedFoodCategory === cat
                          ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {filteredFoods.map((food) => (
                  <div
                    key={food.id}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-white dark:bg-slate-800/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {food.name}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 shrink-0">
                          {food.caloriesPer100g} kcal/100g
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                        <span>P: {food.proteinPer100g}g</span>
                        <span>·</span>
                        <span>C: {food.carbsPer100g}g</span>
                        <span>·</span>
                        <span>F: {food.fatPer100g}g</span>
                        {food.fiberPer100g > 0 && (
                          <>
                            <span>·</span>
                            <span>Fiber: {food.fiberPer100g}g</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddFood(food)}
                      className="mt-2 py-1 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add to Daily Plate</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Plate / Meal Assembly */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      My Daily Meal Plate ({plate.length} items)
                    </span>
                  </div>
                  <button
                    onClick={() => setPlate([])}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Items in plate */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {plate.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Your meal plate is currently empty. Click "Add to Daily Plate" on any food on the left.
                    </div>
                  ) : (
                    plate.map((item, idx) => {
                      const factor = item.quantityGrams / 100;
                      const itemCalories = Math.round(item.food.caloriesPer100g * factor);
                      const itemProtein = Math.round(item.food.proteinPer100g * factor);
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-200 line-clamp-1">
                              {item.food.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="number"
                                min="10"
                                max="1000"
                                step="10"
                                value={item.quantityGrams}
                                onChange={(e) => handleUpdatePlateQuantity(idx, Number(e.target.value))}
                                className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-white text-center"
                              />
                              <span className="text-[10px] text-slate-400">g</span>
                              <span className="text-[10px] text-emerald-400 font-mono">
                                ({itemCalories} kcal · {itemProtein}g P)
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveFromPlate(idx)}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Plate Summary Totals */}
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">Total Plate Energy:</span>
                    <span className="text-2xl font-black font-heading text-emerald-400">
                      {plateTotals.calories} <span className="text-xs font-normal text-slate-400">/ {targetCalories} kcal</span>
                    </span>
                  </div>

                  {/* Progress bar towards daily goal */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        plateTotals.calories > targetCalories ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (plateTotals.calories / targetCalories) * 100)}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center pt-2">
                    <div className="p-1.5 rounded-lg bg-slate-800/60">
                      <div className="text-xs font-bold font-mono text-cyan-400">{plateTotals.protein}g</div>
                      <div className="text-[9px] text-slate-400">Protein</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-800/60">
                      <div className="text-xs font-bold font-mono text-amber-400">{plateTotals.carbs}g</div>
                      <div className="text-[9px] text-slate-400">Carbs</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-800/60">
                      <div className="text-xs font-bold font-mono text-rose-400">{plateTotals.fat}g</div>
                      <div className="text-[9px] text-slate-400">Fats</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-800/60">
                      <div className="text-xs font-bold font-mono text-emerald-400">{plateTotals.fiber}g</div>
                      <div className="text-[9px] text-slate-400">Fiber</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: HYDRATION & WATER INTAKE */}
        {activeTab === 'hydration' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div>
                <h4 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-1">
                  Individualized Daily Water Intake
                </h4>
                <p className="text-xs text-slate-500">
                  Calibrated to your body weight ({weightKg} kg) and exercise output ({workoutDurationMins} min session).
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Metabolic Baseline Requirement:</span>
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {(weightKg * 0.035).toFixed(1)} L/day
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Exercise Sweat Replacement:</span>
                  <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    +{((workoutDurationMins / 45) * 0.5).toFixed(1)} L
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm font-bold">
                  <span className="text-slate-900 dark:text-white">Total Daily Fluid Target:</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-mono text-base">
                    {hydrationLiters.liters} Liters
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50 text-xs text-cyan-900 dark:text-cyan-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-cyan-500" />
                  <span>Cellular Hydration Guidelines</span>
                </div>
                <p>
                  Drink 500ml upon waking to offset nocturnal respiration losses, and consume 150-250ml every 15-20 minutes during moderate-to-vigorous exercise.
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col items-center justify-center p-8 rounded-3xl bg-gradient-to-b from-cyan-900/30 via-slate-900 to-slate-950 border border-cyan-800/40 text-center">
              <div className="w-20 h-20 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
                <Droplet className="w-10 h-10" />
              </div>
              <div className="text-xs uppercase font-bold text-cyan-400 tracking-wider">
                Recommended Daily Fluid Target
              </div>
              <div className="text-5xl font-black font-heading text-white my-2">
                {hydrationLiters.liters} <span className="text-2xl font-normal text-cyan-300">Liters</span>
              </div>
              <div className="text-sm font-medium text-slate-300">
                Approximately <strong>{hydrationLiters.cups} standard glasses</strong> (240ml / 8oz)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Embedded High-Yield AdSense Banner (Inside Calculator Suite for maximum RPM) */}
      <div className="px-6 md:px-8 pb-4">
        <AdSenseBanner type="in_article" slotId="pub-98410294-calc-native" />
      </div>

      {/* Footer Medical & Scientific Disclaimer */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>
            Calculated via validated Mifflin-St Jeor & WHO energy models. Not a substitute for formal clinical diagnosis or personalized medical therapy.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setAge(32);
              setWeightKg(75);
              setHeightCm(178);
              setActivityMultiplier(1.55);
              setFitnessGoal('fat_loss');
            }}
            className="hover:text-emerald-500 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Standards</span>
          </button>
        </div>
      </div>
    </div>
  );
};
