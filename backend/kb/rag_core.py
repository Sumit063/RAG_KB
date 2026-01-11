import hashlib
import re
import time
from typing import List

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Chunk, Document
from .services import chunking, guardrails, llm_client, parsers, vector_store


def _chunk_vector_id(doc_id: int, chunk_index: int, chunk_text: str) -> str:
    digest = hashlib.sha256(f"{doc_id}:{chunk_index}:{chunk_text}".encode('utf-8')).hexdigest()
    return digest[:32]


def _batch_iter(items: List[str], batch_size: int):
    for i in range(0, len(items), batch_size):
        yield items[i:i + batch_size]


def index_document(document: Document) -> dict:
    if document.raw_text:
        text = document.raw_text
    elif document.file:
        text = parsers.load_text(document.file.path)
    else:
        raise ValueError('No source text available for indexing.')
    chunks = chunking.chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)

    existing_ids = list(document.chunks.values_list('vector_id', flat=True))
    if existing_ids:
        vector_store.delete_chunks(existing_ids)
        document.chunks.all().delete()

    chunk_records = []
    ids = []
    documents = []
    metadatas = []

    for idx, chunk_text in enumerate(chunks):
        vector_id = _chunk_vector_id(document.id, idx, chunk_text)
        ids.append(vector_id)
        documents.append(chunk_text)
        filename = document.original_filename or (document.file.name if document.file else 'unknown')
        metadatas.append({
            'doc_id': document.id,
            'doc_title': document.title,
            'doc_filename': filename,
            'chunk_index': idx,
        })
        chunk_records.append(Chunk(
            document=document,
            chunk_index=idx,
            text=chunk_text,
            vector_id=vector_id,
        ))

    if ids:
        for batch_docs, batch_ids, batch_metas in zip(
            _batch_iter(documents, 64),
            _batch_iter(ids, 64),
            _batch_iter(metadatas, 64),
        ):
            batch_embeddings = llm_client.embed_texts(batch_docs)
            vector_store.upsert_chunks(batch_ids, batch_embeddings, batch_docs, batch_metas)

    with transaction.atomic():
        if chunk_records:
            Chunk.objects.bulk_create(chunk_records)

        document.status = Document.Status.INDEXED
        document.chunks_count = len(chunk_records)
        document.last_indexed_at = timezone.now()
        document.error_message = None
        if settings.DISCARD_RAW_TEXT_AFTER_INDEX and document.raw_text:
            document.raw_text = None
            document.save(update_fields=['status', 'chunks_count', 'last_indexed_at', 'error_message', 'raw_text'])
        else:
            document.save(update_fields=['status', 'chunks_count', 'last_indexed_at', 'error_message'])

    return {'chunks': len(chunk_records)}


def retrieve(
    question: str,
    top_k: int | None = None,
    doc_ids: list[int] | None = None,
    with_trace: bool = False,
):
    top_k = top_k or settings.TOP_K_DEFAULT
    trace_steps = []
    where = None

    if doc_ids is not None:
        if not doc_ids:
            hits = []
            if with_trace:
                trace_steps.append({
                    'name': 'Document filter',
                    'ms': 0.0,
                    'detail': 'no documents selected',
                })
                return hits, {
                    'top_k': top_k,
                    'hits': len(hits),
                    'steps': trace_steps,
                    'doc_ids': [],
                }
            return hits
        where = {'doc_id': {'$in': doc_ids}}
        trace_steps.append({
            'name': 'Document filter',
            'ms': 0.0,
            'detail': f"doc_ids={','.join(str(doc_id) for doc_id in doc_ids)}",
        })

    embed_start = time.perf_counter()
    embedding = llm_client.embed_texts([question])[0]
    embed_end = time.perf_counter()
    trace_steps.append({
        'name': 'Embed question',
        'ms': round((embed_end - embed_start) * 1000, 2),
        'detail': f"model={settings.EMBED_MODEL}",
    })

    query_start = time.perf_counter()
    results = vector_store.query(embedding, top_k, where=where)
    query_end = time.perf_counter()
    trace_steps.append({
        'name': 'Vector search',
        'ms': round((query_end - query_start) * 1000, 2),
        'detail': f"top_k={top_k}",
    })

    assemble_start = time.perf_counter()
    hits = []
    for doc, meta, distance in zip(results['documents'], results['metadatas'], results['distances']):
        hits.append({
            'text': doc,
            'doc_title': meta.get('doc_title'),
            'filename': meta.get('doc_filename'),
            'chunk_index': meta.get('chunk_index'),
            'score': distance,
        })
    assemble_end = time.perf_counter()
    trace_steps.append({
        'name': 'Assemble hits',
        'ms': round((assemble_end - assemble_start) * 1000, 2),
        'detail': f"hits={len(hits)}",
    })

    if with_trace:
        return hits, {
            'top_k': top_k,
            'hits': len(hits),
            'steps': trace_steps,
            'doc_ids': doc_ids,
        }

    return hits


def answer_question(
    question: str,
    top_k: int | None = None,
    doc_ids: list[int] | None = None,
    explain: bool = False,
) -> dict:
    total_start = time.perf_counter()
    trace = None
    if explain:
        hits, trace = retrieve(question, top_k=top_k, doc_ids=doc_ids, with_trace=True)
    else:
        hits = retrieve(question, top_k=top_k, doc_ids=doc_ids)

    if not hits:
        result = {
            'answer': guardrails.REFUSAL_TEXT,
            'sources': [],
        }
        if explain and trace is not None:
            trace['steps'].append({
                'name': 'Guardrail refusal',
                'ms': 0.0,
                'detail': 'no relevant context',
            })
            trace['total_ms'] = round((time.perf_counter() - total_start) * 1000, 2)
            result['trace'] = trace
        return result

    context_start = time.perf_counter()
    context = guardrails.build_context(hits)
    context_end = time.perf_counter()
    system_prompt = guardrails.system_prompt()
    user_prompt = guardrails.user_prompt(question, context)

    llm_start = time.perf_counter()
    answer = llm_client.chat_complete(system_prompt, user_prompt)
    llm_end = time.perf_counter()
    if not answer:
        answer = guardrails.REFUSAL_TEXT
    if answer != guardrails.REFUSAL_TEXT and not re.search(r'\[\d+\]', answer):
        answer = f"{answer} [1]"

    sources_start = time.perf_counter()
    sources = []
    for idx, hit in enumerate(hits, start=1):
        sources.append({
            'citation': idx,
            'doc_title': hit['doc_title'],
            'filename': hit['filename'],
            'chunk_index': hit['chunk_index'],
            'text': hit['text'],
            'score': hit['score'],
        })
    sources_end = time.perf_counter()

    result = {
        'answer': answer,
        'sources': sources,
    }

    if explain and trace is not None:
        trace['steps'].extend([
            {
                'name': 'Build context',
                'ms': round((context_end - context_start) * 1000, 2),
                'detail': f"chunks={len(hits)}",
            },
            {
                'name': 'LLM answer',
                'ms': round((llm_end - llm_start) * 1000, 2),
                'detail': f"model={settings.CHAT_MODEL}",
            },
            {
                'name': 'Assemble sources',
                'ms': round((sources_end - sources_start) * 1000, 2),
                'detail': f"sources={len(sources)}",
            },
        ])
        trace['total_ms'] = round((time.perf_counter() - total_start) * 1000, 2)
        result['trace'] = trace

    return result
