import base64
import io

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .african_food_classifier import classify_food, get_classifier_status
from .nutrition import calculate_nutrition

PORTION_SIZES = {
    'jollof_rice': 300,
    'fried_rice': 300,
    'egusi_soup': 250,
    'pepper_soup': 300,
    'pounded_yam': 400,
    'eba': 350,
    'fufu': 350,
    'moi_moi': 150,
    'akara': 120,
    'suya': 150,
    'fried_plantain': 100,
    'ofada_rice': 300,
    'ogbono_soup': 250,
    'banga_soup': 250,
    'ofe_onugbu': 250,
    'rice_and_stew': 350,
    'beans': 250,
    'yam_porridge': 300,
    'oha_soup': 250,
    'catfish_pepper_soup': 300,
    'amala': 350,
}

DEFAULT_PORTION = 250

MOCK_RESPONSE = {
    "items": [
        {"name": "Jollof Rice", "weight_grams": 300, "calories": 435, "protein": 9.6, "carbs": 84.0, "fat": 8.4, "confidence": 94.0},
    ],
    "total_calories": 435,
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
        image_bytes = image_file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        predictions = classify_food(image_bytes, top_k=3, min_confidence=0.25)

        if not predictions:
            classifier_status = get_classifier_status()
            reason = 'Classifier not loaded' if not classifier_status.ready else 'Low confidence classification'
            if classifier_status.error:
                reason = f"{reason}: {classifier_status.error}"
            return Response(_mock_response_with_overlay(img, reason=reason))

        top_prediction = predictions[0]
        raw_name = top_prediction['raw_name']
        display_name = top_prediction['name']
        confidence = top_prediction['confidence']
        weight = PORTION_SIZES.get(raw_name, DEFAULT_PORTION)
        nutrition = calculate_nutrition(display_name, weight, prefer_fallback=True)
        nutrition['confidence'] = round(confidence * 100, 1)
        nutrition['raw_name'] = raw_name
        nutrition['nutrition_source'] = 'curated_african_food_fallback'

        total_calories = round(nutrition['calories'], 1)
        detection = classification_detection(img, display_name, confidence, weight)

        return Response({
            'items': [nutrition],
            'total_calories': total_calories,
            'mock': False,
            'prediction_type': 'classification',
            'alternatives': [
                {
                    'name': item['name'],
                    'raw_name': item['raw_name'],
                    'confidence': round(item['confidence'] * 100, 1),
                }
                for item in predictions[1:]
            ],
            'overlay_image': render_detection_overlay(img, [detection]),
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _mock_response_with_overlay(img: Image.Image, reason: str | None = None):
    item = MOCK_RESPONSE['items'][0]
    response = {
        'items': [item.copy()],
        'total_calories': MOCK_RESPONSE['total_calories'],
        'mock': True,
        'prediction_type': 'mock_classification',
        'overlay_image': render_detection_overlay(
            img,
            [classification_detection(img, item['name'], item['confidence'] / 100, item['weight_grams'])],
        ),
    }
    if reason:
        response['reason'] = reason
    return response


def classification_detection(img: Image.Image, name: str, confidence: float, weight_grams: float) -> dict:
    width, height = img.size
    margin_x = max(8, int(width * 0.06))
    margin_y = max(8, int(height * 0.06))
    x1, y1, x2, y2 = margin_x, margin_y, width - margin_x, height - margin_y

    mask = np.zeros((height, width), dtype=np.float32)
    mask[y1:y2, x1:x2] = 1

    return {
        'name': name,
        'confidence': confidence,
        'box': [x1, y1, x2, y2],
        'mask': mask,
        'note': f"Estimated portion: {weight_grams}g",
    }


def render_detection_overlay(img: Image.Image, detections: list[dict]) -> str:
    annotated = img.convert('RGBA')
    font = ImageFont.load_default()

    for index, detection in enumerate(detections):
        color = OVERLAY_COLORS[index % len(OVERLAY_COLORS)]
        mask = detection.get('mask')
        if mask is not None:
            alpha = Image.fromarray(((mask > 0.5).astype(np.uint8) * 55), mode='L')
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

        note = detection.get('note')
        if note:
            label = f"{label} | {note}"

        text_box = draw.textbbox((0, 0), label, font=font)
        text_width = text_box[2] - text_box[0]
        text_height = text_box[3] - text_box[1]
        label_y = max(0, y1 - text_height - 8)
        label_width = min(text_width + 10, annotated.width - x1)
        draw.rectangle(
            (x1, label_y, x1 + label_width, label_y + text_height + 8),
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
