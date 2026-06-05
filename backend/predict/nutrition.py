import json
import os
import requests
from django.conf import settings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FALLBACK_PATH = os.path.join(BASE_DIR, 'data', 'nutrition_fallback.json')

_fallback = None


def normalize_food_name(food_name: str) -> str:
    return food_name.replace('_', ' ').strip().lower()


def load_fallback():
    global _fallback
    if _fallback is None:
        with open(FALLBACK_PATH, 'r') as f:
            _fallback = json.load(f)
    return _fallback


def fetch_nutrition_usda(food_name: str) -> dict:
    """Query USDA FoodData Central for nutrition per 100g."""
    api_key = settings.USDA_API_KEY
    url = f"https://api.nal.usda.gov/fdc/v1/foods/search"
    params = {
        'query': food_name,
        'api_key': api_key,
        'pageSize': 1,
        'dataType': 'Foundation,SR Legacy',
    }
    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        foods = data.get('foods', [])
        if not foods:
            return _from_fallback(food_name)

        food = foods[0]
        nutrients = {n['nutrientName']: n['value'] for n in food.get('foodNutrients', [])}

        return {
            'calories_per_100g': nutrients.get('Energy', nutrients.get('Energy (Atwater General Factors)', 0)),
            'protein_per_100g': nutrients.get('Protein', 0),
            'carbs_per_100g': nutrients.get('Carbohydrate, by difference', 0),
            'fat_per_100g': nutrients.get('Total lipid (fat)', 0),
        }
    except Exception as e:
        print(f"[USDA] API error for '{food_name}': {e}. Using fallback.")
        return _from_fallback(food_name)


def _from_fallback(food_name: str) -> dict:
    fallback = load_fallback()
    name_lower = normalize_food_name(food_name)
    for key, val in fallback.items():
        if key in name_lower or name_lower in key:
            return val
    return {
        'calories_per_100g': 200,
        'protein_per_100g': 5,
        'carbs_per_100g': 30,
        'fat_per_100g': 8,
    }


def calculate_nutrition(food_name: str, weight_grams: float, prefer_fallback: bool = False) -> dict:
    per_100 = _from_fallback(food_name) if prefer_fallback else fetch_nutrition_usda(food_name)
    ratio = weight_grams / 100.0
    return {
        'name': food_name,
        'weight_grams': weight_grams,
        'calories': round(per_100['calories_per_100g'] * ratio, 1),
        'protein': round(per_100['protein_per_100g'] * ratio, 1),
        'carbs': round(per_100['carbs_per_100g'] * ratio, 1),
        'fat': round(per_100['fat_per_100g'] * ratio, 1),
    }
