from celery import shared_task
from celery import current_task
from django.utils import timezone

from .models import Document, IndexJob
@shared_task
def index_document_task(document_id):
    from .rag_core import index_document

    doc = Document.objects.get(pk=document_id)
    job = IndexJob.objects.create(
        document=doc,
        status=IndexJob.Status.PENDING,
        celery_task_id=current_task.request.id,
    )
    try:
        job.status = IndexJob.Status.RUNNING
        job.started_at = timezone.now()
        job.save(update_fields=['status', 'started_at'])

        doc.status = Document.Status.INDEXING
        doc.error_message = None
        doc.save(update_fields=['status', 'error_message'])

        index_document(doc)

        job.status = IndexJob.Status.DONE
        job.finished_at = timezone.now()
        job.save(update_fields=['status', 'finished_at'])

        doc.status = Document.Status.INDEXED
        doc.save(update_fields=['status'])
    except Exception as exc:
        job.status = IndexJob.Status.FAILED
        job.error_message = str(exc)
        job.finished_at = timezone.now()
        job.save(update_fields=['status', 'error_message', 'finished_at'])

        doc.status = Document.Status.FAILED
        doc.error_message = str(exc)
        doc.save(update_fields=['status', 'error_message'])
        raise

    return job.id
