import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface FoodItem {
  name: string;
  weight_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
  raw_name?: string;
  nutrition_source?: string;
}

interface EditableFoodItem extends FoodItem {
  original_weight_grams: number;
  base_calories: number;
  base_protein: number;
  base_carbs: number;
  base_fat: number;
}

interface Results {
  items: FoodItem[];
  total_calories: number;
  mock?: boolean;
  overlay_image?: string;
  reason?: string;
}

type MacroKey = 'carbs' | 'protein' | 'fat';

const MACROS: Array<{ key: MacroKey; label: string; color: string; bg: string; kcalPerGram: number }> = [
  { key: 'carbs', label: 'Carbs', color: '#d97706', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', kcalPerGram: 4 },
  { key: 'protein', label: 'Protein', color: '#2563eb', bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300', kcalPerGram: 4 },
  { key: 'fat', label: 'Fat', color: '#dc2626', bg: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300', kcalPerGram: 9 },
];

const PORTION_PRESETS = [
  { label: 'Small', multiplier: 0.75 },
  { label: 'Medium', multiplier: 1 },
  { label: 'Large', multiplier: 1.35 },
];

export default function ResultsPage() {
  const { state } = useLocation() as { state: { results: Results; imagePreview: string } };
  const navigate = useNavigate();
  const results = state?.results;
  const imagePreview = state?.imagePreview;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [imageMode, setImageMode] = useState<'ai' | 'original'>('ai');
  const [adjustedItems, setAdjustedItems] = useState<EditableFoodItem[]>(() =>
    (state?.results?.items ?? []).map(toEditableFoodItem)
  );
  const totalCalories = useMemo(
    () => roundOne(adjustedItems.reduce((sum, item) => sum + Number(item.calories || 0), 0)),
    [adjustedItems],
  );
  const macroSummary = useMemo(() => buildMacroSummary(adjustedItems), [adjustedItems]);

  if (!results) {
    return <Navigate to="/upload" replace />;
  }

  const hasOverlay = Boolean(results.overlay_image);
  const activeImage = hasOverlay && imageMode === 'ai' ? results.overlay_image : imagePreview;

  const updatePortion = (index: number, weight: number) => {
    setAdjustedItems(items => items.map((item, itemIndex) => (
      itemIndex === index ? recalculateForWeight(item, weight) : item
    )));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      let image_base64 = '';
      if (imagePreview) {
        const response = await fetch(imagePreview);
        const blob = await response.blob();
        image_base64 = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      await api.post('/api/meals/save/', {
        items: adjustedItems.map(({ name, weight_grams, calories, protein, carbs, fat, confidence, nutrition_source }) => ({
          name,
          weight_grams,
          calories,
          protein,
          carbs,
          fat,
          confidence,
          nutrition_source,
        })),
        total_calories: totalCalories,
        image_base64,
      });
      setSaved(true);
      setTimeout(() => navigate('/history'), 1500);
    } catch {
      setError('Failed to save meal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Meal analysis</p>
          <h1 className="text-3xl font-bold text-gray-950 mt-1 dark:text-white">Analysis Results</h1>
        </div>
        {results.mock && (
          <span className="w-fit text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900">
            Demo Data
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-6 items-start">
        <section className="space-y-6">
          {activeImage && (
            <div>
              {hasOverlay && (
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 mb-3 shadow-sm dark:bg-gray-900 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setImageMode('ai')}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                      imageMode === 'ai' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    AI output
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode('original')}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                      imageMode === 'original' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    Original
                  </button>
                </div>
              )}
              <div className="rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shadow-sm dark:bg-gray-900 dark:border-gray-800">
                <img
                  src={activeImage}
                  alt={hasOverlay && imageMode === 'ai' ? 'AI output with food labels and masks' : 'Your meal'}
                  className="w-full max-h-[72vh] object-contain"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {adjustedItems.map((item, i) => (
              <FoodItemCard
                key={`${item.name}-${i}`}
                item={item}
                onPortionChange={weight => updatePortion(i, weight)}
              />
            ))}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm dark:bg-gray-900 dark:border-gray-800">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Calories</div>
            <div className="mt-1 text-4xl font-bold text-gray-950 dark:text-white">
              {totalCalories}
              <span className="text-base font-medium text-gray-500 ml-1 dark:text-gray-400">kcal</span>
            </div>
          </div>

          <MacroPieChart summary={macroSummary} />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm dark:bg-red-950 dark:border-red-900 dark:text-red-300">
              {error}
            </div>
          )}

          {saved ? (
            <div className="w-full bg-green-100 text-green-800 font-semibold py-4 rounded-lg text-center dark:bg-green-950 dark:text-green-300">
              Meal saved. Redirecting to history...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/upload')}
                className="border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Try Another
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Meal'}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function FoodItemCard({
  item,
  onPortionChange,
}: {
  item: EditableFoodItem;
  onPortionChange: (weight: number) => void;
}) {
  const selectedPreset = PORTION_PRESETS.find(preset => (
    Math.round(item.weight_grams) === Math.round(item.original_weight_grams * preset.multiplier)
  ))?.label;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-gray-950 capitalize dark:text-white">{item.name}</h3>
          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
            {item.weight_grams}g estimated portion
            {typeof item.confidence === 'number' ? ` - ${item.confidence}% confidence` : ''}
          </p>
          {item.nutrition_source && (
            <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">
              Source: {formatNutritionSource(item.nutrition_source)}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-green-700">{item.calories}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:bg-gray-950 dark:border-gray-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Portion size</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Adjust grams before saving.</div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Grams</span>
            <input
              type="number"
              min={1}
              step={5}
              value={Math.round(item.weight_grams)}
              onChange={e => onPortionChange(Number(e.target.value))}
              className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {PORTION_PRESETS.map(preset => {
            const weight = Math.round(item.original_weight_grams * preset.multiplier);
            const active = selectedPreset === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onPortionChange(weight)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MacroBadge label="Protein" value={item.protein} unit="g" color="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" />
        <MacroBadge label="Carbs" value={item.carbs} unit="g" color="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" />
        <MacroBadge label="Fat" value={item.fat} unit="g" color="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" />
      </div>
    </div>
  );
}

function MacroPieChart({ summary }: { summary: ReturnType<typeof buildMacroSummary> }) {
  const pieStyle: React.CSSProperties = {
    background: summary.gradient,
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-950 dark:text-white">Macro Ratio</h2>
          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Calories from carbs, protein, and fat.</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{summary.totalMacroCalories}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">macro kcal</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5">
        <div className="relative h-44 w-44 rounded-full shadow-inner" style={pieStyle}>
          <div className="absolute inset-10 rounded-full bg-white flex flex-col items-center justify-center border border-gray-100 dark:bg-gray-950 dark:border-gray-800">
            <span className="text-2xl font-bold text-gray-950 dark:text-white">{summary.totalGrams}g</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">macros</span>
          </div>
        </div>

        <div className="w-full space-y-3">
          {summary.parts.map(part => (
            <div key={part.key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: part.color }} />
                  <span className="font-medium text-gray-800 dark:text-gray-200">{part.label}</span>
                </div>
                <span className="font-semibold text-gray-950 dark:text-white">{part.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden dark:bg-gray-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${part.percent}%`, backgroundColor: part.color }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                {part.grams}g / {part.calories} kcal
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MacroBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${color}`}>
      <div className="text-sm font-bold">{value}{unit}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function buildMacroSummary(items: FoodItem[]) {
  const grams = {
    carbs: roundOne(items.reduce((sum, item) => sum + Number(item.carbs || 0), 0)),
    protein: roundOne(items.reduce((sum, item) => sum + Number(item.protein || 0), 0)),
    fat: roundOne(items.reduce((sum, item) => sum + Number(item.fat || 0), 0)),
  };

  const calories = {
    carbs: roundOne(grams.carbs * 4),
    protein: roundOne(grams.protein * 4),
    fat: roundOne(grams.fat * 9),
  };

  const totalMacroCalories = roundOne(calories.carbs + calories.protein + calories.fat);
  const totalGrams = roundOne(grams.carbs + grams.protein + grams.fat);
  let cursor = 0;

  const parts = MACROS.map(macro => {
    const percent = totalMacroCalories > 0 ? Math.round((calories[macro.key] / totalMacroCalories) * 100) : 0;
    const start = cursor;
    const end = cursor + percent;
    cursor = end;

    return {
      ...macro,
      grams: grams[macro.key],
      calories: calories[macro.key],
      percent,
      start,
      end,
    };
  });

  const gradient = totalMacroCalories > 0
    ? `conic-gradient(${parts.map(part => `${part.color} ${part.start}% ${part.end}%`).join(', ')})`
    : 'conic-gradient(#e5e7eb 0% 100%)';

  return {
    parts,
    totalMacroCalories,
    totalGrams,
    gradient,
  };
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function toEditableFoodItem(item: FoodItem): EditableFoodItem {
  return {
    ...item,
    original_weight_grams: item.weight_grams || 1,
    base_calories: item.calories || 0,
    base_protein: item.protein || 0,
    base_carbs: item.carbs || 0,
    base_fat: item.fat || 0,
  };
}

function recalculateForWeight(item: EditableFoodItem, weight: number): EditableFoodItem {
  const nextWeight = Math.max(1, Math.round(Number.isFinite(weight) ? weight : item.weight_grams));
  const ratio = nextWeight / item.original_weight_grams;

  return {
    ...item,
    weight_grams: nextWeight,
    calories: roundOne(item.base_calories * ratio),
    protein: roundOne(item.base_protein * ratio),
    carbs: roundOne(item.base_carbs * ratio),
    fat: roundOne(item.base_fat * ratio),
  };
}

function formatNutritionSource(source: string) {
  return source.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}
