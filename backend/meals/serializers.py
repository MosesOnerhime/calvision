from rest_framework import serializers
from .models import MealLog, FoodItem


class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = ['id', 'name', 'weight_grams', 'calories', 'protein', 'carbs', 'fat']


class MealLogSerializer(serializers.ModelSerializer):
    food_items = FoodItemSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = MealLog
        fields = ['id', 'created_at', 'total_calories', 'image_url', 'food_items']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class SaveMealSerializer(serializers.Serializer):
    image_base64 = serializers.CharField(required=False, allow_blank=True)
    items = FoodItemSerializer(many=True)
    total_calories = serializers.FloatField()