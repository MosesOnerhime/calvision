import torch
import numpy as np
from PIL import Image
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .model_loader import get_model, COCO_FOOD_CLASSES, COCO_TO_DENSITY_KEY
from .nutrition import pixel_area_to_weight, calculate_nutrition

MOCK_RESPONSE = {
    "items": [
        {"name": "rice", "weight_grams": 120, "calories": 156, "protein": 2.8, "carbs": 34.1, "fat": 0.3},
        {"name": "chicken breast", "weight_grams": 90, "calories": 148, "protein": 27.8, "carbs": 0.0, "fat": 3.2},
        {"name": "broccoli", "weight_grams": 60, "calories": 20, "protein": 2.1, "carbs": 3.7, "fat": 0.2},
    ],
    "total_calories": 324,
    "mock": True,
}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def predict(request):
    image_file = request.FILES.get('image')
    if not image_file:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

    model = get_model()

    if model is None:
        # Mock mode for development
        return Response(MOCK_RESPONSE)

    try:
        img = Image.open(image_file).convert('RGB')
        img_tensor = _preprocess(img)

        with torch.no_grad():
            outputs = model([img_tensor])[0]

        items = []
        seen_labels = {}

        for i, (label, score, mask) in enumerate(zip(
            outputs['labels'], outputs['scores'], outputs['masks']
        )):
            if score.item() < 0.5:
                continue
            label_id = label.item()
            if label_id not in COCO_FOOD_CLASSES:
                continue

            food_name = COCO_FOOD_CLASSES[label_id]
            density_key = COCO_TO_DENSITY_KEY.get(food_name, food_name)

            mask_np = mask[0].numpy()
            pixel_area = float((mask_np > 0.5).sum())

            weight = pixel_area_to_weight(pixel_area, density_key)
            nutrition = calculate_nutrition(food_name, weight)
            items.append(nutrition)

        if not items:
            # No food detected — return mock to avoid empty result
            return Response({**MOCK_RESPONSE, 'mock': True, 'reason': 'No food detected in image'})

        total_calories = round(sum(item['calories'] for item in items), 1)
        return Response({'items': items, 'total_calories': total_calories, 'mock': False})

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _preprocess(img: Image.Image):
    import torchvision.transforms.functional as F
    return F.to_tensor(img)