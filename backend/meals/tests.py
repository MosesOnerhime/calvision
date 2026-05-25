from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import FoodItem, MealLog


User = get_user_model()


class MealApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='user@example.com',
            email='user@example.com',
            password='strong-pass-123',
        )
        self.client.force_authenticate(user=self.user)

    def test_save_meal_persists_items(self):
        payload = {
            'total_calories': 324,
            'items': [
                {
                    'name': 'rice',
                    'weight_grams': 120,
                    'calories': 156,
                    'protein': 2.8,
                    'carbs': 34.1,
                    'fat': 0.3,
                },
                {
                    'name': 'chicken breast',
                    'weight_grams': 90,
                    'calories': 148,
                    'protein': 27.8,
                    'carbs': 0,
                    'fat': 3.2,
                },
            ],
        }

        response = self.client.post(reverse('save_meal'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MealLog.objects.count(), 1)
        self.assertEqual(FoodItem.objects.count(), 2)
        self.assertEqual(response.data['total_calories'], 324)
        self.assertEqual(len(response.data['food_items']), 2)

    def test_history_only_returns_authenticated_users_meals(self):
        other_user = User.objects.create_user(
            username='other@example.com',
            email='other@example.com',
            password='strong-pass-123',
        )
        MealLog.objects.create(user=self.user, total_calories=200)
        MealLog.objects.create(user=other_user, total_calories=900)

        response = self.client.get(reverse('meal_history'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total_calories'], 200)

    def test_dashboard_stats_summarize_users_meals(self):
        meal = MealLog.objects.create(user=self.user, total_calories=450)
        FoodItem.objects.create(
            meal=meal,
            name='apple',
            weight_grams=150,
            calories=78,
            protein=0.4,
            carbs=21,
            fat=0.2,
        )

        response = self.client.get(reverse('dashboard_stats'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['today_calories'], 450)
        self.assertEqual(response.data['total_meals'], 1)
        self.assertEqual(response.data['recent_meal']['id'], meal.id)
