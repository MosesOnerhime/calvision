from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class AuthApiTests(APITestCase):
    def test_register_creates_user_and_returns_tokens(self):
        response = self.client.post(reverse('register'), {
            'email': 'ada@example.com',
            'first_name': 'Ada',
            'last_name': 'Lovelace',
            'password': 'strong-pass-123',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'ada@example.com')
        self.assertTrue(User.objects.filter(email='ada@example.com').exists())

    def test_login_accepts_email_and_password(self):
        User.objects.create_user(
            username='grace@example.com',
            email='grace@example.com',
            password='strong-pass-123',
        )

        response = self.client.post(reverse('token_obtain_pair'), {
            'email': 'grace@example.com',
            'password': 'strong-pass-123',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_me_requires_authentication(self):
        response = self.client.get(reverse('me'))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
