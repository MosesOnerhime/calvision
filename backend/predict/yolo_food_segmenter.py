import io
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

MODEL_PATH = Path(__file__).resolve().parent / 'model_files' / 'yolo_food_seg.pt'

_model = None
_load_error = None


@dataclass
class YoloSegmenterStatus:
    ready: bool
    model_exists: bool
    dependencies_installed: bool
    model_path: str
    error: str | None = None


def get_yolo_status() -> YoloSegmenterStatus:
    model_exists = MODEL_PATH.exists()
    dependencies_installed = _has_ultralytics()

    if not model_exists:
        return YoloSegmenterStatus(
            ready=False,
            model_exists=False,
            dependencies_installed=dependencies_installed,
            model_path=str(MODEL_PATH),
            error='YOLO segmentation model file is missing.',
        )

    if not dependencies_installed:
        return YoloSegmenterStatus(
            ready=False,
            model_exists=True,
            dependencies_installed=False,
            model_path=str(MODEL_PATH),
            error='Ultralytics is not installed.',
        )

    if _model is not None:
        return YoloSegmenterStatus(
            ready=True,
            model_exists=True,
            dependencies_installed=True,
            model_path=str(MODEL_PATH),
        )

    if _load_error:
        return YoloSegmenterStatus(
            ready=False,
            model_exists=True,
            dependencies_installed=True,
            model_path=str(MODEL_PATH),
            error=_load_error,
        )

    return YoloSegmenterStatus(
        ready=True,
        model_exists=True,
        dependencies_installed=True,
        model_path=str(MODEL_PATH),
    )


def segment_food(image_bytes: bytes, min_confidence: float = 0.25, max_detections: int = 12) -> list[dict]:
    model = load_model()
    if model is None:
        return []

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        results = model.predict(
            source=np.array(image),
            conf=min_confidence,
            imgsz=640,
            verbose=False,
        )
        if not results:
            return []

        result = results[0]
        if result.boxes is None or result.masks is None:
            return []

        names = result.names or {}
        boxes = result.boxes.xyxy.cpu().numpy()
        classes = result.boxes.cls.cpu().numpy().astype(int)
        confidences = result.boxes.conf.cpu().numpy()
        masks = result.masks.data.cpu().numpy()

        detections = []
        for index, (box, class_id, confidence, mask) in enumerate(zip(boxes, classes, confidences, masks)):
            if index >= max_detections:
                break
            raw_name = str(names.get(class_id, class_id))
            detections.append({
                'name': _display_name(raw_name),
                'raw_name': raw_name,
                'confidence': float(confidence),
                'box': [float(value) for value in box.tolist()],
                'mask': mask.astype(np.float32),
            })

        detections.sort(key=lambda item: item['confidence'], reverse=True)
        return detections

    except Exception as exc:
        print(f'[CalVision] YOLO segmentation inference error: {exc}')
        return []


def load_model():
    global _model, _load_error

    if _model is not None:
        return _model

    if not MODEL_PATH.exists():
        _load_error = 'YOLO segmentation model file is missing.'
        return None

    try:
        from ultralytics import YOLO

        _model = YOLO(str(MODEL_PATH))
        _load_error = None
        print(f'[CalVision] YOLO food segmenter loaded from {MODEL_PATH}')
        return _model
    except Exception as exc:
        _load_error = str(exc)
        print(f'[CalVision] Could not load YOLO food segmenter: {_load_error}')
        return None


def _has_ultralytics() -> bool:
    try:
        import ultralytics  # noqa: F401
        return True
    except Exception:
        return False


def _display_name(raw_name: str) -> str:
    return raw_name.replace('_', ' ').title()
