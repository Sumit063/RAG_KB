# RAG Knowledge Base (Django API + React UI)

Production-style Django backend with a separate React UI. Authenticated users upload documents, index them with background jobs, and ask questions over the indexed corpus with citations.

## Repo layout

- backend/ - Django API, Celery worker, and Docker setup
- frontend/ - React UI (Vite + Mantine)

## Backend setup (Docker)

```bash
cd backend
cp .env.example .env
# Set OPENAI_API_KEY in backend/.env

docker compose up --build
```

Run migrations and create a user:

```bash
docker compose run --rm web python manage.py migrate
docker compose run --rm web python manage.py createsuperuser
```

API runs at http://localhost:8000

## Backend setup (local)

```bash
cd backend
python -m venv .venv
# Windows
.\.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate

python -m pip install -r requirements.txt
```

Update backend/.env with local paths and Redis:

```
OPENAI_API_KEY=your-openai-key
CHROMA_PATH=./chroma_store
SQLITE_PATH=./db/db.sqlite3
MEDIA_ROOT=./media
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
STORE_UPLOADS_ON_DISK=1
ENABLE_REINDEX=1
```

Diskless mode (no file storage): set

```
STORE_UPLOADS_ON_DISK=0
ENABLE_REINDEX=0
DISCARD_RAW_TEXT_AFTER_INDEX=1
```

Run migrations and start services:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

In another terminal (same venv):

```bash
celery -A rag_kb worker -l info -P solo
```

## Frontend setup (React UI)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

The Vite dev server proxies `/api` and `/media` to http://localhost:8000. If you are not using the proxy, set `VITE_API_BASE_URL` in `frontend/.env`.

## Auth and tokens

The UI uses DRF token auth via:

```
POST /api/token/
```

Example:

```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

## API examples

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

Check job status (job_id is the Celery task ID returned by /index/):

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

- RAG guardrail: if the retrieved context is insufficient, the model responds exactly:
  "I don't have enough information in the indexed documents."
- Vector store is local ChromaDB at `CHROMA_PATH`.

## Optional: pgvector later

You can replace ChromaDB with PostgreSQL + pgvector by:

1) Add a Postgres service to backend/docker-compose.yml
2) Replace backend/kb/services/vector_store.py with pgvector queries
3) Update backend/.env and settings to point at Postgres
