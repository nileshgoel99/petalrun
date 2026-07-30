from django.db import migrations, models


def copy_customer_fields(apps, schema_editor):
    Customer = apps.get_model("deliveries", "Customer")
    for customer in Customer.objects.select_related("delivery_schedule").all():
        schedule = customer.delivery_schedule
        if schedule:
            customer.monday = schedule.monday
            customer.tuesday = schedule.tuesday
            customer.wednesday = schedule.wednesday
            customer.thursday = schedule.thursday
            customer.friday = schedule.friday
            customer.saturday = schedule.saturday
            customer.sunday = schedule.sunday
        phone = getattr(customer, "phone_number", "") or ""
        customer.phone_numbers = [phone] if phone else []
        customer.save()


class Migration(migrations.Migration):

    dependencies = [
        ("deliveries", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="friday",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="customer",
            name="landmark",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="customer",
            name="maps_link",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="customer",
            name="monday",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="customer",
            name="phone_numbers",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="customer",
            name="saturday",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="customer",
            name="sunday",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="customer",
            name="thursday",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="customer",
            name="tuesday",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="customer",
            name="wednesday",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(copy_customer_fields, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="customer",
            name="business_name",
        ),
        migrations.RemoveField(
            model_name="customer",
            name="delivery_schedule",
        ),
        migrations.RemoveField(
            model_name="customer",
            name="phone_number",
        ),
    ]
