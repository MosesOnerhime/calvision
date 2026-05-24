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
    { label: "Today's Calories", value: `${stats.today_calories} kcal`, icon: '🔥', color: 'bg-orange-50 border-orange-200' },
    { label: 'Total Meals Logged', value: stats.total_meals.toString(), icon: '🍽️', color: 'bg-blue-50 border-blue-200' },
    {
      label: 'Last Meal', icon: '🕐', color: 'bg-purple-50 border-purple-200',
      value: stats.recent_meal
        ? new Date(stats.recent_meal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'No meals yet'
    },
  ] : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Good {getTimeOfDay()}, {user?.first_name}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's your nutrition summary for today.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {cards.map(c => (
            <div key={c.label} className={`border rounded-2xl p-6 ${c.color}`}>
              <div className="text-3xl mb-2">{c.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{c.value}</div>
              <div className="text-sm text-gray-500 mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-8 text-white">
        <h2 className="text-xl font-bold mb-2">Ready to analyze your meal?</h2>
        <p className="text-green-100 mb-4">Upload a photo and CalVision will identify the foods and calculate nutrition instantly.</p>
        <button onClick={() => navigate('/upload')}
          className="bg-white text-green-700 font-semibold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors">
          📸 Analyze a Meal
        </button>
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}