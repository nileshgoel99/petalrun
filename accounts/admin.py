from django.contrib import admin

from .models import UpgradeRequest


@admin.register(UpgradeRequest)
class UpgradeRequestAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "company", "resolved", "created_at")
    list_filter = ("resolved", "created_at")
    search_fields = ("name", "email", "company", "message")
