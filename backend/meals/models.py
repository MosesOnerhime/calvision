from django.db import models
from django.conf import settings


class MealLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='meal_logs')
    image = models.ImageField(upload_to='meals/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    total_calories = models.FloatField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class FoodItem(models.Model):
    meal = models.ForeignKey(MealLog, on_delete=models.CASCADE, related_name='food_items')
    name = models.CharField(max_length=200)
    weight_grams = models.FloatField()
    calories = models.FloatField()
    protein = models.FloatField(default=0)
    carbs = models.FloatField(default=0)
    fat = models.FloatField(default=0)

    def __str__(self):
        return f"{self.name} ({self.weight_grams}g)"