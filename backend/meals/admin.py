from django.contrib import admin
from .models import MealLog, FoodItem

class FoodItemInline(admin.TabularInline):
    model = FoodItem
    extra = 0

@admin.register(MealLog)
class MealLogAdmin(admin.ModelAdmin):
    inlines = [FoodItemInline]
    list_display = ['user', 'created_at', 'total_calories']

admin.site.register(FoodItem)