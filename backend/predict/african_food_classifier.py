import io
import os
import platform
import sys
from dataclasses import dataclass
from typing import Any

import numpy as np
from PIL import Image

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model_files')
MODEL_PATH = os.path.join(MODEL_DIR, 'model.tflite')
LABELS_PATH = os.path.join(MODEL_DIR, 'labels.txt')

_interpreter = None
_labels: list[str] | None = None
_load_error: str | None = None
_load_attempted = False


@dataclass
class ClassifierStatus:
    ready: bool
    labels: list[str]
    error: str | None = None


def load_model():
    global _interpreter, _labels, _load_error, _load_attempted

    if _interpreter is not None and _labels is not None:
        return _interpreter, _labels

    if _load_attempted:
        return None, None

    if not os.path.exists(MODEL_PATH) or not os.path.exists(LABELS_PATH):
        _load_error = 'model.tflite and labels.txt must exist in backend/predict/model_files/'
        _load_attempted = True
        return None, None

    try:
        _load_attempted = True
        tflite = _import_tflite_runtime()
        _interpreter = tflite.Interpreter(model_path=MODEL_PATH)
        _interpreter.allocate_tensors()
        _labels = _load_labels()
        _load_error = None
        print(f"[CalVision] African food classifier loaded. Classes: {_labels}")
    except Exception as e:
        _interpreter = None
        _labels = None
        _load_error = str(e)
        print(f"[CalVision] Could not load African food classifier: {e}")

    return _interpreter, _labels


def get_classifier_status() -> ClassifierStatus:
    interpreter, labels = load_model()
    return ClassifierStatus(
        ready=interpreter is not None and labels is not None,
        labels=labels or [],
        error=_load_error,
    )


def classify_food(image_bytes: bytes, top_k: int = 3, min_confidence: float = 0.25) -> list[dict]:
    """
    Classify a full meal image using the Teachable Machine TFLite model.

    Returns predictions sorted by confidence descending:
    [{name, raw_name, confidence}, ...]
    """
    interpreter, labels = load_model()
    if interpreter is None or labels is None:
        return []

    try:
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        input_detail = input_details[0]
        img_array = _preprocess_image(image_bytes, input_detail)

        interpreter.set_tensor(input_detail['index'], img_array)
        interpreter.invoke()

        output = interpreter.get_tensor(output_details[0]['index'])[0]
        predictions = _dequantize_output(output, output_details[0])

        results = []
        for index, confidence in enumerate(predictions):
            if index >= len(labels) or float(confidence) < min_confidence:
                continue

            raw_name = labels[index]
            results.append({
                'name': _display_name(raw_name),
                'raw_name': raw_name,
                'confidence': float(confidence),
            })

        results.sort(key=lambda item: item['confidence'], reverse=True)
        return results[:top_k]
    except Exception as e:
        print(f"[Classifier] Inference error: {e}")
        return []


def _import_tflite_runtime() -> Any:
    attempted = []

    try:
        from ai_edge_litert import interpreter as tflite
        return tflite
    except ImportError as e:
        attempted.append(f"ai-edge-litert ({e})")

    try:
        from ai_edge_litert.interpreter import Interpreter

        class LiteRTModule:
            Interpreter = Interpreter

        return LiteRTModule
    except ImportError as e:
        attempted.append(f"ai_edge_litert.interpreter ({e})")

    try:
        import tflite_runtime.interpreter as tflite
        return tflite
    except ImportError as e:
        attempted.append(f"tflite-runtime ({e})")

    try:
        import tensorflow as tf
        return tf.lite
    except ImportError as e:
        attempted.append(f"tensorflow ({e})")

    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    system = platform.system()
    raise ImportError(
        "No TensorFlow Lite interpreter is installed. "
        f"Current environment: {system}, Python {python_version}. "
        "Install TensorFlow for local Windows development, or run the backend in Docker/WSL "
        "where ai-edge-litert can be installed. "
        f"Attempted imports: {'; '.join(attempted)}"
    )


def _load_labels() -> list[str]:
    labels = []
    with open(LABELS_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            value = line.strip()
            if not value:
                continue
            parts = value.split(' ', 1)
            labels.append(parts[1] if len(parts) == 2 and parts[0].isdigit() else value)
    return labels


def _preprocess_image(image_bytes: bytes, input_detail: dict) -> np.ndarray:
    shape = input_detail['shape']
    height = int(shape[1])
    width = int(shape[2])
    dtype = input_detail['dtype']

    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((width, height))
    img_array = np.asarray(img)

    if np.issubdtype(dtype, np.floating):
        # Teachable Machine image models expect float input normalized to [-1, 1].
        img_array = (img_array.astype(np.float32) / 127.5) - 1.0
    else:
        scale, zero_point = input_detail.get('quantization', (0, 0))
        if scale and scale > 0:
            img_array = (img_array.astype(np.float32) / scale + zero_point).clip(
                np.iinfo(dtype).min,
                np.iinfo(dtype).max,
            )
        img_array = img_array.astype(dtype)

    return np.expand_dims(img_array, axis=0)


def _dequantize_output(output: np.ndarray, output_detail: dict) -> np.ndarray:
    if np.issubdtype(output.dtype, np.floating):
        return output.astype(np.float32)

    scale, zero_point = output_detail.get('quantization', (0, 0))
    if scale and scale > 0:
        return (output.astype(np.float32) - zero_point) * scale

    return output.astype(np.float32)


def _display_name(raw_name: str) -> str:
    return raw_name.replace('_', ' ').title()
