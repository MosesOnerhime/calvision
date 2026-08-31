import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Flame, History, ScanLine, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Button, InlineAlert, PageHeader, Skeleton } from '../components/ui';

interface FoodItem {
  name: string;
}

interface RecentMeal {
  created_at: string;
  total_calories: number;
  food_items?: FoodItem[];
}

interface Stats {
  today_calories: number;
  total_meals: number;
  recent_meal: RecentMeal | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/meals/stats/')
      .then(response => setStats(response.data))
      .catch(() => setError('We could not load your meal summary. Refresh the page to try again.'))
      .finally(() => setLoading(false));
  }, []);

  const summary = stats ? [
    { label: "Today's calories", value: stats.today_calories.toLocaleString(), unit: 'kcal', icon: Flame, color: 'text-accent bg-accent-soft' },
    { label: 'Meals logged', value: stats.total_meals.toLocaleString(), unit: 'total', icon: Utensils, color: 'text-protein bg-protein-soft' },
    {
      label: 'Last meal',
      value: stats.recent_meal
        ? new Date(stats.recent_meal.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : 'None yet',
      unit: stats.recent_meal ? 'most recent' : 'analyze a meal',
      icon: CalendarDays,
      color: 'text-fat bg-fat-soft',
    },
  ] : [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Today"
        title={`Good ${getTimeOfDay()}, ${user?.first_name || 'there'}`}
        description="Review your latest nutrition activity or start a new meal analysis."
        action={(
          <Button type="button" size="lg" onClick={() => navigate('/upload')} className="w-full sm:w-auto">
            <ScanLine aria-hidden="true" className="h-5 w-5" />
            Analyze Meal
          </Button>
        )}
      />

      {error && <InlineAlert tone="error">{error}</InlineAlert>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(item => <Skeleton key={item} className="h-36" />)}
        </div>
      ) : stats && (
        <section aria-label="Nutrition summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summary.map(({ label, value, unit, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-line bg-surface p-5 dark:border-night-line dark:bg-night-surface">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink-muted dark:text-night-muted">{label}</p>
                  <p className="numeric mt-3 text-3xl font-extrabold text-ink dark:text-night-ink">{value}</p>
                  <p className="mt-1 text-xs text-ink-soft dark:text-night-muted">{unit}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${color}`}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {!loading && stats && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-line bg-surface dark:border-night-line dark:bg-night-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 dark:border-night-line sm:px-6">
              <div>
                <h2 className="font-extrabold text-ink dark:text-night-ink">Latest meal</h2>
                <p className="mt-1 text-sm text-ink-muted dark:text-night-muted">Your most recently saved analysis.</p>
              </div>
              {stats.recent_meal && (
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-bold text-primary hover:bg-primary-soft dark:text-night-primary dark:hover:bg-night-primary-soft"
                >
                  View history
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>

            {stats.recent_meal ? (
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="min-w-0">
                  <p className="truncate text-lg font-extrabold text-ink dark:text-night-ink">
                    {stats.recent_meal.food_items?.map(food => food.name).join(', ') || 'Meal'}
                  </p>
                  <p className="mt-2 text-sm text-ink-muted dark:text-night-muted">
                    {new Date(stats.recent_meal.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="numeric text-2xl font-extrabold text-primary dark:text-night-primary">
                    {Number(stats.recent_meal.total_calories).toLocaleString()}
                  </p>
                  <p className="text-xs text-ink-muted dark:text-night-muted">kcal</p>
                </div>
              </div>
            ) : (
              <div className="px-5 py-9 text-center sm:px-6">
                <History aria-hidden="true" className="mx-auto h-7 w-7 text-ink-soft dark:text-night-muted" />
                <h3 className="mt-3 font-bold text-ink dark:text-night-ink">No saved meals yet</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-muted dark:text-night-muted">
                  Analyze a meal and save the reviewed result to begin your nutrition history.
                </p>
              </div>
            )}
          </div>

          <div className="border-l-4 border-primary bg-primary-soft p-6 dark:border-night-primary dark:bg-night-primary-soft">
            <ScanLine aria-hidden="true" className="h-7 w-7 text-primary dark:text-night-primary" />
            <h2 className="mt-5 text-xl font-extrabold text-primary-pressed dark:text-night-ink">Ready for the next scan?</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted dark:text-night-muted">
              Upload one clear plate photo and review the model output before saving.
            </p>
            <Button type="button" onClick={() => navigate('/upload')} className="mt-6">
              Start Analysis
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
