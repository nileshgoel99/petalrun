from datetime import date, datetime

from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .models import Customer, DeliveryRecord, DeliverySchedule
from .serializers import (
    CustomerSerializer,
    DashboardStatsSerializer,
    DeliveryRecordSerializer,
    DeliveryScheduleSerializer,
    DeliveryStatusUpdateSerializer,
)
from .services import ensure_delivery_records_for_date, get_dashboard_stats


def parse_date(value: str | None) -> date:
    if not value:
        return date.today()
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return date.today()


class DeliveryScheduleViewSet(viewsets.ModelViewSet):
    queryset = DeliverySchedule.objects.all()
    serializer_class = DeliveryScheduleSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()
        area = self.request.query_params.get("area", "").strip()
        active = self.request.query_params.get("is_active")

        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(address__icontains=search)
                | Q(area__icontains=search)
                | Q(landmark__icontains=search)
                | Q(phone_numbers__icontains=search)
            )
        if area:
            qs = qs.filter(area__iexact=area)
        if active is not None and active != "":
            qs = qs.filter(is_active=active.lower() in ("1", "true", "yes"))
        return qs

    @action(detail=False, methods=["get"])
    def areas(self, request):
        areas = (
            Customer.objects.exclude(area="")
            .values_list("area", flat=True)
            .distinct()
            .order_by("area")
        )
        return Response(list(areas))


class DeliveryRecordViewSet(viewsets.ModelViewSet):
    queryset = DeliveryRecord.objects.select_related("customer").all()
    serializer_class = DeliveryRecordSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        delivery_date = self.request.query_params.get("date")
        status_filter = self.request.query_params.get("status", "").strip()
        search = self.request.query_params.get("search", "").strip()
        area = self.request.query_params.get("area", "").strip()

        if delivery_date:
            qs = qs.filter(delivery_date=parse_date(delivery_date))
        if status_filter:
            qs = qs.filter(status=status_filter)
        if area:
            qs = qs.filter(customer__area__iexact=area)
        if search:
            qs = qs.filter(
                Q(customer__name__icontains=search)
                | Q(customer__address__icontains=search)
                | Q(customer__area__icontains=search)
                | Q(customer__landmark__icontains=search)
                | Q(customer__phone_numbers__icontains=search)
                | Q(remarks__icontains=search)
            )
        return qs

    @action(detail=True, methods=["patch"])
    def update_status(self, request, pk=None):
        record = self.get_object()
        serializer = DeliveryStatusUpdateSerializer(record, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(DeliveryRecordSerializer(record).data)


@api_view(["GET"])
def today_deliveries(request):
    """Generate (if needed) and return delivery records for a given date (default today)."""
    target = parse_date(request.query_params.get("date"))
    records = ensure_delivery_records_for_date(target)

    status_filter = request.query_params.get("status", "").strip()
    search = request.query_params.get("search", "").strip()
    area = request.query_params.get("area", "").strip()

    if status_filter:
        records = records.filter(status=status_filter)
    if area:
        records = records.filter(customer__area__iexact=area)
    if search:
        records = records.filter(
            Q(customer__name__icontains=search)
            | Q(customer__address__icontains=search)
            | Q(customer__area__icontains=search)
            | Q(customer__landmark__icontains=search)
            | Q(customer__phone_numbers__icontains=search)
            | Q(remarks__icontains=search)
        )

    serializer = DeliveryRecordSerializer(records, many=True)
    return Response({"date": target, "count": records.count(), "results": serializer.data})


@api_view(["GET"])
def dashboard_stats(request):
    target = parse_date(request.query_params.get("date"))
    stats = get_dashboard_stats(target)
    return Response(DashboardStatsSerializer(stats).data)
