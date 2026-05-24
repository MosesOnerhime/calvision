import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface FoodItem { id: number; name: string; weight_grams: number; calories: number; protein: number; carbs: number; fat: number; }
interface MealLog { id: number; created_at: string; total_calories: number; image_url: string | null; food_items: FoodItem[]; }

export default function HistoryPage() {
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.get('/api/meals/history/')
      .then(r => setMeals(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Meal History</h1>
      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Meal History</h1>
      <p className="text-gray-500 mb-6">{meals.length} meals logged</p>

      {meals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🍽️</div>
          <p className="font-medium">No meals logged yet</p>
          <p className="text-sm mt-1">Analyze your first meal to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map(meal => (
            <div key={meal.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === meal.id ? null : meal.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
              >
                {meal.image_url ? (
                  <img src={meal.image_url} alt="meal" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">🍴</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">
                    {meal.food_items.map(f => f.name).join(', ') || 'Meal'}
                  </div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    {new Date(meal.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-green-600">{meal.total_calories}</div>
                  <div className="text-xs text-gray-400">kcal</div>
                </div>
                <div className={`text-gray-400 transition-transform ${expanded === meal.id ? 'rotate-180' : ''}`}>▾</div>
              </button>

              {expanded === meal.id && (
                <div className="border-t border-gray-100 p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-xs uppercase">
                        <th className="text-left pb-2">Food</th>
                        <th className="text-right pb-2">Weight</th>
                        <th className="text-right pb-2">Kcal</th>
                        <th className="text-right pb-2">Protein</th>
                        <th className="text-right pb-2">Carbs</th>
                        <th className="text-right pb-2">Fat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {meal.food_items.map(item => (
                        <tr key={item.id}>
                          <td className="py-2 font-medium capitalize">{item.name}</td>
                          <td className="py-2 text-right text-gray-500">{item.weight_grams}g</td>
                          <td className="py-2 text-right font-semibold text-green-600">{item.calories}</td>
                          <td className="py-2 text-right text-blue-600">{item.protein}g</td>
                          <td className="py-2 text-right text-amber-600">{item.carbs}g</td>
                          <td className="py-2 text-right text-red-500">{item.fat}g</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}