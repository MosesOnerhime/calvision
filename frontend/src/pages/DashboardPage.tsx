import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface Stats { today_calories: number; total_meals: number; recent_meal: any; }

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/meals/stats/')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: "Today's Calories", value: `${stats.today_calories} kcal`, tone: 'border-l-orange-500' },
    { label: 'Meals Logged', value: stats.total_meals.toString(), tone: 'border-l-blue-500' },
    {
      label: 'Last Meal',
      tone: 'border-l-violet-500',
      value: stats.recent_meal
        ? new Date(stats.recent_meal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'No meals yet'
    },
  ] : [];

  return (
    <div className="space-y-8">
      <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Today</p>
            <h1 className="text-3xl font-bold text-gray-950 mt-1 dark:text-white">
              Good {getTimeOfDay()}, {user?.first_name || 'there'}
            </h1>
            <p className="text-gray-500 mt-2 dark:text-gray-400">Your nutrition summary is ready when you are.</p>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-3 rounded-lg transition-colors"
          >
            Analyze Meal
          </button>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white border border-gray-200 rounded-lg animate-pulse dark:bg-gray-900 dark:border-gray-800" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map(c => (
            <div key={c.label} className={`bg-white border border-gray-200 border-l-4 rounded-lg p-5 shadow-sm dark:bg-gray-900 dark:border-gray-800 ${c.tone}`}>
              <div className="text-2xl font-bold text-gray-950 dark:text-white">{c.value}</div>
              <div className="text-sm text-gray-500 mt-1 dark:text-gray-400">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-950 dark:text-white">Latest Meal</h2>
          {stats?.recent_meal ? (
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {stats.recent_meal.food_items?.map((f: any) => f.name).join(', ') || 'Meal'}
                </div>
                <div className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                  {new Date(stats.recent_meal.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-700">{stats.recent_meal.total_calories}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 mt-3 dark:text-gray-400">Analyze a meal to start building your nutrition history.</p>
          )}
        </div>

        <div className="bg-green-700 rounded-lg p-6 text-white shadow-sm">
          <h2 className="text-lg font-bold">Ready for the next scan?</h2>
          <p className="text-green-100 mt-2">Upload a meal photo and CalVision will prepare the nutrition breakdown.</p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-5 bg-white text-green-800 font-semibold px-5 py-3 rounded-lg hover:bg-green-50 transition-colors"
          >
            Start Analysis
          </button>
        </div>
      </section>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
