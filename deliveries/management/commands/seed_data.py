from django.core.management.base import BaseCommand

from deliveries.models import Customer
from deliveries.services import ensure_delivery_records_for_date


class Command(BaseCommand):
    help = "Seed sample Fleurish & Co. customers with day selections."

    def handle(self, *args, **options):
        samples = [
            {
                "name": "Amelia Rose",
                "address": "12 Petal Lane",
                "area": "Downtown",
                "landmark": "Beside the old fountain",
                "maps_link": "https://maps.google.com/?q=12+Petal+Lane",
                "phone_numbers": ["555-0101", "555-0111"],
                "friday": True,
            },
            {
                "name": "James Willow",
                "address": "88 Garden Ave",
                "area": "Midtown",
                "landmark": "Hotel lobby entrance",
                "maps_link": "https://maps.google.com/?q=88+Garden+Ave",
                "phone_numbers": ["555-0102"],
                "wednesday": True,
                "friday": True,
            },
            {
                "name": "Sofia Chen",
                "address": "5 Orchid Court",
                "area": "Eastside",
                "landmark": "Spa glass doors",
                "maps_link": "",
                "phone_numbers": ["555-0103", "555-0199"],
                "monday": True,
                "wednesday": True,
                "friday": True,
            },
            {
                "name": "Marcus Hale",
                "address": "210 Magnolia Blvd",
                "area": "Downtown",
                "landmark": "Corner office tower",
                "maps_link": "https://maps.google.com/?q=210+Magnolia",
                "phone_numbers": ["555-0104"],
                "friday": True,
            },
            {
                "name": "Priya Nair",
                "address": "44 Jasmine Road",
                "area": "Westside",
                "landmark": "Yellow awning",
                "maps_link": "",
                "phone_numbers": ["555-0105"],
                "wednesday": True,
                "friday": True,
            },
            {
                "name": "Elena Vargas",
                "address": "19 Fern Street",
                "area": "Midtown",
                "landmark": "Next to the bakery",
                "maps_link": "https://maps.google.com/?q=19+Fern+Street",
                "phone_numbers": ["555-0106", "555-0166"],
                "monday": True,
                "wednesday": True,
                "friday": True,
            },
            {
                "name": "Tom Bradley",
                "address": "301 Lily Way",
                "area": "Eastside",
                "landmark": "Dental clinic parking",
                "maps_link": "",
                "phone_numbers": ["555-0107"],
                "tuesday": True,
                "thursday": True,
            },
            {
                "name": "Nina Patel",
                "address": "7 Dahlia Place",
                "area": "Westside",
                "landmark": "Boutique window display",
                "maps_link": "https://maps.google.com/?q=7+Dahlia+Place",
                "phone_numbers": ["555-0108", "555-0188"],
                "tuesday": True,
                "thursday": True,
            },
            {
                "name": "Olivia Park",
                "address": "56 Camellia Row",
                "area": "Downtown",
                "landmark": "Gallery side alley",
                "maps_link": "",
                "phone_numbers": ["555-0109"],
                "tuesday": True,
                "thursday": True,
            },
        ]

        created = 0
        for data in samples:
            defaults = {
                "address": data["address"],
                "area": data["area"],
                "landmark": data.get("landmark", ""),
                "maps_link": data.get("maps_link", ""),
                "phone_numbers": data["phone_numbers"],
                "monday": data.get("monday", False),
                "tuesday": data.get("tuesday", False),
                "wednesday": data.get("wednesday", False),
                "thursday": data.get("thursday", False),
                "friday": data.get("friday", False),
                "saturday": data.get("saturday", False),
                "sunday": data.get("sunday", False),
                "is_active": True,
            }
            _, was_created = Customer.objects.get_or_create(
                name=data["name"],
                defaults=defaults,
            )
            if was_created:
                created += 1

        records = ensure_delivery_records_for_date()
        self.stdout.write(
            self.style.SUCCESS(
                f"Customers created: {created}. Today's delivery records: {records.count()}."
            )
        )
