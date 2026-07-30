from django.contrib import admin

from .models import Customer, DeliveryRecord, DeliverySchedule


@admin.register(DeliverySchedule)
class DeliveryScheduleAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    )
    search_fields = ("name",)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "area", "landmark", "is_active", "delivery_frequency")
    list_filter = ("is_active", "area", "friday", "wednesday", "thursday")
    search_fields = ("name", "phone_numbers", "area", "address", "landmark")


@admin.register(DeliveryRecord)
class DeliveryRecordAdmin(admin.ModelAdmin):
    list_display = ("customer", "delivery_date", "status", "remarks", "updated_at")
    list_filter = ("status", "delivery_date")
    search_fields = ("customer__name", "remarks")
    date_hierarchy = "delivery_date"
