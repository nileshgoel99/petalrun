from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import HIDDEN_ADMIN_USERNAME, MAX_FREE_USERS
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    UpgradeRequestSerializer,
    UserSerializer,
    active_user_count,
    counted_users_qs,
    signup_status,
)


def seat_limit_response():
    payload = signup_status()
    payload["upgrade_required"] = True
    payload["detail"] = (
        f"Free plan allows {MAX_FREE_USERS} users. "
        "Request an upgrade to add more team members."
    )
    return Response(payload, status=status.HTTP_403_FORBIDDEN)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def signup_info(request):
    return Response({"brand": "Fleurish & Co.", "max_free_users": MAX_FREE_USERS, **signup_status()})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    if active_user_count() >= MAX_FREE_USERS:
        return seat_limit_response()

    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        user, token = serializer.save()
    except Exception:
        # Race: another signup filled the last seat.
        if active_user_count() >= MAX_FREE_USERS:
            return seat_limit_response()
        raise

    return Response(
        {
            "token": token.key,
            "user": UserSerializer(user).data,
            **signup_status(),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data["user"]
    token, _ = Token.objects.get_or_create(user=user)
    user_data = UserSerializer(user).data
    if user.username.lower() == HIDDEN_ADMIN_USERNAME.lower():
        user_data = {
            **user_data,
            "username": "studio",
            "email": "",
            "first_name": "Studio",
        }
    return Response({"token": token.key, "user": user_data})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response({"detail": "Logged out."})


# Soften /me for hidden admin so the UI doesn't advertise the account name.
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    user_data = UserSerializer(request.user).data
    if request.user.username.lower() == HIDDEN_ADMIN_USERNAME.lower():
        user_data = {
            **user_data,
            "username": "studio",
            "email": "",
            "first_name": "Studio",
        }
    return Response({"user": user_data, **signup_status()})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def request_upgrade(request):
    serializer = UpgradeRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(
        {
            "detail": "Thanks! Fleurish & Co. will contact you about upgrading your team seats.",
            "request": serializer.data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def team_users(request):
    users = counted_users_qs().order_by("date_joined")
    return Response(
        {
            "results": UserSerializer(users, many=True).data,
            **signup_status(),
        }
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_team_user(request):
    """Create a teammate without switching the current session."""
    if active_user_count() >= MAX_FREE_USERS:
        return seat_limit_response()

    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        user, _token = serializer.save()
    except Exception:
        if active_user_count() >= MAX_FREE_USERS:
            return seat_limit_response()
        raise

    return Response(
        {
            "detail": f"User “{user.username}” created.",
            "user": UserSerializer(user).data,
            **signup_status(),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    token = serializer.save()
    return Response(
        {
            "detail": "Password updated.",
            "token": token.key,
            "user": UserSerializer(request.user).data,
        }
    )
