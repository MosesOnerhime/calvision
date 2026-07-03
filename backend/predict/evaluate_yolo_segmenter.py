import argparse
import csv
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

DATA_YAML = Path(__file__).resolve().parents[1] / 'african_food_annotation' / 'data.yaml'
MODEL_PATH = Path(__file__).resolve().parent / 'model_files' / 'yolo_food_seg.pt'
REPORT_DIR = Path(__file__).resolve().parent / 'yolo_evaluation_reports'
NO_DETECTION_LABEL = 'no_detection'


def main():
    parser = argparse.ArgumentParser(description='Evaluate the CalVision YOLO segmentation model.')
    parser.add_argument('--model', default=str(MODEL_PATH))
    parser.add_argument('--data', default=str(DATA_YAML))
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--device', default=None)
    parser.add_argument('--workers', type=int, default=0)
    parser.add_argument('--conf', type=float, default=0.25)
    parser.add_argument('--match-iou', type=float, default=0.5)
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit('Ultralytics is not installed. Run: pip install -r requirements-yolo.txt') from exc

    data_path = Path(args.data).resolve()
    model_path = Path(args.model).resolve()
    if not data_path.exists():
        raise SystemExit(f'Dataset config not found: {data_path}')
    if not model_path.exists():
        raise SystemExit(f'Model file not found: {model_path}')

    prepared_data = _prepared_data_yaml(data_path)
    model = YOLO(str(model_path))
    kwargs = {
        'data': str(prepared_data),
        'imgsz': args.imgsz,
        'workers': args.workers,
        'plots': True,
        'verbose': False,
        'save_json': False,
    }
    if args.device:
        kwargs['device'] = args.device

    metrics = model.val(**kwargs)
    names = {int(k): v for k, v in metrics.names.items()}
    support = _validation_support(data_path.parent, names)

    overall = _overall_metrics(metrics, support, data_path.parent)
    per_class = _per_class_metrics(metrics, names, support)
    confusion, average_confidence = _prediction_artifacts(
        model=model,
        dataset_root=data_path.parent,
        names=names,
        imgsz=args.imgsz,
        conf=args.conf,
        match_iou=args.match_iou,
        device=args.device,
    )

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    _write_per_class_csv(per_class)
    _write_confusion_csv(confusion, names)
    _write_confidence_csv(average_confidence, names)
    _draw_confusion_matrix(confusion, names, REPORT_DIR / 'confusion_matrix.png')
    _draw_confidence_chart(average_confidence, names, REPORT_DIR / 'average_prediction_confidence.png')
    (REPORT_DIR / 'metrics.json').write_text(json.dumps({
        'model_type': 'yolo_instance_segmentation',
        'model_path': str(model_path),
        'dataset': str(data_path),
        'overall': overall,
        'per_class': per_class,
        'average_prediction_confidence_percent': {
            names[class_id]: average_confidence.get(class_id, 0.0)
            for class_id in sorted(names)
        },
        'artifacts': {
            'per_class_metrics_csv': str(REPORT_DIR / 'per_class_metrics.csv'),
            'confusion_matrix_csv': str(REPORT_DIR / 'confusion_matrix.csv'),
            'confusion_matrix_image': str(REPORT_DIR / 'confusion_matrix.png'),
            'average_prediction_confidence_csv': str(REPORT_DIR / 'average_prediction_confidence.csv'),
            'average_prediction_confidence_image': str(REPORT_DIR / 'average_prediction_confidence.png'),
        },
        'metric_note': (
            'Object detection and instance segmentation models are evaluated with precision, recall, F1-score, '
            'and mAP. The report uses mask mAP50 as the closest accuracy-style summary because ordinary '
            'classification accuracy does not apply to segmentation masks.'
        ),
    }, indent=2))
    (REPORT_DIR / 'evaluation_paragraph.txt').write_text(_evaluation_paragraph(overall, per_class))

    print(f"Wrote YOLO evaluation reports to {REPORT_DIR}")
    print(f"Wrote confusion matrix image to {REPORT_DIR / 'confusion_matrix.png'}")
    print(f"Wrote confidence chart image to {REPORT_DIR / 'average_prediction_confidence.png'}")
    print(_evaluation_paragraph(overall, per_class))


def _overall_metrics(metrics, support: dict[int, int], dataset_root: Path) -> dict:
    precision = _percent(metrics.seg.mp)
    recall = _percent(metrics.seg.mr)
    return {
        'validation_images': sum(1 for _ in _read_validation_image_paths(dataset_root)),
        'validation_instances': sum(support.values()),
        'precision_percent': precision,
        'recall_percent': recall,
        'f1_score_percent': _f1_percent(metrics.seg.mp, metrics.seg.mr),
        'mask_map50_percent': _percent(metrics.seg.map50),
        'mask_map50_95_percent': _percent(metrics.seg.map),
        'box_map50_percent': _percent(metrics.box.map50),
        'box_map50_95_percent': _percent(metrics.box.map),
        'accuracy_proxy_percent': _percent(metrics.seg.map50),
    }


def _per_class_metrics(metrics, names: dict[int, str], support: dict[int, int]) -> list[dict]:
    rows = []
    class_indexes = list(metrics.seg.ap_class_index)
    for position, class_id in enumerate(class_indexes):
        class_id = int(class_id)
        precision = float(metrics.seg.p[position])
        recall = float(metrics.seg.r[position])
        rows.append({
            'class_id': class_id,
            'class_name': names.get(class_id, str(class_id)),
            'support': support.get(class_id, 0),
            'precision_percent': _percent(precision),
            'recall_percent': _percent(recall),
            'f1_score_percent': _f1_percent(precision, recall),
            'mask_map50_percent': _percent(float(metrics.seg.ap50[position])),
            'mask_map50_95_percent': _percent(float(metrics.seg.ap[position].mean())),
            'box_map50_percent': _percent(float(metrics.box.ap50[position])),
            'box_map50_95_percent': _percent(float(metrics.box.ap[position].mean())),
        })
    return rows


def _write_per_class_csv(rows: list[dict]):
    if not rows:
        return
    with (REPORT_DIR / 'per_class_metrics.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def _prediction_artifacts(
    model,
    dataset_root: Path,
    names: dict[int, str],
    imgsz: int,
    conf: float,
    match_iou: float,
    device: str | None,
):
    confusion = {
        actual_id: {predicted_id: 0 for predicted_id in names}
        for actual_id in names
    }
    for actual_id in names:
        confusion[actual_id][NO_DETECTION_LABEL] = 0

    confidence_values = {class_id: [] for class_id in names}
    predict_kwargs = {'imgsz': imgsz, 'conf': conf, 'verbose': False}
    if device:
        predict_kwargs['device'] = device

    for image_path in _read_validation_image_paths(dataset_root):
        ground_truth = _ground_truth_instances(dataset_root, image_path)
        if not ground_truth:
            continue

        predictions = _model_predictions(model, image_path, predict_kwargs)
        used_predictions = set()

        for truth in ground_truth:
            best_index = None
            best_iou = 0.0
            for index, prediction in enumerate(predictions):
                if index in used_predictions:
                    continue
                iou = _box_iou(truth['box'], prediction['box'])
                if iou > best_iou:
                    best_iou = iou
                    best_index = index

            actual_id = truth['class_id']
            if best_index is not None and best_iou >= match_iou:
                prediction = predictions[best_index]
                used_predictions.add(best_index)
                predicted_id = prediction['class_id']
                confusion.setdefault(actual_id, {}).setdefault(predicted_id, 0)
                confusion[actual_id][predicted_id] += 1
                confidence_values.setdefault(actual_id, []).append(prediction['confidence'] * 100)
            else:
                confusion.setdefault(actual_id, {}).setdefault(NO_DETECTION_LABEL, 0)
                confusion[actual_id][NO_DETECTION_LABEL] += 1
                confidence_values.setdefault(actual_id, []).append(0.0)

    average_confidence = {}
    for class_id, values in confidence_values.items():
        average_confidence[class_id] = round(sum(values) / len(values), 2) if values else 0.0

    return confusion, average_confidence


def _ground_truth_instances(dataset_root: Path, image_path: Path) -> list[dict]:
    label_path = _label_path_for_image(dataset_root, image_path)
    if not label_path.exists():
        return []

    try:
        with Image.open(image_path) as image:
            width, height = image.size
    except OSError:
        return []

    instances = []
    for line in label_path.read_text().splitlines():
        parts = line.split()
        if len(parts) < 7:
            continue
        class_id = int(float(parts[0]))
        coords = [float(value) for value in parts[1:]]
        xs = coords[0::2]
        ys = coords[1::2]
        instances.append({
            'class_id': class_id,
            'box': [
                min(xs) * width,
                min(ys) * height,
                max(xs) * width,
                max(ys) * height,
            ],
        })
    return instances


def _model_predictions(model, image_path: Path, predict_kwargs: dict) -> list[dict]:
    results = model.predict(source=str(image_path), **predict_kwargs)
    if not results:
        return []

    result = results[0]
    if result.boxes is None or len(result.boxes) == 0:
        return []

    boxes = result.boxes.xyxy.cpu().tolist()
    class_ids = result.boxes.cls.cpu().tolist()
    confidences = result.boxes.conf.cpu().tolist()
    return [
        {
            'box': [float(value) for value in box],
            'class_id': int(class_id),
            'confidence': float(confidence),
        }
        for box, class_id, confidence in zip(boxes, class_ids, confidences)
    ]


def _box_iou(first: list[float], second: list[float]) -> float:
    x_left = max(first[0], second[0])
    y_top = max(first[1], second[1])
    x_right = min(first[2], second[2])
    y_bottom = min(first[3], second[3])
    if x_right <= x_left or y_bottom <= y_top:
        return 0.0

    intersection = (x_right - x_left) * (y_bottom - y_top)
    first_area = max(0.0, first[2] - first[0]) * max(0.0, first[3] - first[1])
    second_area = max(0.0, second[2] - second[0]) * max(0.0, second[3] - second[1])
    union = first_area + second_area - intersection
    return intersection / union if union else 0.0


def _write_confusion_csv(confusion: dict, names: dict[int, str]):
    columns = [names[class_id] for class_id in sorted(names)] + [NO_DETECTION_LABEL]
    with (REPORT_DIR / 'confusion_matrix.csv').open('w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['actual_class', *columns])
        for actual_id in sorted(names):
            row = [names[actual_id]]
            for predicted_id in sorted(names):
                row.append(confusion.get(actual_id, {}).get(predicted_id, 0))
            row.append(confusion.get(actual_id, {}).get(NO_DETECTION_LABEL, 0))
            writer.writerow(row)


def _write_confidence_csv(average_confidence: dict[int, float], names: dict[int, str]):
    with (REPORT_DIR / 'average_prediction_confidence.csv').open('w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['class_name', 'average_confidence_percent'])
        for class_id in sorted(names):
            writer.writerow([names[class_id], average_confidence.get(class_id, 0.0)])


def _draw_confusion_matrix(confusion: dict, names: dict[int, str], output_path: Path):
    row_ids = sorted(names)
    col_ids = sorted(names)
    col_labels = [_display_name(names[class_id]) for class_id in col_ids] + ['No Detection']
    row_labels = [_display_name(names[class_id]) for class_id in row_ids]
    cell = 82
    left = 190
    top = 120
    right = 40
    bottom = 150
    width = left + cell * len(col_labels) + right
    height = top + cell * len(row_labels) + bottom
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    font = _font(16)
    small_font = _font(13)
    title_font = _font(22)

    draw.text((left, 28), 'YOLO Segmentation Confusion Matrix', fill='#111827', font=title_font)
    draw.text((left, 58), 'Rows are CVAT annotations; columns are matched model predictions at IoU >= 0.5.', fill='#4b5563', font=small_font)

    for col_index, label in enumerate(col_labels):
        x = left + col_index * cell
        draw.text((x + 8, top - 52), label, fill='#111827', font=small_font)

    max_count = max(
        [confusion.get(actual_id, {}).get(predicted_id, 0) for actual_id in row_ids for predicted_id in col_ids]
        + [confusion.get(actual_id, {}).get(NO_DETECTION_LABEL, 0) for actual_id in row_ids]
        + [1]
    )

    for row_index, actual_id in enumerate(row_ids):
        y = top + row_index * cell
        draw.text((20, y + 28), row_labels[row_index], fill='#111827', font=font)
        for col_index, predicted_id in enumerate(col_ids + [NO_DETECTION_LABEL]):
            x = left + col_index * cell
            count = confusion.get(actual_id, {}).get(predicted_id, 0)
            if predicted_id == actual_id:
                color = _scale_color(count, max_count, (22, 163, 74))
            elif predicted_id == NO_DETECTION_LABEL:
                color = _scale_color(count, max_count, (220, 38, 38))
            else:
                color = _scale_color(count, max_count, (245, 158, 11))
            draw.rectangle((x, y, x + cell - 4, y + cell - 4), fill=color, outline='#d1d5db')
            text = str(count)
            bbox = draw.textbbox((0, 0), text, font=title_font)
            draw.text(
                (x + (cell - (bbox[2] - bbox[0])) / 2 - 2, y + (cell - (bbox[3] - bbox[1])) / 2 - 6),
                text,
                fill='#111827',
                font=title_font,
            )

    draw.text((left + cell * 2, height - 58), 'Predicted class', fill='#111827', font=font)
    draw.text((20, top - 28), 'Actual class', fill='#111827', font=font)
    image.save(output_path)


def _draw_confidence_chart(average_confidence: dict[int, float], names: dict[int, str], output_path: Path):
    labels = [_display_name(names[class_id]) for class_id in sorted(names)]
    values = [average_confidence.get(class_id, 0.0) for class_id in sorted(names)]
    width = 1000
    height = 620
    margin_left = 90
    margin_right = 50
    margin_top = 90
    margin_bottom = 135
    chart_width = width - margin_left - margin_right
    chart_height = height - margin_top - margin_bottom
    bar_gap = 22
    bar_width = max(28, (chart_width - bar_gap * (len(values) - 1)) / max(1, len(values)))

    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    font = _font(15)
    small_font = _font(13)
    title_font = _font(22)

    draw.text((margin_left, 28), 'Average Prediction Confidence per Food Class', fill='#111827', font=title_font)
    draw.text((margin_left, 58), 'Average confidence for IoU-matched predictions; missed annotations count as 0%.', fill='#4b5563', font=small_font)

    for tick in range(0, 101, 20):
        y = margin_top + chart_height - (tick / 100) * chart_height
        draw.line((margin_left, y, width - margin_right, y), fill='#e5e7eb')
        draw.text((35, y - 8), str(tick), fill='#4b5563', font=small_font)
    draw.line((margin_left, margin_top, margin_left, margin_top + chart_height), fill='#9ca3af')
    draw.line((margin_left, margin_top + chart_height, width - margin_right, margin_top + chart_height), fill='#9ca3af')

    for index, (label, value) in enumerate(zip(labels, values)):
        x = margin_left + index * (bar_width + bar_gap)
        bar_height = (value / 100) * chart_height
        y = margin_top + chart_height - bar_height
        color = '#16a34a' if value >= 70 else '#f59e0b' if value >= 40 else '#dc2626'
        draw.rounded_rectangle((x, y, x + bar_width, margin_top + chart_height), radius=8, fill=color)
        value_text = f'{value:.1f}%'
        value_box = draw.textbbox((0, 0), value_text, font=small_font)
        draw.text((x + (bar_width - (value_box[2] - value_box[0])) / 2, y - 24), value_text, fill='#111827', font=small_font)
        _draw_rotated_label(image, label, (int(x + bar_width / 2), margin_top + chart_height + 64), font)

    image.save(output_path)


def _draw_rotated_label(image: Image.Image, text: str, center: tuple[int, int], font):
    label_image = Image.new('RGBA', (180, 42), (255, 255, 255, 0))
    label_draw = ImageDraw.Draw(label_image)
    label_draw.text((0, 10), text, fill='#111827', font=font)
    rotated = label_image.rotate(35, expand=True)
    image.paste(rotated, (center[0] - rotated.width // 2, center[1] - rotated.height // 2), rotated)


def _scale_color(value: int, max_value: int, rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    if value <= 0:
        return (249, 250, 251)
    intensity = 0.18 + 0.72 * (value / max_value)
    return tuple(int(255 - (255 - channel) * intensity) for channel in rgb)


def _font(size: int):
    try:
        return ImageFont.truetype('arial.ttf', size)
    except OSError:
        return ImageFont.load_default()


def _display_name(name: str) -> str:
    return name.replace('_', ' ').title()


def _evaluation_paragraph(overall: dict, per_class: list[dict]) -> str:
    best = sorted(per_class, key=lambda row: row['mask_map50_percent'], reverse=True)[:3]
    best_text = ', '.join(f"{row['class_name'].replace('_', ' ').title()} ({row['mask_map50_percent']}%)" for row in best)
    return (
        'Model Evaluation and Accuracy\n'
        f"The YOLO instance segmentation model was evaluated on {overall['validation_images']} validation images "
        f"containing {overall['validation_instances']} annotated food instances. Since segmentation models do not "
        'use ordinary classification accuracy, mask mAP@0.5 is used as the main accuracy-style metric. '
        f"The model achieved {overall['accuracy_proxy_percent']}% mask mAP@0.5, "
        f"{overall['precision_percent']}% precision, {overall['recall_percent']}% recall, and "
        f"{overall['f1_score_percent']}% F1-score. The strongest classes were {best_text}."
    )


def _validation_support(dataset_root: Path, names: dict[int, str]) -> dict[int, int]:
    support = {class_id: 0 for class_id in names}
    for image_path in _read_validation_image_paths(dataset_root):
        label_path = _label_path_for_image(dataset_root, image_path)
        if not label_path.exists():
            continue
        for line in label_path.read_text().splitlines():
            parts = line.split()
            if parts:
                support[int(parts[0])] = support.get(int(parts[0]), 0) + 1
    return support


def _read_validation_image_paths(dataset_root: Path):
    val_file = dataset_root / 'val.txt'
    source = val_file if val_file.exists() else dataset_root / 'train.txt'
    for line in source.read_text().splitlines():
        item = line.strip()
        if item:
            path = Path(item)
            yield path if path.is_absolute() else dataset_root / path


def _label_path_for_image(dataset_root: Path, image_path: Path) -> Path:
    image_path = image_path.resolve()
    try:
        relative = image_path.relative_to(dataset_root.resolve())
    except ValueError:
        relative = image_path
    parts = list(relative.parts)
    if 'images' in parts:
        parts[parts.index('images')] = 'labels'
    return (dataset_root / Path(*parts)).with_suffix('.txt')


def _prepared_data_yaml(data_path: Path) -> Path:
    text = data_path.read_text()
    train_list = _absolute_image_list(data_path.parent, 'train.txt')
    val_list = _absolute_image_list(data_path.parent, 'val.txt')
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith('path:'):
            lines.append(f'path: {data_path.parent.as_posix()}')
        elif stripped.startswith('train:'):
            lines.append(f'train: {train_list.as_posix()}')
        elif stripped.startswith('val:'):
            lines.append(f'val: {val_list.as_posix()}')
        else:
            lines.append(line)
    prepared = data_path.with_name(f'{data_path.stem}_resolved.yaml')
    prepared.write_text('\n'.join(lines).rstrip() + '\n')
    return prepared


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


def _percent(value: float) -> float:
    return round(float(value) * 100, 2)


def _f1_percent(precision: float, recall: float) -> float:
    precision = float(precision)
    recall = float(recall)
    if precision + recall == 0:
        return 0.0
    return round((2 * precision * recall / (precision + recall)) * 100, 2)


if __name__ == '__main__':
    main()
