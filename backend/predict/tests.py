import base64
import io
from unittest.mock import patch

import numpy as np
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from .views import estimate_portion_from_mask_area, render_detection_overlay


User = get_user_model()


def _test_image_file():
    buffer = io.BytesIO()
    Image.new('RGB', (160, 120), color=(220, 240, 225)).save(buffer, format='JPEG')
    buffer.seek(0)
    return SimpleUploadedFile('meal.jpg', buffer.read(), content_type='image/jpeg')


class PredictionOverlayTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='predict@example.com',
            email='predict@example.com',
            password='strong-pass-123',
        )
        self.client.force_authenticate(user=self.user)

    def test_render_detection_overlay_returns_jpeg_data_url(self):
        img = Image.new('RGB', (80, 80), color='white')
        mask = np.zeros((80, 80), dtype=np.float32)
        mask[20:60, 20:60] = 1

        data_url = render_detection_overlay(img, [{
            'name': 'apple',
            'confidence': 0.92,
            'box': [20, 20, 60, 60],
            'mask': mask,
        }])

        self.assertTrue(data_url.startswith('data:image/jpeg;base64,'))
        payload = data_url.split(',', 1)[1]
        self.assertGreater(len(base64.b64decode(payload)), 0)

    @patch('predict.views.segment_food', return_value=[])
    @patch('predict.views.classify_food', return_value=[])
    def test_predict_mock_response_includes_overlay_image(self, _mock_classify_food, _mock_segment_food):
        response = self.client.post(
            reverse('predict'),
            {'image': _test_image_file()},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['mock'])
        self.assertTrue(response.data['overlay_image'].startswith('data:image/jpeg;base64,'))

    @patch('predict.views.segment_food', return_value=[])
    @patch('predict.views.classify_food', return_value=[
        {'name': 'Jollof Rice', 'raw_name': 'jollof_rice', 'confidence': 0.94},
        {'name': 'Fried Rice', 'raw_name': 'fried_rice', 'confidence': 0.31},
    ])
    def test_predict_classifier_response_includes_confidence_and_overlay(self, _mock_classify_food, _mock_segment_food):
        response = self.client.post(
            reverse('predict'),
            {'image': _test_image_file()},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['mock'])
        self.assertEqual(response.data['prediction_type'], 'classification')
        self.assertEqual(response.data['items'][0]['name'], 'Jollof Rice')
        self.assertEqual(response.data['items'][0]['weight_grams'], 300)
        self.assertEqual(response.data['items'][0]['confidence'], 94.0)
        self.assertEqual(response.data['items'][0]['calories'], 435)
        self.assertTrue(response.data['overlay_image'].startswith('data:image/jpeg;base64,'))

    @patch('predict.views.classify_food')
    @patch('predict.views.segment_food')
    def test_predict_yolo_segmentation_response_uses_real_detections(
        self,
        mock_segment_food,
        mock_classify_food,
    ):
        mask = np.zeros((80, 80), dtype=np.float32)
        mask[20:60, 20:60] = 1
        mock_segment_food.return_value = [
            {
                'name': 'Jollof Rice',
                'raw_name': 'jollof_rice',
                'confidence': 0.91,
                'box': [20, 20, 60, 60],
                'mask': mask,
            },
            {
                'name': 'Fried Plantain',
                'raw_name': 'fried_plantain',
                'confidence': 0.77,
                'box': [70, 20, 120, 60],
                'mask': mask,
            },
        ]

        response = self.client.post(
            reverse('predict'),
            {'image': _test_image_file()},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['mock'])
        self.assertEqual(response.data['prediction_type'], 'yolo_segmentation')
        self.assertEqual(len(response.data['items']), 2)
        self.assertEqual(response.data['items'][0]['raw_name'], 'jollof_rice')
        self.assertEqual(response.data['items'][0]['confidence'], 91.0)
        self.assertEqual(response.data['items'][0]['nutrition_source'], 'yolo_segmentation_curated_african_food_fallback')
        self.assertEqual(response.data['items'][0]['portion_estimation_method'], 'mask_area_estimate')
        self.assertEqual(len(response.data['detections']), 2)
        self.assertTrue(response.data['overlay_image'].startswith('data:image/jpeg;base64,'))
        mock_classify_food.assert_not_called()

    def test_mask_area_portion_estimate_scales_from_visible_mask(self):
        mask = np.zeros((100, 100), dtype=np.float32)
        mask[:50, :50] = 1

        weight, method = estimate_portion_from_mask_area('jollof_rice', [{'mask': mask}])

        self.assertEqual(method, 'mask_area_estimate')
        self.assertEqual(weight, 275.6)

    def test_mask_area_portion_estimate_falls_back_for_tiny_mask(self):
        mask = np.zeros((100, 100), dtype=np.float32)
        mask[0, 0] = 1

        weight, method = estimate_portion_from_mask_area('jollof_rice', [{'mask': mask}])

        self.assertEqual(method, 'default_portion_no_valid_mask_area')
        self.assertEqual(weight, 300)
