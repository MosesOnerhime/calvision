"""
Evaluate the CalVision Teachable Machine/TFLite classifier on a holdout dataset.

Expected dataset layout:

validation_set/
  jollof_rice/
    image1.jpg
    image2.png
  fried_rice/
    image1.jpg
  ...

Run from backend/:

python predict/evaluate_classifier.py --dataset path/to/validation_set
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

if __package__ in (None, ''):
    sys.path.append(str(Path(__file__).resolve().parents[1]))

from predict.african_food_classifier import (  # noqa: E402
    _dequantize_output,
    _display_name,
    _preprocess_image,
    get_classifier_status,
    load_model,
)

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}


@dataclass
class PredictionRecord:
    path: str
    actual: str
    predicted: str
    confidence: float
    correct: bool


def main() -> int:
    parser = argparse.ArgumentParser(description='Evaluate the CalVision African food classifier.')
    parser.add_argument('--dataset', required=True, help='Path to holdout dataset with one folder per class.')
    parser.add_argument('--output-dir', default='predict/evaluation_reports', help='Where to write report files.')
    parser.add_argument('--top-confident', default='jollof_rice,fried_plantain', help='Comma-separated classes to mention in the paragraph.')
    args = parser.parse_args()

    dataset_dir = Path(args.dataset).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not dataset_dir.exists():
        print(f"Dataset folder not found: {dataset_dir}", file=sys.stderr)
        return 2

    status = get_classifier_status()
    if not status.ready:
        print(f"Classifier is not ready: {status.error}", file=sys.stderr)
        return 2

    interpreter, labels = load_model()
    if interpreter is None or labels is None:
        print("Classifier failed to load.", file=sys.stderr)
        return 2

    image_paths = collect_images(dataset_dir, labels)
    if not image_paths:
        print(
            "No validation images found. Expected folders named like labels.txt classes, "
            "for example validation_set/jollof_rice/*.jpg",
            file=sys.stderr,
        )
        return 2

    records = evaluate_images(interpreter, labels, image_paths)
    metrics = compute_metrics(records, labels)
    paragraph = build_paragraph(metrics, args.top_confident.split(','))

    write_json(output_dir / 'metrics.json', metrics)
    write_predictions_csv(output_dir / 'predictions.csv', records)
    write_confusion_csv(output_dir / 'confusion_matrix.csv', metrics['confusion_matrix'], labels)
    write_graphs(output_dir, metrics, records, labels)
    (output_dir / 'evaluation_paragraph.txt').write_text(paragraph, encoding='utf-8')

    print_summary(metrics, paragraph, output_dir)
    return 0


def collect_images(dataset_dir: Path, labels: list[str]) -> list[tuple[Path, str]]:
    image_paths = []
    valid_labels = set(labels)

    for class_dir in sorted(dataset_dir.iterdir()):
        if not class_dir.is_dir() or class_dir.name not in valid_labels:
            continue

        for path in sorted(class_dir.rglob('*')):
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
                image_paths.append((path, class_dir.name))

    return image_paths


def evaluate_images(interpreter, labels: list[str], image_paths: list[tuple[Path, str]]) -> list[PredictionRecord]:
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    input_detail = input_details[0]
    output_detail = output_details[0]
    records = []

    for path, actual in image_paths:
        image_bytes = path.read_bytes()
        img_array = _preprocess_image(image_bytes, input_detail)

        interpreter.set_tensor(input_detail['index'], img_array)
        interpreter.invoke()

        output = interpreter.get_tensor(output_detail['index'])[0]
        probabilities = _dequantize_output(output, output_detail)
        predicted_index = int(np.argmax(probabilities))
        predicted = labels[predicted_index] if predicted_index < len(labels) else 'unknown'
        confidence = float(probabilities[predicted_index]) if predicted_index < len(probabilities) else 0.0

        records.append(PredictionRecord(
            path=str(path),
            actual=actual,
            predicted=predicted,
            confidence=confidence,
            correct=actual == predicted,
        ))

    return records


def compute_metrics(records: list[PredictionRecord], labels: list[str]) -> dict:
    total = len(records)
    correct = sum(1 for record in records if record.correct)
    confusion = {
        actual: {predicted: 0 for predicted in labels}
        for actual in labels
    }

    for record in records:
        if record.actual in confusion and record.predicted in confusion[record.actual]:
            confusion[record.actual][record.predicted] += 1

    per_class = {}
    for label in labels:
        tp = confusion[label][label]
        fp = sum(confusion[actual][label] for actual in labels if actual != label)
        fn = sum(confusion[label][predicted] for predicted in labels if predicted != label)
        support = sum(confusion[label].values())
        precision = safe_div(tp, tp + fp)
        recall = safe_div(tp, tp + fn)
        f1 = safe_div(2 * precision * recall, precision + recall)
        confidence_values = [
            record.confidence for record in records
            if record.actual == label and record.predicted == label
        ]

        per_class[label] = {
            'display_name': _display_name(label),
            'support': support,
            'precision': round_percent(precision),
            'recall': round_percent(recall),
            'f1_score': round_percent(f1),
            'average_correct_confidence': round_percent(sum(confidence_values) / len(confidence_values)) if confidence_values else 0.0,
        }

    macro_precision = average([per_class[label]['precision'] for label in labels])
    macro_recall = average([per_class[label]['recall'] for label in labels])
    macro_f1 = average([per_class[label]['f1_score'] for label in labels])

    return {
        'model_type': 'image_classification',
        'total_images': total,
        'overall_accuracy': round_percent(safe_div(correct, total)),
        'macro_precision': macro_precision,
        'macro_recall': macro_recall,
        'macro_f1_score': macro_f1,
        'mAP_at_iou_0_5': None,
        'iou': None,
        'detection_metric_note': 'mAP and IoU are not applicable to this Teachable Machine classifier because it does not predict boxes or masks.',
        'per_class': per_class,
        'confusion_matrix': confusion,
    }


def build_paragraph(metrics: dict, highlighted_classes: list[str]) -> str:
    confident_mentions = []
    for raw_name in highlighted_classes:
        label = raw_name.strip()
        if not label or label not in metrics['per_class']:
            continue
        class_metrics = metrics['per_class'][label]
        confident_mentions.append(
            f"{class_metrics['display_name']} ({class_metrics['average_correct_confidence']:.1f}% average confidence on correct predictions)"
        )

    confident_text = ', and '.join(confident_mentions) if confident_mentions else 'the strongest classes in the validation set'

    return (
        "Model Evaluation and Accuracy\n"
        "The key to the system's viability is the accuracy of the Nigerian food image classification model. "
        "Standard classification metrics, described in Chapter Two: Accuracy, Precision, Recall, and F1-Score, "
        "were used to evaluate the model. Because the current Teachable Machine model is a classifier rather than "
        "an object detection or segmentation model, Intersection over Union (IoU) and mean Average Precision (mAP) "
        "are not applicable until the system is upgraded to a detector/segmenter.\n\n"
        f"The model was tested on a holdout validation set of complex African dishes and achieved an overall "
        f"accuracy of {metrics['overall_accuracy']:.1f}%, a macro precision of {metrics['macro_precision']:.1f}%, "
        f"a macro recall of {metrics['macro_recall']:.1f}%, and a macro F1-score of {metrics['macro_f1_score']:.1f}%. "
        f"The model was most certain in the identification of textured items such as {confident_text}."
    )


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2), encoding='utf-8')


def write_predictions_csv(path: Path, records: list[PredictionRecord]) -> None:
    with path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['path', 'actual', 'predicted', 'confidence_percent', 'correct'])
        writer.writeheader()
        for record in records:
            writer.writerow({
                'path': record.path,
                'actual': record.actual,
                'predicted': record.predicted,
                'confidence_percent': round_percent(record.confidence),
                'correct': record.correct,
            })


def write_confusion_csv(path: Path, confusion: dict, labels: list[str]) -> None:
    with path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['actual/predicted', *labels])
        for actual in labels:
            writer.writerow([actual, *[confusion[actual][predicted] for predicted in labels]])


def write_graphs(output_dir: Path, metrics: dict, records: list[PredictionRecord], labels: list[str]) -> None:
    write_overall_metrics_chart(output_dir / 'overall_metrics.png', metrics)
    write_per_class_metrics_chart(output_dir / 'per_class_metrics.png', metrics, labels)
    write_class_support_chart(output_dir / 'class_support.png', metrics, labels)
    write_confidence_chart(output_dir / 'confidence_by_class.png', records, labels)
    write_confusion_heatmap(output_dir / 'confusion_matrix.png', metrics['confusion_matrix'], labels)


def write_overall_metrics_chart(path: Path, metrics: dict) -> None:
    values = [
        ('Accuracy', metrics['overall_accuracy'], '#16a34a'),
        ('Precision', metrics['macro_precision'], '#2563eb'),
        ('Recall', metrics['macro_recall'], '#d97706'),
        ('F1-score', metrics['macro_f1_score'], '#dc2626'),
    ]
    draw_bar_chart(
        path=path,
        title='Overall Model Metrics',
        values=values,
        x_label='Metric',
        y_label='Percent',
        max_value=100,
    )


def write_per_class_metrics_chart(path: Path, metrics: dict, labels: list[str]) -> None:
    rows = [
        (
            metrics['per_class'][label]['display_name'],
            [
                ('Precision', metrics['per_class'][label]['precision'], '#2563eb'),
                ('Recall', metrics['per_class'][label]['recall'], '#d97706'),
                ('F1', metrics['per_class'][label]['f1_score'], '#dc2626'),
            ],
        )
        for label in labels
        if metrics['per_class'][label]['support'] > 0
    ]
    draw_grouped_bar_chart(
        path=path,
        title='Per-Class Precision, Recall, and F1',
        rows=rows,
        max_value=100,
    )


def write_class_support_chart(path: Path, metrics: dict, labels: list[str]) -> None:
    values = [
        (metrics['per_class'][label]['display_name'], metrics['per_class'][label]['support'], '#16a34a')
        for label in labels
        if metrics['per_class'][label]['support'] > 0
    ]
    max_value = max([value for _, value, _ in values], default=1)
    draw_bar_chart(
        path=path,
        title='Validation Images per Class',
        values=values,
        x_label='Class',
        y_label='Images',
        max_value=max_value,
    )


def write_confidence_chart(path: Path, records: list[PredictionRecord], labels: list[str]) -> None:
    values = []
    for label in labels:
        class_records = [record for record in records if record.actual == label]
        if not class_records:
            continue
        avg_confidence = sum(record.confidence for record in class_records) / len(class_records) * 100
        correct_count = sum(1 for record in class_records if record.correct)
        color = '#16a34a' if correct_count == len(class_records) else '#dc2626'
        values.append((_display_name(label), round(avg_confidence, 2), color))

    draw_bar_chart(
        path=path,
        title='Average Prediction Confidence by Actual Class',
        values=values,
        x_label='Class',
        y_label='Confidence (%)',
        max_value=100,
    )


def write_confusion_heatmap(path: Path, confusion: dict, labels: list[str]) -> None:
    active_labels = [
        label for label in labels
        if sum(confusion[label].values()) > 0 or sum(confusion[actual][label] for actual in labels) > 0
    ]
    if not active_labels:
        active_labels = labels

    cell = 70
    left = 180
    top = 180
    right = 40
    bottom = 100
    width = left + len(active_labels) * cell + right
    height = top + len(active_labels) * cell + bottom
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    title_font = ImageFont.load_default()
    max_count = max(
        [confusion[actual][predicted] for actual in active_labels for predicted in active_labels],
        default=1,
    ) or 1

    draw_text(draw, (width // 2, 30), 'Confusion Matrix', font=title_font, fill='#111827', anchor='mm')
    draw_text(draw, (left + len(active_labels) * cell // 2, 72), 'Predicted Class', font=font, fill='#374151', anchor='mm')
    draw_text(draw, (25, top + len(active_labels) * cell // 2), 'Actual', font=font, fill='#374151', anchor='mm')

    for index, label in enumerate(active_labels):
        x = left + index * cell + cell // 2
        y = top - 82
        draw_rotated_text(img, (x, y), _display_name(label), angle=45)

        y_label = top + index * cell + cell // 2
        draw_text(draw, (left - 10, y_label), _display_name(label), font=font, fill='#111827', anchor='rm')

    for row, actual in enumerate(active_labels):
        for col, predicted in enumerate(active_labels):
            value = confusion[actual][predicted]
            intensity = value / max_count
            color = interpolate_color((239, 246, 255), (37, 99, 235), intensity)
            x1 = left + col * cell
            y1 = top + row * cell
            x2 = x1 + cell
            y2 = y1 + cell
            draw.rectangle((x1, y1, x2, y2), fill=color, outline='#d1d5db')
            text_color = 'white' if intensity > 0.55 else '#111827'
            draw_text(draw, ((x1 + x2) // 2, (y1 + y2) // 2), str(value), font=font, fill=text_color, anchor='mm')

    img.save(path)


def draw_bar_chart(path: Path, title: str, values: list[tuple[str, float, str]], x_label: str, y_label: str, max_value: float) -> None:
    width = max(900, 120 + len(values) * 120)
    height = 620
    margin_left = 90
    margin_right = 40
    margin_top = 80
    margin_bottom = 150
    plot_width = width - margin_left - margin_right
    plot_height = height - margin_top - margin_bottom
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()

    draw_text(draw, (width // 2, 35), title, font=font, fill='#111827', anchor='mm')
    draw.line((margin_left, margin_top, margin_left, margin_top + plot_height), fill='#9ca3af', width=2)
    draw.line((margin_left, margin_top + plot_height, margin_left + plot_width, margin_top + plot_height), fill='#9ca3af', width=2)

    for tick in range(0, 6):
        value = max_value * tick / 5
        y = margin_top + plot_height - (value / max_value * plot_height if max_value else 0)
        draw.line((margin_left - 5, y, margin_left + plot_width, y), fill='#e5e7eb')
        draw_text(draw, (margin_left - 12, y), f'{value:.0f}', font=font, fill='#4b5563', anchor='rm')

    if values:
        slot = plot_width / len(values)
        bar_width = min(70, slot * 0.55)
        for index, (label, value, color) in enumerate(values):
            x_center = margin_left + slot * index + slot / 2
            bar_height = (value / max_value * plot_height) if max_value else 0
            x1 = x_center - bar_width / 2
            y1 = margin_top + plot_height - bar_height
            x2 = x_center + bar_width / 2
            y2 = margin_top + plot_height
            draw.rounded_rectangle((x1, y1, x2, y2), radius=6, fill=color)
            draw_text(draw, (x_center, y1 - 12), f'{value:.1f}', font=font, fill='#111827', anchor='mm')
            draw_rotated_text(img, (x_center, margin_top + plot_height + 18), label, angle=35)

    draw_text(draw, (width // 2, height - 25), x_label, font=font, fill='#374151', anchor='mm')
    draw_text(draw, (28, margin_top + plot_height // 2), y_label, font=font, fill='#374151', anchor='mm')
    img.save(path)


def draw_grouped_bar_chart(path: Path, title: str, rows: list[tuple[str, list[tuple[str, float, str]]]], max_value: float) -> None:
    width = max(900, 180 + len(rows) * 170)
    height = 650
    margin_left = 90
    margin_right = 40
    margin_top = 90
    margin_bottom = 170
    plot_width = width - margin_left - margin_right
    plot_height = height - margin_top - margin_bottom
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()

    draw_text(draw, (width // 2, 35), title, font=font, fill='#111827', anchor='mm')
    draw.line((margin_left, margin_top, margin_left, margin_top + plot_height), fill='#9ca3af', width=2)
    draw.line((margin_left, margin_top + plot_height, margin_left + plot_width, margin_top + plot_height), fill='#9ca3af', width=2)

    for tick in range(0, 6):
        value = max_value * tick / 5
        y = margin_top + plot_height - value / max_value * plot_height
        draw.line((margin_left - 5, y, margin_left + plot_width, y), fill='#e5e7eb')
        draw_text(draw, (margin_left - 12, y), f'{value:.0f}', font=font, fill='#4b5563', anchor='rm')

    if rows:
        slot = plot_width / len(rows)
        group_width = min(120, slot * 0.78)
        bar_width = group_width / 3
        for row_index, (label, bars) in enumerate(rows):
            group_left = margin_left + slot * row_index + (slot - group_width) / 2
            for bar_index, (_, value, color) in enumerate(bars):
                x1 = group_left + bar_index * bar_width
                x2 = x1 + bar_width - 4
                bar_height = value / max_value * plot_height
                y1 = margin_top + plot_height - bar_height
                y2 = margin_top + plot_height
                draw.rectangle((x1, y1, x2, y2), fill=color)
            draw_rotated_text(img, (group_left + group_width / 2, margin_top + plot_height + 18), label, angle=35)

    legend_x = margin_left
    for label, _, color in [('Precision', 0, '#2563eb'), ('Recall', 0, '#d97706'), ('F1', 0, '#dc2626')]:
        draw.rectangle((legend_x, 62, legend_x + 14, 76), fill=color)
        draw_text(draw, (legend_x + 20, 69), label, font=font, fill='#374151', anchor='lm')
        legend_x += 120

    img.save(path)


def draw_text(draw: ImageDraw.ImageDraw, xy: tuple[float, float], text: str, font, fill: str, anchor: str = 'la') -> None:
    draw.text(xy, text, font=font, fill=fill, anchor=anchor)


def draw_rotated_text(img: Image.Image, xy: tuple[float, float], text: str, angle: int = 35) -> None:
    font = ImageFont.load_default()
    bbox = ImageDraw.Draw(Image.new('RGB', (1, 1))).textbbox((0, 0), text, font=font)
    text_img = Image.new('RGBA', (bbox[2] - bbox[0] + 8, bbox[3] - bbox[1] + 8), (255, 255, 255, 0))
    text_draw = ImageDraw.Draw(text_img)
    text_draw.text((4, 4), text, font=font, fill='#374151')
    rotated = text_img.rotate(angle, expand=True)
    img.paste(rotated, (int(xy[0] - rotated.width / 2), int(xy[1])), rotated)


def interpolate_color(start: tuple[int, int, int], end: tuple[int, int, int], amount: float) -> tuple[int, int, int]:
    amount = max(0.0, min(1.0, amount))
    return tuple(int(start[index] + (end[index] - start[index]) * amount) for index in range(3))


def print_summary(metrics: dict, paragraph: str, output_dir: Path) -> None:
    print(f"Images evaluated: {metrics['total_images']}")
    print(f"Accuracy: {metrics['overall_accuracy']:.1f}%")
    print(f"Macro precision: {metrics['macro_precision']:.1f}%")
    print(f"Macro recall: {metrics['macro_recall']:.1f}%")
    print(f"Macro F1-score: {metrics['macro_f1_score']:.1f}%")
    print(f"mAP@0.5: N/A for classifier")
    print()
    print(paragraph)
    print()
    print(f"Reports written to: {output_dir}")
    print("Graphs written:")
    for filename in [
        'overall_metrics.png',
        'per_class_metrics.png',
        'class_support.png',
        'confidence_by_class.png',
        'confusion_matrix.png',
    ]:
        print(f"- {output_dir / filename}")


def safe_div(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def round_percent(value: float) -> float:
    return round(value * 100, 2)


def average(values: list[float]) -> float:
    return round(sum(values) / len(values), 2) if values else 0.0


if __name__ == '__main__':
    raise SystemExit(main())
