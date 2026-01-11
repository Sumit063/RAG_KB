#!/usr/bin/env sh
set -e

echo "[entrypoint] Starting web process"
if [ -n "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] DATABASE_URL is set"
else
  echo "[entrypoint] DATABASE_URL is not set"
fi

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[entrypoint] Running migrations"
  python manage.py migrate --noinput
else
  echo "[entrypoint] Skipping migrations"
fi

if [ -n "${DJANGO_SUPERUSER_USERNAME:-}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]; then
  echo "[entrypoint] Ensuring demo superuser exists"
  python manage.py shell <<'PY'
import os
from django.contrib.auth import get_user_model

User = get_user_model()
username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
email = os.environ.get("DJANGO_SUPERUSER_EMAIL") or ""

if username and password and not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
PY
fi

exec "$@"
