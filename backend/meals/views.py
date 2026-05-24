import base64
from django.core.files.base import ContentFile
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import MealLog, FoodItem
from .serializers import MealLogSerializer, SaveMealSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_meal(request):
    serializer = SaveMealSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    meal = MealLog.objects.create(
        user=request.user,
        total_calories=data['total_calories'],
    )

    # Handle base64 image if provided
    image_b64 = data.get('image_base64', '')
    if image_b64:
        try:
            fmt, imgstr = image_b64.split(';base64,')
            ext = fmt.split('/')[-1]
            meal.image.save(f"meal_{meal.id}.{ext}", ContentFile(base64.b64decode(imgstr)), save=True)
        except Exception:
            pass

    for item_data in data['items']:
        FoodItem.objects.create(meal=meal, **item_data)

    return Response(MealLogSerializer(meal, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def meal_history(request):
    meals = MealLog.objects.filter(user=request.user)
    serializer = MealLogSerializer(meals, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def meal_detail(request, pk):
    try:
        meal = MealLog.objects.get(pk=pk, user=request.user)
    except MealLog.DoesNotExist:
        return Response({'error': 'Meal not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(MealLogSerializer(meal, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    from django.utils import timezone
    from datetime import date

    today = date.today()
    today_meals = MealLog.objects.filter(user=request.user, created_at__date=today)
    today_calories = sum(m.total_calories for m in today_meals)

    all_meals = MealLog.objects.filter(user=request.user)
    recent = all_meals.first()

    return Response({
        'today_calories': round(today_calories, 1),
        'total_meals': all_meals.count(),
        'recent_meal': MealLogSerializer(recent, context={'request': request}).data if recent else None,
    })