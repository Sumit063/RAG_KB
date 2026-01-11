from django.db import connection
from pgvector.django import CosineDistance

from ..models import Chunk


def uses_pgvector() -> bool:
    return connection.vendor == 'postgresql'


def upsert_chunks(ids, embeddings, documents, metadatas):
    # Embeddings are persisted directly on Chunk rows.
    return


def query(question_embedding, top_k: int, where: dict | None = None):
    qs = Chunk.objects.select_related('document').exclude(embedding__isnull=True)
    if where:
        doc_filter = where.get('doc_id')
        if isinstance(doc_filter, dict) and '$in' in doc_filter:
            qs = qs.filter(document_id__in=list(doc_filter['$in']))

    qs = qs.annotate(distance=CosineDistance('embedding', question_embedding)).order_by('distance')[:top_k]

    documents = []
    metadatas = []
    distances = []

    for chunk in qs:
        document = chunk.document
        filename = document.original_filename
        if not filename:
            filename = document.file.name if document.file else 'unknown'
        documents.append(chunk.text)
        metadatas.append({
            'doc_id': document.id,
            'doc_title': document.title,
            'doc_filename': filename,
            'chunk_index': chunk.chunk_index,
        })
        distances.append(float(chunk.distance))

    return {
        'documents': documents,
        'metadatas': metadatas,
        'distances': distances,
    }


def delete_chunks(ids):
    if ids:
        Chunk.objects.filter(vector_id__in=ids).delete()
