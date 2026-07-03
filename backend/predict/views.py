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
from .yolo_food_segmenter import get_yolo_status, segment_food

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
    'chicken': 150,
}

DEFAULT_PORTION = 250
AREA_REFERENCE_RATIOS = {
    'jollof_rice': 0.28,
    'fried_rice': 0.28,
    'egusi_soup': 0.24,
    'pepper_soup': 0.24,
    'pounded_yam': 0.20,
    'eba': 0.20,
    'fufu': 0.20,
    'amala': 0.20,
    'moi_moi': 0.14,
    'akara': 0.10,
    'suya': 0.14,
    'fried_plantain': 0.12,
    'chicken': 0.14,
}
MIN_MASK_AREA_RATIO = 0.003
MAX_MASK_AREA_RATIO = 0.85
AREA_WEIGHT_EXPONENT = 0.75
MIN_PORTION_MULTIPLIER = 0.15
MAX_PORTION_MULTIPLIER = 2.5

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
        yolo_detections = segment_food(image_bytes, min_confidence=0.25)

        if yolo_detections:
            items = nutrition_items_from_detections(yolo_detections)
            total_calories = round(sum(item['calories'] for item in items), 1)
            return Response({
                'items': items,
                'total_calories': total_calories,
                'mock': False,
                'prediction_type': 'yolo_segmentation',
                'overlay_image': render_detection_overlay(img, yolo_detections),
                'detections': serialize_detections(yolo_detections),
            })

        predictions = classify_food(image_bytes, top_k=3, min_confidence=0.25)

        if not predictions:
            classifier_status = get_classifier_status()
            yolo_status = get_yolo_status()
            reason = 'No YOLO detections and low confidence classification'
            if not yolo_status.ready:
                reason = f'YOLO unavailable: {yolo_status.error}. {reason}'
            if not classifier_status.ready:
                reason = f'{reason}. Classifier not loaded'
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


def nutrition_items_from_detections(detections: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = {}
    for detection in detections:
        raw_name = detection.get('raw_name') or detection['name'].lower().replace(' ', '_')
        grouped.setdefault(raw_name, []).append(detection)

    items = []
    for raw_name, raw_detections in grouped.items():
        display_name = raw_detections[0]['name']
        weight, portion_method = estimate_portion_from_mask_area(raw_name, raw_detections)
        nutrition = calculate_nutrition(display_name, weight, prefer_fallback=True)
        avg_confidence = sum(item.get('confidence', 0) for item in raw_detections) / len(raw_detections)
        nutrition['confidence'] = round(avg_confidence * 100, 1)
        nutrition['raw_name'] = raw_name
        nutrition['nutrition_source'] = 'yolo_segmentation_curated_african_food_fallback'
        nutrition['portion_estimation_method'] = portion_method
        nutrition['detection_count'] = len(raw_detections)
        items.append(nutrition)

    items.sort(key=lambda item: item.get('confidence', 0), reverse=True)
    return items


def estimate_portion_from_mask_area(raw_name: str, detections: list[dict]) -> tuple[float, str]:
    default_weight = PORTION_SIZES.get(raw_name, DEFAULT_PORTION)
    reference_ratio = AREA_REFERENCE_RATIOS.get(raw_name, 0.20)
    estimated_weights = []

    for detection in detections:
        ratio = mask_area_ratio(detection.get('mask'))
        if ratio is None or ratio < MIN_MASK_AREA_RATIO or ratio > MAX_MASK_AREA_RATIO:
            continue

        area_scale = (ratio / reference_ratio) ** AREA_WEIGHT_EXPONENT
        estimated_weights.append(default_weight * area_scale)

    if not estimated_weights:
        return default_weight, 'default_portion_no_valid_mask_area'

    estimated_weight = round(sum(estimated_weights), 1)
    min_reasonable = max(10, default_weight * MIN_PORTION_MULTIPLIER)
    max_reasonable = default_weight * MAX_PORTION_MULTIPLIER

    if estimated_weight < min_reasonable or estimated_weight > max_reasonable:
        return default_weight, 'default_portion_area_out_of_range'

    return estimated_weight, 'mask_area_estimate'


def mask_area_ratio(mask) -> float | None:
    if mask is None:
        return None

    mask_array = np.asarray(mask)
    if mask_array.size == 0:
        return None

    return float(np.count_nonzero(mask_array > 0.5) / mask_array.size)


def serialize_detections(detections: list[dict]) -> list[dict]:
    serialized = []
    for detection in detections:
        serialized.append({
            'name': detection['name'],
            'raw_name': detection.get('raw_name'),
            'confidence': round(detection.get('confidence', 0) * 100, 1),
            'box': [round(float(value), 2) for value in detection['box']],
        })
    return serialized


def render_detection_overlay(img: Image.Image, detections: list[dict]) -> str:
    annotated = img.convert('RGBA')
    font = overlay_font(annotated.size)

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
        stroke_width = max(4, annotated.width // 180)
        draw.rectangle((x1, y1, x2, y2), outline=color + (255,), width=stroke_width)

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
        padding_x = max(8, annotated.width // 120)
        padding_y = max(6, annotated.height // 160)
        label_y = max(0, y1 - text_height - (padding_y * 2))
        label_width = min(text_width + (padding_x * 2), annotated.width - x1)
        draw.rectangle(
            (x1, label_y, x1 + label_width, label_y + text_height + (padding_y * 2)),
            fill=color + (230,),
        )
        draw.text((x1 + padding_x, label_y + padding_y), label, fill=(255, 255, 255, 255), font=font)

    return _image_to_data_url(annotated.convert('RGB'))


def overlay_font(image_size: tuple[int, int]):
    width, height = image_size
    font_size = max(18, min(42, int(min(width, height) * 0.045)))
    for font_name in ('arialbd.ttf', 'arial.ttf', 'DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(font_name, font_size)
        except OSError:
            continue
    return ImageFont.load_default()


def _image_to_data_url(img: Image.Image) -> str:
    max_dimension = 1280
    output = img.copy()
    output.thumbnail((max_dimension, max_dimension))

    buffer = io.BytesIO()
    output.save(buffer, format='JPEG', quality=85, optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode('ascii')
    return f"data:image/jpeg;base64,{encoded}"
