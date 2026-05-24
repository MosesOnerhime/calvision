from django.urls import path
from . import views

urlpatterns = [
    path('save/', views.save_meal, name='save_meal'),
    path('history/', views.meal_history, name='meal_history'),
    path('stats/', views.dashboard_stats, name='dashboard_stats'),
    path('<int:pk>/', views.meal_detail, name='meal_detail'),
]