"""
Train or validate the CalVision YOLO segmentation model.

Examples:
    python predict/train_yolo_segmenter.py train
    python predict/train_yolo_segmenter.py val
"""

import argparse
from pathlib import Path

DATASET_PATH = Path(__file__).resolve().parents[1] / 'african_food_annotation'
DATA_YAML = DATASET_PATH / 'data.yaml'
MODEL_OUTPUT_PATH = Path(__file__).resolve().parent / 'model_files' / 'yolo_food_seg.pt'


def main():
    parser = argparse.ArgumentParser(description='Train or validate the CalVision YOLO segmentation model.')
    parser.add_argument('mode', choices=['train', 'val'], help='Whether to train or validate the model.')
    parser.add_argument('--data', default=str(DATA_YAML), help='Path to YOLO data.yaml.')
    parser.add_argument('--model', default='yolo11n-seg.pt', help='Base model for training, or .pt file for validation.')
    parser.add_argument('--epochs', type=int, default=100)
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--batch', type=int, default=8)
    parser.add_argument('--device', default=None, help='Use 0 for GPU, cpu for CPU, or omit for auto.')
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit(
            'Ultralytics is not installed. Run: pip install -r requirements-yolo.txt'
        ) from exc

    data_path = Path(args.data)
    if not data_path.exists():
        raise SystemExit(f'Dataset config not found: {data_path}')

    if args.mode == 'train':
        _warn_if_images_are_missing(data_path)
        model = YOLO(args.model)
        train_data_path = _data_yaml_with_validation_fallback(data_path)
        kwargs = {
            'data': str(train_data_path),
            'epochs': args.epochs,
            'imgsz': args.imgsz,
            'batch': args.batch,
        }
        if args.device:
            kwargs['device'] = args.device
        results = model.train(**kwargs)
        best_model = Path(results.save_dir) / 'weights' / 'best.pt'
        if best_model.exists():
            MODEL_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
            MODEL_OUTPUT_PATH.write_bytes(best_model.read_bytes())
            print(f'Copied best model to {MODEL_OUTPUT_PATH}')
        return

    model_path = Path(args.model)
    if not model_path.exists() and MODEL_OUTPUT_PATH.exists():
        model_path = MODEL_OUTPUT_PATH
    model = YOLO(str(model_path))
    val_data_path = _data_yaml_with_validation_fallback(data_path)
    kwargs = {'data': str(val_data_path), 'imgsz': args.imgsz}
    if args.device:
        kwargs['device'] = args.device
    model.val(**kwargs)


def _warn_if_images_are_missing(data_path: Path):
    dataset_root = data_path.parent
    train_txt = dataset_root / 'train.txt'
    if not train_txt.exists():
        print(f'Warning: {train_txt} does not exist.')
        return

    missing = []
    for line in train_txt.read_text().splitlines():
        image_path = dataset_root / line.strip()
        if line.strip() and not image_path.exists():
            missing.append(image_path)
        if len(missing) >= 5:
            break

    if missing:
        print('Warning: some images referenced by train.txt are missing:')
        for image_path in missing:
            print(f'  - {image_path}')
        print('Training will fail until the CVAT export includes images or these paths are fixed.')


def _data_yaml_with_validation_fallback(data_path: Path) -> Path:
    text = data_path.read_text()
    dataset_root = data_path.parent
    train_list = _absolute_image_list(dataset_root, 'train.txt')
    val_list = _absolute_image_list(dataset_root, 'val.txt' if (dataset_root / 'val.txt').exists() else 'train.txt')
    lines = []
    has_path = False
    has_val = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith('path:'):
            lines.append(f'path: {data_path.parent.as_posix()}')
            has_path = True
        elif stripped.startswith('train:'):
            lines.append(f'train: {train_list.as_posix()}')
        elif stripped.startswith('val:'):
            lines.append(f'val: {val_list.as_posix()}')
            has_val = True
        else:
            lines.append(line)

    if not has_path:
        lines.append(f'path: {data_path.parent.as_posix()}')

    if not has_val:
        lines.append('val: train.txt')

    patched = '\n'.join(lines).rstrip() + '\n'
    if '\nval:' in f'\n{text}':
        patched_path = data_path.with_name(f'{data_path.stem}_resolved.yaml')
        patched_path.write_text(patched)
        return patched_path

    patched_path = data_path.with_name(f'{data_path.stem}_with_val.yaml')
    patched_path.write_text(patched)
    print(
        'Warning: data.yaml has no val split, so train.txt is being reused as val. '
        'Create a real validation split before reporting final mAP.'
    )
    return patched_path


def _absolute_image_list(dataset_root: Path, filename: str) -> Path:
    source = dataset_root / filename
    target = dataset_root / f'{Path(filename).stem}_abs.txt'
    if not source.exists():
        return source

    absolute_paths = []
    for line in source.read_text().splitlines():
        item = line.strip()
        if not item:
            continue
        image_path = Path(item)
        if not image_path.is_absolute():
            image_path = dataset_root / image_path
        absolute_paths.append(image_path.as_posix())

    target.write_text('\n'.join(absolute_paths) + '\n')
    return target


if __name__ == '__main__':
    main()
