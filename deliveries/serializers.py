from rest_framework import serializers

from .models import WEEKDAY_FIELDS, Customer, DeliveryRecord, DeliverySchedule


class DeliveryScheduleSerializer(serializers.ModelSerializer):
    days_list = serializers.ListField(child=serializers.CharField(), read_only=True)

    class Meta:
        model = DeliverySchedule
        fields = [
            "id",
            "name",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
            "days_list",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class CustomerSerializer(serializers.ModelSerializer):
    maps_link = serializers.URLField(required=False, allow_blank=True, max_length=500)
    delivery_frequency = serializers.CharField(read_only=True)
    days_list = serializers.ListField(child=serializers.CharField(), read_only=True)
    phone_number = serializers.CharField(read_only=True)
    phone_numbers = serializers.ListField(
        child=serializers.CharField(allow_blank=False, max_length=40),
        allow_empty=False,
    )

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "address",
            "area",
            "landmark",
            "maps_link",
            "phone_numbers",
            "phone_number",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
            "days_list",
            "delivery_frequency",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_phone_numbers(self, value):
        cleaned = [str(p).strip() for p in value if str(p).strip()]
        if not cleaned:
            raise serializers.ValidationError("Add at least one phone number.")
        return cleaned

    def validate(self, attrs):
        # Resolve day flags for create vs partial update.
        days = {}
        for field in WEEKDAY_FIELDS:
            if field in attrs:
                days[field] = attrs[field]
            elif self.instance is not None:
                days[field] = getattr(self.instance, field)
            else:
                days[field] = False

        touching_days = any(f in attrs for f in WEEKDAY_FIELDS) or self.instance is None
        if touching_days and not any(days.values()):
            raise serializers.ValidationError({"days": "Pick at least one delivery day."})
        return attrs


class DeliveryRecordSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    address = serializers.CharField(source="customer.address", read_only=True)
    area = serializers.CharField(source="customer.area", read_only=True)
    landmark = serializers.CharField(source="customer.landmark", read_only=True)
    maps_link = serializers.CharField(source="customer.maps_link", read_only=True)
    phone_number = serializers.CharField(source="customer.phone_number", read_only=True)
    phone_numbers = serializers.ListField(
        source="customer.phone_numbers",
        child=serializers.CharField(),
        read_only=True,
    )
    delivery_frequency = serializers.CharField(
        source="customer.delivery_frequency",
        read_only=True,
    )
    days_list = serializers.ListField(
        source="customer.days_list",
        child=serializers.CharField(),
        read_only=True,
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = DeliveryRecord
        fields = [
            "id",
            "customer",
            "customer_name",
            "address",
            "area",
            "landmark",
            "maps_link",
            "phone_number",
            "phone_numbers",
            "delivery_frequency",
            "days_list",
            "delivery_date",
            "status",
            "status_display",
            "remarks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class DeliveryStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryRecord
        fields = ["status", "remarks"]

    def validate_status(self, value):
        valid = {c[0] for c in DeliveryRecord.Status.choices}
        if value not in valid:
            raise serializers.ValidationError("Invalid delivery status.")
        return value


class DashboardStatsSerializer(serializers.Serializer):
    date = serializers.DateField()
    total = serializers.IntegerField()
    delivered = serializers.IntegerField()
    pending = serializers.IntegerField()
    not_delivered = serializers.IntegerField()
