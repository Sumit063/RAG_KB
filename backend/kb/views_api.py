from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Document, IndexJob
from .serializers import DocumentCreateSerializer, DocumentSerializer, IndexJobSerializer
from .services import parsers, vector_store
from .tasks import index_document_task


def _parse_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}


def _parse_doc_ids(value):
    if value is None or value == '':
        return None
    if isinstance(value, list):
        try:
            return [int(item) for item in value]
        except (TypeError, ValueError):
            return None
    if isinstance(value, str):
        parts = [item.strip() for item in value.split(',') if item.strip()]
        if not parts:
            return None
        try:
            return [int(item) for item in parts]
        except ValueError:
            return None
    return None


class DocumentListCreateView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request):
        docs = Document.objects.order_by('-created_at')
        serializer = DocumentSerializer(docs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        title = request.data.get('title', '').strip()
        file_obj = request.FILES.get('file')
        if not title or not file_obj:
            return Response({'detail': 'title and file are required'}, status=status.HTTP_400_BAD_REQUEST)

        if settings.STORE_UPLOADS_ON_DISK:
            serializer = DocumentCreateSerializer(data=request.data)
            if serializer.is_valid():
                doc = serializer.save(original_filename=file_obj.name)
                output = DocumentSerializer(doc, context={'request': request}).data
                return Response(output, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            raw_text = parsers.load_text_from_file(file_obj, file_obj.name)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        doc = Document.objects.create(
            title=title,
            original_filename=file_obj.name,
            raw_text=raw_text,
        )
        output = DocumentSerializer(doc, context={'request': request}).data
        return Response(output, status=status.HTTP_201_CREATED)


class DocumentDetailView(APIView):
    def get(self, request, pk):
        doc = get_object_or_404(Document, pk=pk)
        serializer = DocumentSerializer(doc, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, pk):
        doc = get_object_or_404(Document, pk=pk)
        chunk_ids = list(doc.chunks.values_list('vector_id', flat=True))
        try:
            if chunk_ids:
                vector_store.delete_chunks(chunk_ids)
        except Exception:
            return Response(
                {'detail': 'Failed to delete document from vector store.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        if doc.file:
            doc.file.delete(save=False)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentIndexView(APIView):
    def post(self, request, pk):
        doc = get_object_or_404(Document, pk=pk)
        if not settings.ENABLE_REINDEX and doc.status == Document.Status.INDEXED:
            return Response({'detail': 'Reindexing is disabled.'}, status=status.HTTP_400_BAD_REQUEST)
        if not doc.raw_text and not doc.file:
            return Response({'detail': 'No source text available for indexing.'}, status=status.HTTP_400_BAD_REQUEST)
        async_result = index_document_task.delay(doc.id)
        return Response({'job_id': async_result.id, 'status': 'PENDING'})


class IndexJobDetailView(APIView):
    def get(self, request, job_id):
        job = IndexJob.objects.filter(celery_task_id=job_id).first()
        if not job and job_id.isdigit():
            job = IndexJob.objects.filter(pk=int(job_id)).first()
        if not job:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = IndexJobSerializer(job)
        return Response(serializer.data)


class AskView(APIView):
    @method_decorator(ratelimit(key='user', rate='60/m', block=True))
    def post(self, request):
        question = request.data.get('question', '').strip()
        if not question:
            return Response({'detail': 'question is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            top_k = int(request.data.get('top_k') or 0) or None
        except ValueError:
            return Response({'detail': 'top_k must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

        if top_k is not None and top_k <= 0:
            return Response({'detail': 'top_k must be positive'}, status=status.HTTP_400_BAD_REQUEST)

        from .rag_core import answer_question

        explain = _parse_bool(request.data.get('explain'))
        doc_ids = _parse_doc_ids(request.data.get('doc_ids'))
        if request.data.get('doc_ids') is not None and doc_ids is None:
            return Response({'detail': 'doc_ids must be a list of integers'}, status=status.HTTP_400_BAD_REQUEST)

        result = answer_question(question, top_k=top_k, doc_ids=doc_ids, explain=explain)
        return Response(result)
