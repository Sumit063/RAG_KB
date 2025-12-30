from django.conf import settings
import chromadb


_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
_collection = _client.get_or_create_collection(
    name='kb_chunks',
    metadata={'hnsw:space': 'cosine'},
)


def upsert_chunks(ids, embeddings, documents, metadatas):
    if not ids:
        return
    _collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


def query(question_embedding, top_k: int, where: dict | None = None):
    kwargs = {}
    if where:
        kwargs['where'] = where
    results = _collection.query(
        query_embeddings=[question_embedding],
        n_results=top_k,
        include=['documents', 'metadatas', 'distances'],
        **kwargs,
    )
    documents = results.get('documents', [[]])
    metadatas = results.get('metadatas', [[]])
    distances = results.get('distances', [[]])
    return {
        'documents': documents[0] if documents else [],
        'metadatas': metadatas[0] if metadatas else [],
        'distances': distances[0] if distances else [],
    }


def delete_chunks(ids):
    if ids:
        _collection.delete(ids=ids)
