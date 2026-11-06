# MediVerify AI — Clinical RAG Guard

Live research demo: https://mediverify-ai-lemon.vercel.app

Deployed API: https://mediverify-research-api.vercel.app · [Interactive API docs](https://mediverify-research-api.vercel.app/docs)

The current hosted deployment uses a connected **Neon PostgreSQL Free** database and a stable server-side session secret. Records are shared across Vercel instances. The SQLite warning below applies only to deployments without DATABASE_URL.

A functional clinical research evidence workspace with Next.js, React, TypeScript, FastAPI, SQLAlchemy, and eight-node LangGraph orchestration. Upload sources, retrieve passages, generate an evidence-constrained answer, inspect claims, remove unsupported statements, recheck the result, and export a report.

**Research and teaching only. No diagnosis, clinical validation, or patient data.** Bundled studies are fictional and labeled synthetic. Source attribution is not proof of medical truth. Confidence is a system estimate, not a clinical probability.

## Local execution

Requires Python 3.12+ and Node 22+.

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend/requirements.txt
cd backend
..\.venv\Scripts\python -m uvicorn app:app --reload --port 8000
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. Choose **Open demo workspace**, or register using a password of at least ten characters. Each demo session creates an isolated workspace with five synthetic studies. Select a scenario in Clinical AI Workspace to demonstrate a deliberately false initial statement, detection, correction, and final rechecking. No paid model key is needed.

Set environment variables using `.env.example` as a template. The app does not automatically load that file. SQLite persists local data. Set a stable random `JWT_SECRET` to preserve sessions across process restarts. For Docker, set JWT_SECRET and run `docker compose up --build`; a named volume persists local database records.

## Implemented workflows

- Registration, login/logout, salted PBKDF2 password hashing, expiring signed HTTP-only cookies, researcher role, ownership-based authorization.
- Landing, login, registration, dashboard, AI workspace, evidence library/upload, RAG Explorer, detector, verification, correction, history, reports, analytics, audit, settings, and profile.
- PDF, DOCX, TXT, CSV, JSON extraction; file/expansion/page limits; chunking, preview, delete, and re-index.
- BM25 and hashed lexical vectors, reciprocal-rank fusion, deduplication, lightweight reranking; optional Sentence Transformers, cross-encoder, and NLI models.
- Eight real LangGraph nodes with bounded conditional correction, provider retries, actual SSE completion events, saved structured outputs and traces.
- Exact-source, numerical, negation, and citation checks. Similarity alone never marks a claim supported. Unsupported statements are removed and final claims are verified again.
- Source-linked evidence inspection, before/after comparison, real-record analytics, audit logs, PDF reports, and formula-safe CSV exports.

## Structure and architecture

```text
frontend/              Next.js App Router, reusable UI, API client, types, tests
backend/               FastAPI, security, SQLAlchemy models, parsing, LangGraph
  tests/               Auth, isolation, formats, RAG, claims, correction, exports
  alembic/             Initial migration
sample_data/           Synthetic documents, queries, evaluation cases
docs/                  Architecture, API, pipeline, agents, deployment
docker-compose.yml
.env.example
```

Next.js proxies same-origin `/api` requests to FastAPI. Users own documents and queries; chunks, claims, evidence, corrections, executions, and audit events are normalized SQLAlchemy records. Completed assessments retain source snapshots so historical evidence remains inspectable after document deletion.

LangGraph executes query understanding → hybrid retrieval/reranking → generation → claim extraction → verification → hallucination detection → correction → final validation, with a maximum of three correction iterations. The demo quotes evidence; configured provider responses are constrained to retrieved excerpts. Retrieved documents are untrusted data, never system instructions. Final outputs are persisted; resumable mid-run checkpoints are not implemented.

## Environment

Core: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `BACKEND_URL`, `DEMO_MODE`. Frontend BACKEND_URL is read at build time; rebuild after changing it. Backend-only optional provider settings: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `LLM_MODEL`. Set DEMO_MODE=false and a strong secret to enable provider generation. No model credits are purchased automatically.

Install `backend/requirements-ml.txt` before setting `EMBEDDING_MODEL`, `CROSS_ENCODER_MODEL`, or `NLI_MODEL`. These optional models need downloads and substantial memory; they are not configured in the lightweight hosted demo. Default vectors are hashed lexical features, not medical semantic embeddings.

Supabase PostgreSQL is supported through a pooled DATABASE_URL. **Supabase Auth, Supabase Storage, pgvector, and FAISS are not wired into the default runtime.** Authentication uses first-party sessions; vectors use SQL JSON storage and in-process ranking. Reserved Supabase environment placeholders do not imply an active integration.

## Tests and evaluation

```powershell
.\.venv\Scripts\python -m pytest backend/tests -q
cd frontend
npm test
npm run typecheck
npm run build
npm audit
```

Run `python evaluate.py` from backend for deterministic synthetic retrieval/detection evaluation. The suite covers all five full scenarios, auth/isolation, all five document formats, corrupt/oversized files, numerical errors, negation, fabricated citations, insufficient evidence, SSE, audit persistence, PDF/CSV exports, and frontend API failures. Fixture scores are not clinical accuracy measurements.

## Deployment

Deploy backend/ as Vercel FastAPI and frontend/ as Vercel Next.js. Set frontend BACKEND_URL to the backend production origin, backend FRONTEND_URL to the frontend origin, and a stable backend JWT_SECRET. Set a pooled PostgreSQL DATABASE_URL for durable serverless data. See [deployment guide](docs/deployment.md), [architecture](docs/architecture.md), [API](docs/api_documentation.md), [pipeline](docs/rag_pipeline.md), and [agent workflow](docs/agent_workflow.md). API OpenAPI documentation is at backend `/docs`.

## Limitations and future work

- Hosted SQLite is ephemeral demonstration storage. Cold starts/scaling/deployments can reset or fragment records. A fresh demo session may be needed. PostgreSQL is required for durability; no paid resources were provisioned.
- Email verification, password reset, administrator management, Supabase Auth/Storage, and production vector indexing remain future work.
- Rule-based checks can miss subtle contradictions, causal errors, paraphrases, and adversarial content. Exact quotes establish attribution only. Qualified clinical review remains required.
- No OCR; non-PDF sources use logical page 1. Uploads are capped at 4 MB and 150 PDF pages. Hosted multipart limits can be lower.
- Retrieval scans bounded user workspaces and loads optional models on demand. Large-scale retrieval, durable graph checkpoints, distributed rate limiting, monitoring, backups, compliance review, and clinical validation are not production-ready.
- Source provenance analytics is not source reliability. No dashboard data is presented as a measured clinical outcome.

Screenshots: capture landing, dashboard, evidence inspection, and correction from your deployment; no mock screenshot is represented as a verified live execution.
