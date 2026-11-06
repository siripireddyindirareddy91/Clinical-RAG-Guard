# Deployment

## Current verified deployment

- Frontend: https://mediverify-ai-lemon.vercel.app (connected team resume-project3).
- API: https://mediverify-research-api.vercel.app (CLI team resume-projects3).
- Shared database: Neon `mediverify-research`, explicit `free_v3` plan, connected directly to the API project. Connection values are injected by Vercel; no credentials are committed.
- The separate accounts required independent deployments. Git source is pushed to the requested repository; automatic Git-to-Vercel deployment is not connected. Use direct source deployments or connect the appropriate Git integration.
- Concurrent authentication was checked with 16 parallel requests, all successful after switching from SQLite to PostgreSQL.

Deploy `backend/` as a Vercel FastAPI project and `frontend/` as a Next.js project. Vercel loads the exported FastAPI app from app.py. See [official documentation](https://vercel.com/docs/frameworks/backend/fastapi).

1. Backend: set a stable random JWT_SECRET (32+ characters), DEMO_MODE=true, and optionally a pooled PostgreSQL DATABASE_URL. Verify `/api/health`.
2. Frontend: set BACKEND_URL to the verified backend production origin at build time. Deploy and verify the demo flow.
3. Backend: set FRONTEND_URL to the frontend origin. Keep secrets out of frontend environment variables and Git.
4. For durable data, configure PostgreSQL. Supabase's pooled PostgreSQL URL works with SQLAlchemy/psycopg. Check provider free-tier availability before provisioning. No paid infrastructure is created automatically.

If Git integration is unavailable, direct-source deployments are supported; push the same verified source to GitHub. Do not disable deployment protection to work around missing access.

**Ephemeral hosted demo:** without DATABASE_URL, Vercel uses /tmp SQLite. Cold starts, parallel instances, and deployments can reset/fragment data and require a new demo session. A stable signing secret does not make SQLite durable. Local Docker uses a named volume. Production serverless use requires a durable external database.

Optional ML models require extra dependencies, downloads, and adequate RAM. The lightweight Vercel deployment does not load transformer weights. Configured model providers can charge for requests; no paid key is configured by default.

Before healthcare use: verified identity, distributed rate limiting, monitoring, backups, retention policy, security/compliance review, and clinical validation remain necessary. This is a synthetic research demo, not a PHI-ready service.
