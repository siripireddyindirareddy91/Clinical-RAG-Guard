# API reference

Interactive schema: backend `/docs`; OpenAPI JSON: `/openapi.json`.

Auth: POST `/api/auth/register`, `/login`, `/demo`, `/logout`; GET/PATCH `/api/auth/me`.

Documents: POST `/api/documents/upload` (multipart file/title/category/author/publication_year/description); GET `/api/documents`, `/{id}`, `/{id}/chunks`; POST `/{id}/index`; DELETE `/{id}`.

Clinical: POST `/api/clinical/query` or `/query/stream` with question, document_ids, top_k (1–10), max_iterations (1–3), optional draft, demo scenario (0–4). GET `/api/clinical/queries`, `/{id}`; DELETE `/{id}`.

RAG: POST `/api/rag/retrieve`; GET `/api/rag/explore/{id}`. Verification: POST `/api/verification/analyze`; GET `/api/verification/{id}`, `/claims/{id}`. Correction: POST `/api/correction/run` with query_id; GET `/api/correction/history/{id}`.

Dashboard: GET `/api/dashboard/overview`, `/analytics`, `/recent-activity`; GET `/api/audit-logs`. Reports: POST `/api/reports/generate` with query_id and pdf/csv format; GET `/api/reports/{id}/download?format=pdf|csv`. System: GET `/api/health`, `/api/system/status`, `/api/demo/scenarios`.

Errors return structured HTTP 400/401/404/409/413/422/429/502. Stream failures emit error events and never successful result events. Documents/queries enforce workspace/hourly bounds. Production needs distributed account/login abuse controls.
