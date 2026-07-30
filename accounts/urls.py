from django.urls import path

from . import views

urlpatterns = [
    path("signup-info/", views.signup_info, name="signup-info"),
    path("register/", views.register, name="register"),
    path("login/", views.login, name="login"),
    path("logout/", views.logout, name="logout"),
    path("me/", views.me, name="me"),
    path("upgrade-request/", views.request_upgrade, name="upgrade-request"),
    path("team/", views.team_users, name="team-users"),
    path("create-user/", views.create_team_user, name="create-team-user"),
    path("change-password/", views.change_password, name="change-password"),
]
