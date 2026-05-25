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

from .views import render_detection_overlay


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

    @patch('predict.views.get_model', return_value=None)
    def test_predict_mock_response_includes_overlay_image(self, _mock_get_model):
        response = self.client.post(
            reverse('predict'),
            {'image': _test_image_file()},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['mock'])
        self.assertTrue(response.data['overlay_image'].startswith('data:image/jpeg;base64,'))
