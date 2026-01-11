from django.contrib.auth.views import LogoutView
from django.urls import path

from .views_ui import UserLoginView, ask_view, dashboard, doc_detail, profile_view, root_redirect, settings_view

urlpatterns = [
    path('', root_redirect, name='root'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('dashboard/', dashboard, name='dashboard'),
    path('docs/<int:doc_id>/', doc_detail, name='doc_detail'),
    path('ask/', ask_view, name='ask'),
    path('profile/', profile_view, name='profile'),
    path('settings/', settings_view, name='settings'),
]
