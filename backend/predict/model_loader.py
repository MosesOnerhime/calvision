import torch
import torchvision
from torchvision.models.detection import maskrcnn_resnet50_fpn, MaskRCNN_ResNet50_FPN_Weights

_model = None

COCO_FOOD_CLASSES = {
    46: 'banana', 47: 'apple', 48: 'sandwich', 49: 'orange',
    50: 'broccoli', 51: 'carrot', 52: 'hot dog', 53: 'pizza',
    54: 'donut', 55: 'cake', 56: 'chair',  # not food but COCO label
}

# Map COCO labels to our food density keys
COCO_TO_DENSITY_KEY = {
    'banana': 'banana',
    'apple': 'apple',
    'sandwich': 'bread',
    'orange': 'orange',
    'broccoli': 'broccoli',
    'carrot': 'carrot',
    'hot dog': 'beef',
    'pizza': 'bread',
    'donut': 'bread',
    'cake': 'bread',
}


def get_model():
    global _model
    if _model is None:
        try:
            weights = MaskRCNN_ResNet50_FPN_Weights.DEFAULT
            _model = maskrcnn_resnet50_fpn(weights=weights)
            _model.eval()
            print("[CalVision] Mask R-CNN model loaded.")
        except Exception as e:
            print(f"[CalVision] Could not load model: {e}")
            _model = None
    return _model