import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface FoodItem {
  id: number;
  name: string;
  weight_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.get('/api/meals/history/')
      .then(r => setMeals(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalCalories = meals.reduce((sum, meal) => sum + Number(meal.total_calories || 0), 0);
    const itemCount = meals.reduce((sum, meal) => sum + meal.food_items.length, 0);
    const averageCalories = meals.length ? Math.round(totalCalories / meals.length) : 0;

    return {
      totalCalories: Math.round(totalCalories),
      itemCount,
      averageCalories,
    };
  }, [meals]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader count={0} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white border border-gray-200 rounded-lg animate-pulse dark:bg-gray-900 dark:border-gray-800" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white border border-gray-200 rounded-lg animate-pulse dark:bg-gray-900 dark:border-gray-800" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader count={meals.length} />

      {meals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Meals Logged" value={meals.length.toString()} accent="border-l-green-500" />
          <StatCard label="Total Calories" value={`${stats.totalCalories} kcal`} accent="border-l-orange-500" />
          <StatCard label="Average Meal" value={`${stats.averageCalories} kcal`} accent="border-l-blue-500" />
        </div>
      )}

      {meals.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center shadow-sm dark:bg-gray-900 dark:border-gray-800">
          <div className="mx-auto h-12 w-12 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-700 font-black dark:bg-green-950 dark:border-green-900 dark:text-green-300">
            +
          </div>
          <h2 className="text-xl font-bold text-gray-950 mt-5 dark:text-white">No meals logged yet</h2>
          <p className="text-gray-500 mt-2 dark:text-gray-400">Analyze your first meal to start building a nutrition history.</p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-3 rounded-lg transition-colors"
          >
            Analyze Meal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map(meal => (
            <MealHistoryItem
              key={meal.id}
              meal={meal}
              expanded={expanded === meal.id}
              onToggle={() => setExpanded(expanded === meal.id ? null : meal.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PageHeader({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">History</p>
        <h1 className="text-3xl font-bold text-gray-950 mt-1 dark:text-white">Meal History</h1>
        <p className="text-gray-500 mt-2 dark:text-gray-400">
          {count === 1 ? '1 meal logged' : `${count} meals logged`}
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`bg-white border border-gray-200 border-l-4 rounded-lg p-5 shadow-sm dark:bg-gray-900 dark:border-gray-800 ${accent}`}>
      <div className="text-2xl font-bold text-gray-950 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500 mt-1 dark:text-gray-400">{label}</div>
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
  const mealTitle = meal.food_items.map(f => f.name).join(', ') || 'Meal';
  const macros = meal.food_items.reduce(
    (sum, item) => ({
      protein: sum.protein + Number(item.protein || 0),
      carbs: sum.carbs + Number(item.carbs || 0),
      fat: sum.fat + Number(item.fat || 0),
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden dark:bg-gray-900 dark:border-gray-800">
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-[64px_1fr_auto] items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left dark:hover:bg-gray-800"
      >
        {meal.image_url ? (
          <img src={meal.image_url} alt="Meal" className="w-16 h-16 rounded-lg object-cover bg-gray-100 dark:bg-gray-800" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-700 font-black dark:bg-green-950 dark:border-green-900 dark:text-green-300">
            CV
          </div>
        )}

        <div className="min-w-0">
          <div className="font-semibold text-gray-950 capitalize truncate dark:text-white">{mealTitle}</div>
          <div className="text-sm text-gray-500 mt-1 dark:text-gray-400">
            {new Date(meal.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div className="hidden sm:flex gap-3 text-xs text-gray-500 mt-2 dark:text-gray-400">
            <span>{roundOne(macros.protein)}g protein</span>
            <span>{roundOne(macros.carbs)}g carbs</span>
            <span>{roundOne(macros.fat)}g fat</span>
          </div>
        </div>

        <div className="text-right">
          <div className="font-bold text-green-700">{meal.total_calories}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
          <div className={`text-gray-400 text-lg transition-transform mt-1 ${expanded ? 'rotate-180' : ''}`}>
            v
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 overflow-x-auto dark:border-gray-800">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">
                <th className="text-left pb-3">Food</th>
                <th className="text-right pb-3">Weight</th>
                <th className="text-right pb-3">Kcal</th>
                <th className="text-right pb-3">Protein</th>
                <th className="text-right pb-3">Carbs</th>
                <th className="text-right pb-3">Fat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {meal.food_items.map(item => (
                <tr key={item.id}>
                  <td className="py-3 font-medium capitalize text-gray-950 dark:text-gray-100">{item.name}</td>
                  <td className="py-3 text-right text-gray-500 dark:text-gray-400">{item.weight_grams}g</td>
                  <td className="py-3 text-right font-semibold text-green-700">{item.calories}</td>
                  <td className="py-3 text-right text-blue-700">{item.protein}g</td>
                  <td className="py-3 text-right text-amber-700">{item.carbs}g</td>
                  <td className="py-3 text-right text-red-600">{item.fat}g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}
