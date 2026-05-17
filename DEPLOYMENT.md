Deployment guide
================

This project contains a Vite frontend (`artifacts/leafline`) and an Express API (`artifacts/api-server`) backed by Postgres (Drizzle ORM).

Recommended production setup
-----------------------------
- Frontend: deploy to Vercel (static, Vite). Set `VITE_API_BASE_URL` to your API URL.
- API: deploy to Render, Railway, or similar (long‑running Node service). Use an external Postgres (Supabase/Railway).

Quick steps
-----------
1. Push this repo to GitHub.
2. Provision a Postgres database (Supabase / Railway / Render) and copy the `DATABASE_URL`.
3. Run migrations and seed (locally or in CI):

```bash
# from repo root (example)
DATABASE_URL="<YOUR_DB_URL>" pnpm --filter @workspace/db run push
DATABASE_URL="<YOUR_DB_URL>" pnpm --filter @workspace/scripts run seed:plants
```

4. Deploy API to Render (example):
   - Root directory: `artifacts/api-server`
   - Build command: `pnpm install && pnpm --filter @workspace/api-server run build`
   - Start command: `node --enable-source-maps ./dist/index.mjs`
   - Set env vars: `DATABASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

5. Deploy frontend to Vercel:
   - Root directory: `artifacts/leafline`
   - Build: `pnpm install && pnpm run build`
   - Output directory: `dist`
   - Set env var: `VITE_API_BASE_URL` → API URL from step 4.

Automation (CI)
---------------
- See `.github/workflows/ci-deploy.yml`. It will run drizzle `push` and the seed script using `secrets.DATABASE_URL` on push to `main`. It can also optionally deploy the frontend to Vercel using `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.

Local dev helper
-----------------
- `./scripts/dev-local.sh` will start a local Postgres (docker), run migrations + seed, start the API in background, then start the frontend in the foreground. Run:

```bash
./scripts/dev-local.sh
```

Notes & troubleshooting
-----------------------
- If the frontend shows "No plants found": ensure API is running and `VITE_API_BASE_URL` is set to the API URL. The frontend reads `import.meta.env.VITE_API_BASE_URL || window.location.origin`.
- For CI deployment, add required secrets to GitHub repo settings: `DATABASE_URL`, and (optionally) `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

If you'd like, I can:
- Generate a Render `service.yaml` or Dockerfile for the API so you can deploy with a single click, or
- Create a GitHub Action to call Render's API to trigger a deploy (requires your Render API key).

Tell me which provider you prefer for the API (Render, Railway, Supabase), and I will generate provider-specific deploy steps or config.
