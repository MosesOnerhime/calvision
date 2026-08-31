import React, { useMemo, useState } from 'react';
import { Check, Database, Image as ImageIcon, PencilLine, RotateCcw, Save, Scale, ScanLine } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Button, InlineAlert, PageHeader, cn } from '../components/ui';

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
  portion_estimation_method?: string;
}

interface EditableFoodItem extends FoodItem {
  original_weight_grams: number;
  base_calories: number;
  base_protein: number;
  base_carbs: number;
  base_fat: number;
  predicted_name: string;
}

interface Results {
  items: FoodItem[];
  total_calories: number;
  mock?: boolean;
  overlay_image?: string;
  reason?: string;
}

type MacroKey = 'carbs' | 'protein' | 'fat';

const MACROS: Array<{ key: MacroKey; label: string; color: string; styles: string; kcalPerGram: number }> = [
  { key: 'carbs', label: 'Carbs', color: '#B87412', styles: 'bg-carbs-soft text-carbs', kcalPerGram: 4 },
  { key: 'protein', label: 'Protein', color: '#3567A8', styles: 'bg-protein-soft text-protein', kcalPerGram: 4 },
  { key: 'fat', label: 'Fat', color: '#76579A', styles: 'bg-fat-soft text-fat', kcalPerGram: 9 },
];

const PORTION_PRESETS = [
  { label: 'Small', multiplier: 0.75 },
  { label: 'Medium', multiplier: 1 },
  { label: 'Large', multiplier: 1.35 },
];

const FOOD_CORRECTION_OPTIONS = [
  { raw_name: 'jollof_rice', name: 'Jollof Rice', calories: 145, protein: 3.2, carbs: 28.0, fat: 2.8 },
  { raw_name: 'fried_plantain', name: 'Fried Plantain', calories: 231, protein: 1.5, carbs: 38.4, fat: 8.9 },
  { raw_name: 'chicken', name: 'Chicken', calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6 },
  { raw_name: 'egusi_soup', name: 'Egusi Soup', calories: 212, protein: 9.8, carbs: 8.2, fat: 16.5 },
  { raw_name: 'eba', name: 'Eba', calories: 130, protein: 1.2, carbs: 31.2, fat: 0.3 },
  { raw_name: 'pounded_yam', name: 'Pounded Yam', calories: 118, protein: 1.5, carbs: 27.8, fat: 0.2 },
];

export default function ResultsPage() {
  const { state } = useLocation() as { state: { results: Results; imagePreview: string } | null };
  const navigate = useNavigate();
  const results = state?.results;
  const imagePreview = state?.imagePreview;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [imageMode, setImageMode] = useState<'ai' | 'original'>('ai');
  const [adjustedItems, setAdjustedItems] = useState<EditableFoodItem[]>(() =>
    (state?.results?.items ?? []).map(toEditableFoodItem),
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

  const updatePrediction = (index: number, rawName: string) => {
    setAdjustedItems(items => items.map((item, itemIndex) => (
      itemIndex === index ? recalculateForFoodLabel(item, rawName) : item
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
        image_base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
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
      window.setTimeout(() => navigate('/history'), 1500);
    } catch {
      setError('Failed to save meal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Meal analysis"
        title="Analysis results"
        description="Review the identified foods and portions. Your changes recalculate the nutrition totals before saving."
        action={results.mock ? (
          <span className="inline-flex h-9 items-center rounded-full bg-warning-soft px-3 text-xs font-extrabold text-warning">Fallback result</span>
        ) : undefined}
      />

      {results.mock && results.reason && (
        <InlineAlert>{results.reason}</InlineAlert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.7fr)] lg:items-start">
        <section className="order-1 lg:col-start-1 lg:row-start-1" aria-label="Analyzed meal image">
          {hasOverlay && (
            <div role="tablist" aria-label="Meal image view" className="mb-3 inline-flex rounded-[10px] border border-line bg-surface p-1 dark:border-night-line dark:bg-night-surface">
              <button
                role="tab"
                aria-selected={imageMode === 'ai'}
                type="button"
                onClick={() => setImageMode('ai')}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors',
                  imageMode === 'ai'
                    ? 'bg-primary text-white dark:bg-night-primary dark:text-night-canvas'
                    : 'text-ink-muted hover:text-ink dark:text-night-muted dark:hover:text-night-ink',
                )}
              >
                <ScanLine aria-hidden="true" className="h-4 w-4" />
                AI output
              </button>
              <button
                role="tab"
                aria-selected={imageMode === 'original'}
                type="button"
                onClick={() => setImageMode('original')}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors',
                  imageMode === 'original'
                    ? 'bg-primary text-white dark:bg-night-primary dark:text-night-canvas'
                    : 'text-ink-muted hover:text-ink dark:text-night-muted dark:hover:text-night-ink',
                )}
              >
                <ImageIcon aria-hidden="true" className="h-4 w-4" />
                Original
              </button>
            </div>
          )}

          {activeImage ? (
            <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-subtle dark:border-night-line dark:bg-night-subtle sm:min-h-[420px]">
              <img
                src={activeImage}
                alt={hasOverlay && imageMode === 'ai' ? 'AI output with food labels and segmentation masks' : 'Uploaded meal'}
                className="max-h-[72vh] w-full object-contain"
              />
            </div>
          ) : (
            <InlineAlert>Meal image unavailable. You can still review the nutrition estimates below.</InlineAlert>
          )}
        </section>

        <aside className="order-2 space-y-4 lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <MacroSummary totalCalories={totalCalories} summary={macroSummary} />
          {error && <InlineAlert tone="error">{error}</InlineAlert>}
          {saved && <InlineAlert tone="success">Meal saved. Opening your history...</InlineAlert>}
          <div className="hidden lg:block">
            <ResultActions saving={saving} saved={saved} onSave={handleSave} onRetry={() => navigate('/upload')} />
          </div>
        </aside>

        <section className="order-3 space-y-4 lg:col-start-1 lg:row-start-2" aria-labelledby="food-review-title">
          <div className="flex items-center justify-between border-b border-line pb-3 dark:border-night-line">
            <div>
              <h2 id="food-review-title" className="text-xl font-extrabold text-ink dark:text-night-ink">Review identified foods</h2>
              <p className="mt-1 text-sm text-ink-muted dark:text-night-muted">Correct a label or adjust grams if an estimate looks wrong.</p>
            </div>
            <span className="numeric text-sm font-bold text-ink-muted dark:text-night-muted">{adjustedItems.length} {adjustedItems.length === 1 ? 'item' : 'items'}</span>
          </div>

          {adjustedItems.map((item, index) => (
            <FoodItemCard
              key={`${item.predicted_name}-${index}`}
              item={item}
              index={index}
              onPortionChange={weight => updatePortion(index, weight)}
              onPredictionChange={rawName => updatePrediction(index, rawName)}
            />
          ))}

          {adjustedItems.length === 0 && (
            <InlineAlert tone="error">No food items were identified. Try another clear, well-lit photo.</InlineAlert>
          )}
        </section>

        <div className="order-4 lg:hidden">
          <ResultActions saving={saving} saved={saved} onSave={handleSave} onRetry={() => navigate('/upload')} />
        </div>
      </div>
    </div>
  );
}

function ResultActions({
  saving,
  saved,
  onSave,
  onRetry,
}: {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      <Button type="button" onClick={onSave} loading={saving} disabled={saved} size="lg">
        {saved ? <Check aria-hidden="true" className="h-5 w-5" /> : <Save aria-hidden="true" className="h-5 w-5" />}
        {saved ? 'Meal Saved' : saving ? 'Saving...' : 'Save Meal'}
      </Button>
      <Button type="button" variant="secondary" onClick={onRetry} disabled={saving} size="lg">
        <RotateCcw aria-hidden="true" className="h-5 w-5" />
        Analyze Another
      </Button>
    </div>
  );
}

function FoodItemCard({
  item,
  index,
  onPortionChange,
  onPredictionChange,
}: {
  item: EditableFoodItem;
  index: number;
  onPortionChange: (weight: number) => void;
  onPredictionChange: (rawName: string) => void;
}) {
  const selectedPreset = PORTION_PRESETS.find(preset => (
    Math.round(item.weight_grams) === Math.round(item.original_weight_grams * preset.multiplier)
  ))?.label;
  const selectedRawName = getFoodOptionForItem(item)?.raw_name ?? item.raw_name ?? '';
  const hasCorrection = item.predicted_name.toLowerCase() !== item.name.toLowerCase();
  const selectId = `food-label-${index}`;
  const gramsId = `food-grams-${index}`;

  return (
    <article className="rounded-2xl border border-line bg-surface dark:border-night-line dark:bg-night-surface">
      <div className="flex items-start justify-between gap-4 border-b border-line p-4 dark:border-night-line sm:p-5">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold capitalize text-ink dark:text-night-ink">{item.name}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted dark:text-night-muted">
            {typeof item.confidence === 'number' && <span>{item.confidence}% confidence</span>}
            {item.nutrition_source && (
              <span className="inline-flex items-center gap-1.5"><Database aria-hidden="true" className="h-3.5 w-3.5" />{formatNutritionSource(item.nutrition_source)}</span>
            )}
            {item.portion_estimation_method && (
              <span className="inline-flex items-center gap-1.5"><Scale aria-hidden="true" className="h-3.5 w-3.5" />{formatNutritionSource(item.portion_estimation_method)}</span>
            )}
          </div>
          {hasCorrection && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary dark:text-night-primary">
              <PencilLine aria-hidden="true" className="h-3.5 w-3.5" />
              Corrected from {item.predicted_name}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="numeric text-2xl font-extrabold text-primary dark:text-night-primary">{item.calories}</p>
          <p className="text-xs text-ink-muted dark:text-night-muted">kcal</p>
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-ink dark:text-night-ink" htmlFor={selectId}>Food label</label>
          <select
            id={selectId}
            value={selectedRawName}
            onChange={event => onPredictionChange(event.target.value)}
            className="h-11 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-sm font-bold text-ink hover:border-primary focus:border-primary dark:border-night-line-strong dark:bg-night-canvas dark:text-night-ink dark:hover:border-night-primary dark:focus:border-night-primary"
          >
            {!getFoodOptionForItem(item) && <option value={selectedRawName}>{item.name}</option>}
            {FOOD_CORRECTION_OPTIONS.map(option => (
              <option key={option.raw_name} value={option.raw_name}>{option.name}</option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-ink-muted dark:text-night-muted">Change this if the model identified the food incorrectly.</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-bold text-ink dark:text-night-ink" htmlFor={gramsId}>Portion size</label>
            <div className="flex items-center gap-2">
              <input
                id={gramsId}
                type="number"
                min={1}
                step={5}
                value={Math.round(item.weight_grams)}
                onChange={event => onPortionChange(Number(event.target.value))}
                className="h-11 w-24 rounded-[10px] border border-line-strong bg-surface px-3 text-right text-sm font-bold text-ink hover:border-primary focus:border-primary dark:border-night-line-strong dark:bg-night-canvas dark:text-night-ink dark:hover:border-night-primary dark:focus:border-night-primary"
              />
              <span className="text-sm font-semibold text-ink-muted dark:text-night-muted">g</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 rounded-[10px] border border-line-strong p-1 dark:border-night-line-strong">
            {PORTION_PRESETS.map(preset => {
              const weight = Math.round(item.original_weight_grams * preset.multiplier);
              const active = selectedPreset === preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onPortionChange(weight)}
                  className={cn(
                    'h-9 rounded-lg px-2 text-xs font-bold transition-colors sm:text-sm',
                    active
                      ? 'bg-primary text-white dark:bg-night-primary dark:text-night-canvas'
                      : 'text-ink-muted hover:bg-surface-subtle hover:text-ink dark:text-night-muted dark:hover:bg-night-subtle dark:hover:text-night-ink',
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-line dark:border-night-line">
        <MacroBadge label="Protein" value={item.protein} styles="text-protein" />
        <MacroBadge label="Carbs" value={item.carbs} styles="border-x border-line text-carbs dark:border-night-line" />
        <MacroBadge label="Fat" value={item.fat} styles="text-fat" />
      </div>
    </article>
  );
}

function MacroSummary({ totalCalories, summary }: { totalCalories: number; summary: ReturnType<typeof buildMacroSummary> }) {
  const pieStyle: React.CSSProperties = { background: summary.gradient };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 dark:border-night-line dark:bg-night-surface" aria-labelledby="macro-summary-title">
      <div className="border-b border-line pb-5 dark:border-night-line">
        <p className="text-sm font-semibold text-ink-muted dark:text-night-muted">Estimated total</p>
        <p className="numeric mt-1 text-4xl font-extrabold text-ink dark:text-night-ink">
          {totalCalories}<span className="ml-1.5 text-sm font-bold text-ink-muted dark:text-night-muted">kcal</span>
        </p>
      </div>

      <div className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="macro-summary-title" className="font-extrabold text-ink dark:text-night-ink">Macro ratio</h2>
            <p className="mt-1 text-xs leading-5 text-ink-muted dark:text-night-muted">Share of calories from carbs, protein, and fat.</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="numeric text-sm font-bold text-ink dark:text-night-ink">{summary.totalMacroCalories}</p>
            <p className="text-[11px] text-ink-muted dark:text-night-muted">macro kcal</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
          <div className="relative h-36 w-36 shrink-0 rounded-full" style={pieStyle} aria-label={`${summary.totalGrams} grams of macronutrients`}>
            <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full border border-line bg-surface dark:border-night-line dark:bg-night-surface">
              <span className="numeric text-xl font-extrabold text-ink dark:text-night-ink">{summary.totalGrams}g</span>
              <span className="text-[11px] text-ink-muted dark:text-night-muted">macros</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            {summary.parts.map(part => (
              <div key={part.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-bold text-ink dark:text-night-ink">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: part.color }} />
                    {part.label}
                  </span>
                  <span className="numeric font-extrabold text-ink dark:text-night-ink">{part.percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-strong dark:bg-night-strong">
                  <div className="h-full rounded-full" style={{ width: `${part.percent}%`, backgroundColor: part.color }} />
                </div>
                <p className="numeric mt-1 text-[11px] text-ink-muted dark:text-night-muted">{part.grams}g · {part.calories} kcal</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MacroBadge({ label, value, styles }: { label: string; value: number; styles: string }) {
  return (
    <div className={cn('px-2 py-3 text-center', styles)}>
      <p className="numeric text-sm font-extrabold">{value}g</p>
      <p className="mt-0.5 text-[11px] font-bold">{label}</p>
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
    return { ...macro, grams: grams[macro.key], calories: calories[macro.key], percent, start, end };
  });

  const gradient = totalMacroCalories > 0
    ? `conic-gradient(${parts.map(part => `${part.color} ${part.start}% ${part.end}%`).join(', ')})`
    : 'conic-gradient(#D5DED6 0% 100%)';

  return { parts, totalMacroCalories, totalGrams, gradient };
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function toEditableFoodItem(item: FoodItem): EditableFoodItem {
  return {
    ...item,
    raw_name: item.raw_name ?? rawNameFromDisplayName(item.name),
    original_weight_grams: item.weight_grams || 1,
    base_calories: item.calories || 0,
    base_protein: item.protein || 0,
    base_carbs: item.carbs || 0,
    base_fat: item.fat || 0,
    predicted_name: item.name,
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

function recalculateForFoodLabel(item: EditableFoodItem, rawName: string): EditableFoodItem {
  const option = FOOD_CORRECTION_OPTIONS.find(food => food.raw_name === rawName);
  if (!option) return item;

  const originalNutrition = nutritionForWeight(option, item.original_weight_grams);
  const currentNutrition = nutritionForWeight(option, item.weight_grams);
  const changed = item.predicted_name.toLowerCase() !== option.name.toLowerCase();

  return {
    ...item,
    raw_name: option.raw_name,
    name: option.name,
    base_calories: originalNutrition.calories,
    base_protein: originalNutrition.protein,
    base_carbs: originalNutrition.carbs,
    base_fat: originalNutrition.fat,
    calories: currentNutrition.calories,
    protein: currentNutrition.protein,
    carbs: currentNutrition.carbs,
    fat: currentNutrition.fat,
    confidence: changed ? undefined : item.confidence,
    nutrition_source: changed ? 'user_corrected_curated_african_food_fallback' : item.nutrition_source,
  };
}

function nutritionForWeight(
  option: (typeof FOOD_CORRECTION_OPTIONS)[number],
  weight: number,
): Pick<FoodItem, 'calories' | 'protein' | 'carbs' | 'fat'> {
  const ratio = Math.max(1, weight) / 100;
  return {
    calories: roundOne(option.calories * ratio),
    protein: roundOne(option.protein * ratio),
    carbs: roundOne(option.carbs * ratio),
    fat: roundOne(option.fat * ratio),
  };
}

function getFoodOptionForItem(item: FoodItem) {
  const rawName = item.raw_name ?? rawNameFromDisplayName(item.name);
  return FOOD_CORRECTION_OPTIONS.find(option => option.raw_name === rawName)
    ?? FOOD_CORRECTION_OPTIONS.find(option => option.name.toLowerCase() === item.name.toLowerCase());
}

function rawNameFromDisplayName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

function formatNutritionSource(source: string) {
  return source.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}
