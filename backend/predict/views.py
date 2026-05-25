import base64
import io

import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .model_loader import COCO_FOOD_CLASSES, COCO_TO_DENSITY_KEY, get_model
from .nutrition import calculate_nutrition, pixel_area_to_weight

MOCK_RESPONSE = {
    "items": [
        {"name": "rice", "weight_grams": 120, "calories": 156, "protein": 2.8, "carbs": 34.1, "fat": 0.3},
        {"name": "chicken breast", "weight_grams": 90, "calories": 148, "protein": 27.8, "carbs": 0.0, "fat": 3.2},
        {"name": "broccoli", "weight_grams": 60, "calories": 20, "protein": 2.1, "carbs": 3.7, "fat": 0.2},
    ],
    "total_calories": 324,
    "mock": True,
}

OVERLAY_COLORS = [
    (34, 197, 94),
    (59, 130, 246),
    (245, 158, 11),
    (239, 68, 68),
    (168, 85, 247),
    (20, 184, 166),
]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def predict(request):
    image_file = request.FILES.get('image')
    if not image_file:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        img = Image.open(image_file).convert('RGB')
        model = get_model()

        if model is None:
            return Response(_mock_response_with_overlay(img))

        img_tensor = _preprocess(img)

        with torch.no_grad():
            outputs = model([img_tensor])[0]

        items = []
        detections = []

        for label, score, mask, box in zip(
            outputs['labels'], outputs['scores'], outputs['masks'], outputs['boxes']
        ):
            if score.item() < 0.5:
                continue

            label_id = label.item()
            if label_id not in COCO_FOOD_CLASSES:
                continue

            food_name = COCO_FOOD_CLASSES[label_id]
            density_key = COCO_TO_DENSITY_KEY.get(food_name, food_name)
            mask_np = mask[0].detach().cpu().numpy()
            pixel_area = float((mask_np > 0.5).sum())

            weight = pixel_area_to_weight(pixel_area, density_key)
            nutrition = calculate_nutrition(food_name, weight)
            items.append(nutrition)
            detections.append({
                'name': food_name,
                'confidence': round(score.item(), 3),
                'box': box.detach().cpu().tolist(),
                'mask': mask_np,
            })

        if not items:
            return Response(_mock_response_with_overlay(img, reason='No food detected in image'))

        total_calories = round(sum(item['calories'] for item in items), 1)
        return Response({
            'items': items,
            'total_calories': total_calories,
            'mock': False,
            'overlay_image': render_detection_overlay(img, detections),
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _preprocess(img: Image.Image):
    import torchvision.transforms.functional as F

    return F.to_tensor(img)


def _mock_response_with_overlay(img: Image.Image, reason: str | None = None):
    response = {
        'items': [item.copy() for item in MOCK_RESPONSE['items']],
        'total_calories': MOCK_RESPONSE['total_calories'],
        'mock': True,
        'overlay_image': render_detection_overlay(img, _mock_detections(img)),
    }
    if reason:
        response['reason'] = reason
    return response


def _mock_detections(img: Image.Image):
    width, height = img.size
    boxes = [
        (0.08, 0.18, 0.48, 0.76),
        (0.38, 0.12, 0.82, 0.58),
        (0.52, 0.45, 0.92, 0.86),
    ]

    detections = []
    for item, box_ratio in zip(MOCK_RESPONSE['items'], boxes):
        x1, y1, x2, y2 = (
            int(box_ratio[0] * width),
            int(box_ratio[1] * height),
            int(box_ratio[2] * width),
            int(box_ratio[3] * height),
        )
        mask = Image.new('L', img.size, 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((x1, y1, x2, y2), fill=255)
        detections.append({
            'name': item['name'],
            'confidence': 0.99,
            'box': [x1, y1, x2, y2],
            'mask': np.array(mask, dtype=np.float32) / 255,
        })

    return detections


def render_detection_overlay(img: Image.Image, detections: list[dict]) -> str:
    annotated = img.convert('RGBA')
    font = ImageFont.load_default()

    for index, detection in enumerate(detections):
        color = OVERLAY_COLORS[index % len(OVERLAY_COLORS)]
        mask = detection.get('mask')
        if mask is not None:
            alpha = Image.fromarray(((mask > 0.5).astype(np.uint8) * 90), mode='L')
            if alpha.size != annotated.size:
                alpha = alpha.resize(annotated.size)
            mask_fill = Image.new('RGBA', annotated.size, color + (0,))
            mask_fill.putalpha(alpha)
            annotated = Image.alpha_composite(annotated, mask_fill)

    draw = ImageDraw.Draw(annotated)

    for index, detection in enumerate(detections):
        color = OVERLAY_COLORS[index % len(OVERLAY_COLORS)]
        x1, y1, x2, y2 = [int(value) for value in detection['box']]
        draw.rectangle((x1, y1, x2, y2), outline=color + (255,), width=4)

        confidence = detection.get('confidence')
        label = detection['name']
        if confidence is not None:
            label = f"{label} {confidence:.0%}"

        text_box = draw.textbbox((0, 0), label, font=font)
        text_width = text_box[2] - text_box[0]
        text_height = text_box[3] - text_box[1]
        label_y = max(0, y1 - text_height - 8)
        draw.rectangle(
            (x1, label_y, x1 + text_width + 10, label_y + text_height + 8),
            fill=color + (230,),
        )
        draw.text((x1 + 5, label_y + 4), label, fill=(255, 255, 255, 255), font=font)

    return _image_to_data_url(annotated.convert('RGB'))


def _image_to_data_url(img: Image.Image) -> str:
    max_dimension = 1280
    output = img.copy()
    output.thumbnail((max_dimension, max_dimension))

    buffer = io.BytesIO()
    output.save(buffer, format='JPEG', quality=85, optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode('ascii')
    return f"data:image/jpeg;base64,{encoded}"
