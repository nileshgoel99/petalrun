from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"schedules", views.DeliveryScheduleViewSet, basename="schedule")
router.register(r"customers", views.CustomerViewSet, basename="customer")
router.register(r"deliveries", views.DeliveryRecordViewSet, basename="delivery")

urlpatterns = [
    path("dashboard/", views.dashboard_stats, name="dashboard-stats"),
    path("today/", views.today_deliveries, name="today-deliveries"),
    path("", include(router.urls)),
]
