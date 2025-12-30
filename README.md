# Django RAG Knowledge Base Assistant (API + UI)

Production-style Django app where authenticated users upload documents, index them with background jobs, and ask questions over the indexed corpus with citations.

## Prerequisites

- Install Docker Desktop (includes Docker Compose). On Windows, enable WSL2 when prompted.
- Verify it works:

```bash
docker --version
docker compose version
```

## Quick start (Docker)

1) Copy env file

```bash
cp .env.example .env
```

2) Ensure `.env` includes `SQLITE_PATH=/app/db/db.sqlite3` (default in the example).

2) Build and start services

```bash
docker-compose up --build
```

If your Docker uses the new syntax, use:

```bash
docker compose up --build
```

3) Run migrations and create a superuser

```bash
docker-compose run --rm web python manage.py migrate
docker-compose run --rm web python manage.py createsuperuser
```

Or with new syntax:

```bash
docker compose run --rm web python manage.py migrate
docker compose run --rm web python manage.py createsuperuser
```

If you prefer to keep the containers running, use `exec` instead:

```bash
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py createsuperuser
```

4) Open the UI

- http://localhost:8000/login/

## Token auth behavior in the UI

This app creates a DRF token on first login and exposes it in templates as `window.API_TOKEN` so UI fetch calls can include:

```
Authorization: Token ${window.API_TOKEN}
```

This is for demo simplicity. In production, avoid exposing tokens to the browser.

## API examples

Create token (if you prefer manually):

```bash
docker-compose run --rm web python manage.py drf_create_token <username>
```

Upload a document:

```bash
curl -X POST http://localhost:8000/api/docs/ \
  -H "Authorization: Token <token>" \
  -F "title=My Doc" \
  -F "file=@/path/to/file.pdf"
```

List documents:

```bash
curl -H "Authorization: Token <token>" http://localhost:8000/api/docs/
```

Trigger indexing:

```bash
curl -X POST -H "Authorization: Token <token>" \
  http://localhost:8000/api/docs/1/index/
```

Check job status (ID is the Celery task ID returned by /index/):

```bash
curl -H "Authorization: Token <token>" http://localhost:8000/api/jobs/<job_id>/
```

Ask a question:

```bash
curl -X POST http://localhost:8000/api/ask/ \
  -H "Authorization: Token <token>" \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the policy?","top_k":6}'
```

## Notes

- RAG guardrail: if the retrieved context is insufficient, the model must respond exactly:
  "I don’t have enough information in the indexed documents."
- Vector store is local ChromaDB at `CHROMA_PATH`.

## Optional: pgvector later

You can replace ChromaDB with PostgreSQL + pgvector by:

1) Add a Postgres service to `docker-compose.yml`
2) Replace `kb/services/vector_store.py` with pgvector queries
3) Update `.env` and settings to point at Postgres
