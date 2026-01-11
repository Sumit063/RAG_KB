from django.db import models


class Document(models.Model):
    class Status(models.TextChoices):
        UPLOADED = 'UPLOADED', 'Uploaded'
        INDEXING = 'INDEXING', 'Indexing'
        INDEXED = 'INDEXED', 'Indexed'
        FAILED = 'FAILED', 'Failed'

    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='docs/', null=True, blank=True)
    original_filename = models.CharField(max_length=255, null=True, blank=True)
    raw_text = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPLOADED)
    chunks_count = models.IntegerField(default=0)
    last_indexed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.status})"


class Chunk(models.Model):
    document = models.ForeignKey(Document, related_name='chunks', on_delete=models.CASCADE)
    chunk_index = models.IntegerField()
    text = models.TextField()
    vector_id = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('document', 'chunk_index')

    def __str__(self):
        return f"Chunk {self.chunk_index} for {self.document_id}"


class IndexJob(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        RUNNING = 'RUNNING', 'Running'
        DONE = 'DONE', 'Done'
        FAILED = 'FAILED', 'Failed'

    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    celery_task_id = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"Job {self.id} for {self.document_id} ({self.status})"
