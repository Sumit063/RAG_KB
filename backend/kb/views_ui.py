from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.shortcuts import redirect, render
from django.conf import settings
from rest_framework.authtoken.models import Token


class UserLoginView(LoginView):
    template_name = 'kb/login.html'


def _api_token(user):
    token, _ = Token.objects.get_or_create(user=user)
    return token.key


def _app_context(user):
    return {
        'api_token': _api_token(user),
        'username': user.username,
        'is_superuser': user.is_superuser,
        'enable_reindex': settings.ENABLE_REINDEX,
        'store_uploads_on_disk': settings.STORE_UPLOADS_ON_DISK,
    }


def root_redirect(request):
    return redirect('dashboard')


@login_required
def dashboard(request):
    return render(request, 'kb/app.html', _app_context(request.user))


@login_required
def doc_detail(request, doc_id):
    return render(request, 'kb/app.html', _app_context(request.user))


@login_required
def ask_view(request):
    return render(request, 'kb/app.html', _app_context(request.user))


@login_required
def profile_view(request):
    return render(request, 'kb/app.html', _app_context(request.user))


@login_required
def settings_view(request):
    return render(request, 'kb/app.html', _app_context(request.user))
