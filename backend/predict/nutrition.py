import json
import os
import requests
from django.conf import settings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DENSITIES_PATH = os.path.join(BASE_DIR, 'data', 'food_densities.json')
FALLBACK_PATH = os.path.join(BASE_DIR, 'data', 'nutrition_fallback.json')

_densities = None
_fallback = None


def load_densities():
    global _densities
    if _densities is None:
        with open(DENSITIES_PATH, 'r') as f:
            _densities = json.load(f)
    return _densities


def load_fallback():
    global _fallback
    if _fallback is None:
        with open(FALLBACK_PATH, 'r') as f:
            _fallback = json.load(f)
    return _fallback


def get_density(food_name: str) -> float:
    """Returns density in g/cm³. Defaults to 1.0 if not found."""
    densities = load_densities()
    name_lower = food_name.lower()
    for key, val in densities.items():
        if key in name_lower or name_lower in key:
            return val['density_g_per_cm3']
    return 1.0


def pixel_area_to_weight(pixel_area: float, food_name: str, pixels_per_cm: float = 100.0) -> float:
    """
    Estimate weight from pixel area.
    Assumes depth = 1 cm (fixed reference).
    volume_cm3 = area_cm2 * depth_cm
    weight_g = volume_cm3 * density
    """
    area_cm2 = pixel_area / (pixels_per_cm ** 2)
    volume_cm3 = area_cm2 * 1.0  # assume 1 cm depth
    density = get_density(food_name)
    return round(volume_cm3 * density, 1)


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
    name_lower = food_name.lower()
    for key, val in fallback.items():
        if key in name_lower or name_lower in key:
            return val
    return {
        'calories_per_100g': 200,
        'protein_per_100g': 5,
        'carbs_per_100g': 30,
        'fat_per_100g': 8,
    }


def calculate_nutrition(food_name: str, weight_grams: float) -> dict:
    per_100 = fetch_nutrition_usda(food_name)
    ratio = weight_grams / 100.0
    return {
        'name': food_name,
        'weight_grams': weight_grams,
        'calories': round(per_100['calories_per_100g'] * ratio, 1),
        'protein': round(per_100['protein_per_100g'] * ratio, 1),
        'carbs': round(per_100['carbs_per_100g'] * ratio, 1),
        'fat': round(per_100['fat_per_100g'] * ratio, 1),
    }