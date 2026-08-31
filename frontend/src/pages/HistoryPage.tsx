import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Flame, History, ScanLine, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Button, InlineAlert, PageHeader, Skeleton, cn } from '../components/ui';

interface FoodItem {
  id: number;
  name: string;
  weight_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number | null;
  nutrition_source?: string;
}

interface MealLog {
  id: number;
  created_at: string;
  total_calories: number;
  image_url: string | null;
  food_items: FoodItem[];
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.get('/api/meals/history/')
      .then(response => setMeals(response.data))
      .catch(() => setError('We could not load your meal history. Refresh the page to try again.'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalCalories = meals.reduce((sum, meal) => sum + Number(meal.total_calories || 0), 0);
    const itemCount = meals.reduce((sum, meal) => sum + meal.food_items.length, 0);
    return {
      itemCount,
      averageCalories: meals.length ? Math.round(totalCalories / meals.length) : 0,
    };
  }, [meals]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="History"
        title="Meal history"
        description={loading ? 'Loading your saved nutrition records...' : meals.length === 1 ? '1 meal logged' : `${meals.length} meals logged`}
        action={(
          <Button type="button" onClick={() => navigate('/upload')} className="w-full sm:w-auto">
            <ScanLine aria-hidden="true" className="h-4 w-4" />
            Analyze Meal
          </Button>
        )}
      />

      {error && <InlineAlert tone="error">{error}</InlineAlert>}

      {loading ? (
        <HistorySkeleton />
      ) : meals.length === 0 && !error ? (
        <section className="border-y border-line py-14 text-center dark:border-night-line sm:py-16">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary dark:bg-night-primary-soft dark:text-night-primary">
            <History aria-hidden="true" className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-ink dark:text-night-ink">No meals logged yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted dark:text-night-muted">
            Analyze your first meal, review the result, and save it to begin your nutrition history.
          </p>
          <Button type="button" onClick={() => navigate('/upload')} size="lg" className="mt-6">
            <ScanLine aria-hidden="true" className="h-5 w-5" />
            Analyze Your First Meal
          </Button>
        </section>
      ) : meals.length > 0 && (
        <>
          <section aria-label="History summary" className="grid gap-4 sm:grid-cols-3">
            <HistoryStat label="Meals logged" value={meals.length.toLocaleString()} icon={History} tone="text-primary bg-primary-soft" />
            <HistoryStat label="Food items" value={stats.itemCount.toLocaleString()} icon={Utensils} tone="text-protein bg-protein-soft" />
            <HistoryStat label="Average meal" value={`${stats.averageCalories.toLocaleString()} kcal`} icon={Flame} tone="text-accent bg-accent-soft" />
          </section>

          <section aria-label="Saved meals" className="space-y-3">
            {meals.map(meal => (
              <MealHistoryItem
                key={meal.id}
                meal={meal}
                expanded={expanded === meal.id}
                onToggle={() => setExpanded(expanded === meal.id ? null : meal.id)}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading meal history">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(item => <Skeleton key={item} className="h-28" />)}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(item => <Skeleton key={item} className="h-28" />)}
      </div>
    </div>
  );
}

function HistoryStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 dark:border-night-line dark:bg-night-surface">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', tone)}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="numeric truncate text-xl font-extrabold text-ink dark:text-night-ink">{value}</p>
        <p className="mt-0.5 text-xs text-ink-muted dark:text-night-muted">{label}</p>
      </div>
    </div>
  );
}

function MealHistoryItem({
  meal,
  expanded,
  onToggle,
}: {
  meal: MealLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detailId = `meal-details-${meal.id}`;
  const mealTitle = meal.food_items.map(food => food.name).join(', ') || 'Meal';
  const macros = meal.food_items.reduce(
    (sum, item) => ({
      protein: sum.protein + Number(item.protein || 0),
      carbs: sum.carbs + Number(item.carbs || 0),
      fat: sum.fat + Number(item.fat || 0),
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface dark:border-night-line dark:bg-night-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailId}
        className="grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-surface-subtle dark:hover:bg-night-subtle sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:gap-4 sm:p-5"
      >
        {meal.image_url ? (
          <img src={meal.image_url} alt="" className="h-14 w-14 rounded-[10px] bg-surface-subtle object-cover dark:bg-night-subtle sm:h-[72px] sm:w-[72px]" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-primary-soft text-primary dark:bg-night-primary-soft dark:text-night-primary sm:h-[72px] sm:w-[72px]">
            <Utensils aria-hidden="true" className="h-6 w-6" />
          </span>
        )}

        <div className="min-w-0">
          <h2 className="truncate font-extrabold capitalize text-ink dark:text-night-ink">{mealTitle}</h2>
          <p className="mt-1 truncate text-xs text-ink-muted dark:text-night-muted sm:text-sm">
            {new Date(meal.created_at).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <div className="mt-2 hidden flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted dark:text-night-muted sm:flex">
            <span className="text-protein">{roundOne(macros.protein)}g protein</span>
            <span className="text-carbs">{roundOne(macros.carbs)}g carbs</span>
            <span className="text-fat">{roundOne(macros.fat)}g fat</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right">
            <p className="numeric font-extrabold text-primary dark:text-night-primary">{meal.total_calories}</p>
            <p className="text-[11px] text-ink-muted dark:text-night-muted">kcal</p>
          </div>
          <ChevronDown aria-hidden="true" className={cn('h-5 w-5 text-ink-soft transition-transform dark:text-night-muted', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div id={detailId} className="border-t border-line dark:border-night-line">
          <div className="grid grid-cols-3 border-b border-line text-center dark:border-night-line sm:hidden">
            <MacroTotal label="Protein" value={roundOne(macros.protein)} styles="text-protein" />
            <MacroTotal label="Carbs" value={roundOne(macros.carbs)} styles="border-x border-line text-carbs dark:border-night-line" />
            <MacroTotal label="Fat" value={roundOne(macros.fat)} styles="text-fat" />
          </div>

          <div className="divide-y divide-line dark:divide-night-line">
            {meal.food_items.map(item => (
              <div key={item.id} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold capitalize text-ink dark:text-night-ink">{item.name}</h3>
                    <p className="mt-1 text-xs text-ink-muted dark:text-night-muted">{item.weight_grams}g portion</p>
                  </div>
                  <div className="text-right">
                    <p className="numeric font-extrabold text-primary dark:text-night-primary">{item.calories}</p>
                    <p className="text-[11px] text-ink-muted dark:text-night-muted">kcal</p>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-5">
                  <Metric label="Protein" value={`${item.protein}g`} styles="text-protein" />
                  <Metric label="Carbs" value={`${item.carbs}g`} styles="text-carbs" />
                  <Metric label="Fat" value={`${item.fat}g`} styles="text-fat" />
                  <Metric label="Confidence" value={item.confidence != null ? `${item.confidence}%` : 'Not recorded'} />
                  <Metric label="Nutrition source" value={item.nutrition_source ? formatNutritionSource(item.nutrition_source) : 'Not recorded'} />
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function MacroTotal({ label, value, styles }: { label: string; value: number; styles: string }) {
  return (
    <div className={cn('px-2 py-3', styles)}>
      <p className="numeric text-sm font-extrabold">{value}g</p>
      <p className="mt-0.5 text-[11px] font-bold">{label}</p>
    </div>
  );
}

function Metric({ label, value, styles }: { label: string; value: string; styles?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft dark:text-night-muted">{label}</dt>
      <dd className={cn('mt-1 break-words font-semibold text-ink dark:text-night-ink', styles)}>{value}</dd>
    </div>
  );
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function formatNutritionSource(source: string) {
  return source.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}
