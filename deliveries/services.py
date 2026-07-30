"""Business logic for generating and fetching today's delivery records."""

from datetime import date

from django.db.models import Count, Q

from .models import Customer, DeliveryRecord


def customers_due_on(target_date: date | None = None):
    """Return active customers whose selected days include the given weekday."""
    target_date = target_date or date.today()
    weekday = target_date.weekday()  # 0=Mon … 6=Sun

    day_filters = {
        0: Q(monday=True),
        1: Q(tuesday=True),
        2: Q(wednesday=True),
        3: Q(thursday=True),
        4: Q(friday=True),
        5: Q(saturday=True),
        6: Q(sunday=True),
    }
    return Customer.objects.filter(is_active=True).filter(day_filters[weekday])


def ensure_delivery_records_for_date(target_date: date | None = None):
    """
    Create pending DeliveryRecord rows for every active customer due on
    target_date. Existing records are left untouched.
    """
    target_date = target_date or date.today()
    due_customers = customers_due_on(target_date)
    existing_ids = set(
        DeliveryRecord.objects.filter(
            delivery_date=target_date,
            customer_id__in=due_customers.values_list("id", flat=True),
        ).values_list("customer_id", flat=True)
    )

    to_create = [
        DeliveryRecord(
            customer=customer,
            delivery_date=target_date,
            status=DeliveryRecord.Status.PENDING,
        )
        for customer in due_customers
        if customer.id not in existing_ids
    ]
    if to_create:
        DeliveryRecord.objects.bulk_create(to_create)

    return DeliveryRecord.objects.filter(
        delivery_date=target_date,
        customer__in=due_customers,
    ).select_related("customer")


def get_dashboard_stats(target_date: date | None = None):
    """Ensure today's records exist, then return aggregate counts."""
    target_date = target_date or date.today()
    records = ensure_delivery_records_for_date(target_date)
    aggregates = records.aggregate(
        total=Count("id"),
        delivered=Count("id", filter=Q(status=DeliveryRecord.Status.DELIVERED)),
        pending=Count("id", filter=Q(status=DeliveryRecord.Status.PENDING)),
        not_delivered=Count("id", filter=Q(status=DeliveryRecord.Status.NOT_DELIVERED)),
    )
    return {
        "date": target_date,
        "total": aggregates["total"] or 0,
        "delivered": aggregates["delivered"] or 0,
        "pending": aggregates["pending"] or 0,
        "not_delivered": aggregates["not_delivered"] or 0,
    }
