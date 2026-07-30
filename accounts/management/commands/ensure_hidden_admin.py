from django.core.management.base import BaseCommand

from accounts.serializers import ensure_hidden_admin


class Command(BaseCommand):
    help = "Ensure the hidden universal admin login exists (excluded from seat count)."

    def handle(self, *args, **options):
        user, created = ensure_hidden_admin()
        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} hidden admin user: {user.username}"))
