from django.apps import AppConfig


class KbConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'kb'

    def ready(self):
        from django.contrib.auth.signals import user_logged_in
        from django.dispatch import receiver
        from rest_framework.authtoken.models import Token

        @receiver(user_logged_in)
        def ensure_token(sender, user, request, **kwargs):
            Token.objects.get_or_create(user=user)
