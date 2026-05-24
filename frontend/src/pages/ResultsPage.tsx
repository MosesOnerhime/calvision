import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface FoodItem { name: string; weight_grams: number; calories: number; protein: number; carbs: number; fat: number; }
interface Results { items: FoodItem[]; total_calories: number; mock?: boolean; }

export default function ResultsPage() {
  const { state } = useLocation() as { state: { results: Results; imagePreview: string } };
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (!state?.results) {
    navigate('/upload');
    return null;
  }

  const { results, imagePreview } = state;

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
        items: results.items,
        total_calories: results.total_calories,
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
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analysis Results</h1>
        {results.mock && (
          <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200">
            Demo Data
          </span>
        )}
      </div>

      {imagePreview && (
        <div className="rounded-2xl overflow-hidden mb-6 bg-gray-100">
          <img src={imagePreview} alt="Your meal" className="w-full max-h-64 object-cover" />
        </div>
      )}

      <div className="space-y-3 mb-6">
        {results.items.map((item, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 capitalize">{item.name}</h3>
                <p className="text-sm text-gray-400">{item.weight_grams}g estimated portion</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">{item.calories}</div>
                <div className="text-xs text-gray-400">kcal</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MacroBadge label="Protein" value={item.protein} unit="g" color="bg-blue-50 text-blue-700" />
              <MacroBadge label="Carbs" value={item.carbs} unit="g" color="bg-amber-50 text-amber-700" />
              <MacroBadge label="Fat" value={item.fat} unit="g" color="bg-red-50 text-red-700" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center justify-between mb-6">
        <div>
          <div className="text-sm font-medium text-green-700">Total Calories</div>
          <div className="text-3xl font-bold text-green-700">{results.total_calories} <span className="text-base font-normal">kcal</span></div>
        </div>
        <div className="text-4xl">🔥</div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>}

      {saved ? (
        <div className="w-full bg-green-100 text-green-700 font-semibold py-4 rounded-xl text-center">
          ✅ Meal saved! Redirecting to history...
        </div>
      ) : (
        <div className="flex gap-3">
          <button onClick={() => navigate('/upload')}
            className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors">
            ← Try Another
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors">
            {saving ? 'Saving...' : '💾 Save to Meal Log'}
          </button>
        </div>
      )}
    </div>
  );
}

function MacroBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${color}`}>
      <div className="text-sm font-bold">{value}{unit}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}