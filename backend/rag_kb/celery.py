import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rag_kb.settings')

app = Celery('rag_kb')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
