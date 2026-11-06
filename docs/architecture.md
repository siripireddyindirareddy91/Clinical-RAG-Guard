# Architecture and data model

Next.js App Router → same-origin API rewrite → FastAPI → SQLAlchemy → SQLite locally or configured PostgreSQL. LangGraph orchestrates processing. Every document/query lookup validates ownership. No real patient data is supplied.

Users own Documents and ClinicalQueries. Documents contain DocumentChunks. Queries contain Claims, CorrectionHistory, and AgentExecutions. Claims reference Evidence snapshots. AuditLogs are user-scoped. UUID primary keys, unique emails, indexed lookup/ownership keys, and cascading foreign keys are enabled. JSON stores vectors and structured assessment snapshots. Historical evidence snapshots intentionally survive source deletion.

Run `alembic upgrade head` from backend. Startup also creates initial missing tables for demo convenience. Future production schema changes require explicit Alembic revisions. API keys remain server-side; passwords use salted PBKDF2. Session cookies are HTTP-only, expiring, SameSite=Lax, and Secure on Vercel.
