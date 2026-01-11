from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token

from .views_api import AskView, DocumentDetailView, DocumentIndexView, DocumentListCreateView, IndexJobDetailView

urlpatterns = [
    path('token/', obtain_auth_token, name='api_token'),
    path('docs/', DocumentListCreateView.as_view(), name='api_docs'),
    path('docs/<int:pk>/', DocumentDetailView.as_view(), name='api_doc_detail'),
    path('docs/<int:pk>/index/', DocumentIndexView.as_view(), name='api_doc_index'),
    path('jobs/<str:job_id>/', IndexJobDetailView.as_view(), name='api_job_detail'),
    path('ask/', AskView.as_view(), name='api_ask'),
]
