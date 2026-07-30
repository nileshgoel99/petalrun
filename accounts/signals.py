def ensure_hidden_admin_on_migrate(sender, **kwargs):
    from .serializers import ensure_hidden_admin

    ensure_hidden_admin()
