from django.db import models


WEEKDAY_FIELDS = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)

WEEKDAY_LABELS = {
    "monday": "Mon",
    "tuesday": "Tue",
    "wednesday": "Wed",
    "thursday": "Thu",
    "friday": "Fri",
    "saturday": "Sat",
    "sunday": "Sun",
}


class DeliverySchedule(models.Model):
    """Legacy reusable patterns — kept for admin/history; customers store their own days."""

    name = models.CharField(max_length=100, unique=True)
    monday = models.BooleanField(default=False)
    tuesday = models.BooleanField(default=False)
    wednesday = models.BooleanField(default=False)
    thursday = models.BooleanField(default=False)
    friday = models.BooleanField(default=False)
    saturday = models.BooleanField(default=False)
    sunday = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def days_list(self):
        return [WEEKDAY_LABELS[f] for f in WEEKDAY_FIELDS if getattr(self, f)]


class Customer(models.Model):
    name = models.CharField(max_length=150)
    address = models.TextField()
    area = models.CharField(max_length=100)
    landmark = models.CharField(max_length=255, blank=True)
    maps_link = models.URLField(max_length=500, blank=True)
    phone_numbers = models.JSONField(default=list, blank=True)
    monday = models.BooleanField(default=False)
    tuesday = models.BooleanField(default=False)
    wednesday = models.BooleanField(default=False)
    thursday = models.BooleanField(default=False)
    friday = models.BooleanField(default=False)
    saturday = models.BooleanField(default=False)
    sunday = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def phone_number(self):
        phones = self.phone_numbers or []
        return phones[0] if phones else ""

    @property
    def days_list(self):
        return [WEEKDAY_LABELS[f] for f in WEEKDAY_FIELDS if getattr(self, f)]

    @property
    def delivery_frequency(self):
        days = self.days_list
        if not days:
            return "No days set"
        if len(days) == 7:
            return "Every day"
        return " · ".join(days)

    def includes_weekday(self, weekday: int) -> bool:
        mapping = {
            0: self.monday,
            1: self.tuesday,
            2: self.wednesday,
            3: self.thursday,
            4: self.friday,
            5: self.saturday,
            6: self.sunday,
        }
        return mapping.get(weekday, False)


class DeliveryRecord(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        DELIVERED = "delivered", "Delivered"
        NOT_DELIVERED = "not_delivered", "Not Delivered"

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="delivery_records",
    )
    delivery_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["customer__name"]
        unique_together = [("customer", "delivery_date")]

    def __str__(self):
        return f"{self.customer} — {self.delivery_date} ({self.status})"
