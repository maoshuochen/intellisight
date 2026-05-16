# IntelliSight

IntelliSight is a full-stack TypeScript MVP for interview analysis in user research. The main product flow is the Analysis Workspace: transcript reading, AI-assisted coding, highlights, canvas synthesis, and lightweight report export.

The legacy Vue + Flask prototype is still available in `frontend/` and `backend/` for reference. The new implementation lives in:

- `apps/web` - React + TypeScript + Vite workspace UI
- `apps/api` - Fastify + TypeScript business API
- `packages/shared` - shared Zod schemas and DTO types
- `packages/shared/src/database.types.ts` - Supabase database types used by the API client
- `supabase/migrations` - Postgres schema, indexes, triggers, and RLS policies
- `scripts/migrate-sqlite-to-supabase.ts` - SQLite legacy data migration

## Setup

Install dependencies:

```sh
npm install
```

Create a hosted Supabase project, then run the SQL files in `supabase/migrations` in order:

1. `001_initial_schema.sql`
2. `002_fix_project_rls_policies.sql`
3. `003_remove_recursive_project_member_policies.sql`
4. `004_reporting_and_query_indexes.sql`

Copy environment files:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Fill in:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env` only
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` in `apps/web/.env`
- optional `AI_API_BASE`, `AI_API_KEY`, `AI_MODEL`

If a service role key has ever been pasted into chat, screenshots, or logs, rotate it in Supabase before using the project outside local development.

## Development

```sh
npm run dev
```

The API runs on `http://localhost:5000` by default; the web app runs on `http://localhost:3000`. If macOS is using port 5000, set `PORT=5050` in `apps/api/.env` and `VITE_API_BASE_URL=http://localhost:5050/api` in `apps/web/.env`.

## Legacy SQLite Migration

After applying the Supabase schema, migrate the existing sample SQLite data:

```sh
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
MIGRATION_OWNER_USER_ID=<auth-user-uuid> \
npm run migrate:sqlite
```

Optional:

```sh
SQLITE_PATH=backend/database.db
MIGRATION_PROJECT_NAME="Legacy IntelliSight Project"
```

## Verification

```sh
npm run typecheck
npm run lint
npm run build
npm run test
npm audit --audit-level=moderate
```

The API test suite includes:

- deterministic AI fallback unit tests
- an opt-in Supabase-backed integration test that creates a temporary user/project, calls the AI/report APIs, verifies `ai_suggestions`, and cleans up

Run the networked Supabase integration test explicitly:

```sh
RUN_SUPABASE_INTEGRATION=true npm run test
```

## Database Types

The checked-in `packages/shared/src/database.types.ts` keeps the Fastify Supabase client typed. Refresh it from Supabase after schema changes:

```sh
SUPABASE_PROJECT_ID=<your-project-ref> npm run db:types
```

## Architecture Notes

- Supabase Auth owns sessions.
- Supabase Postgres stores research data.
- RLS is rooted in `project_members`.
- The frontend uses Supabase only for login/session handling.
- All business data access goes through Fastify with the user's JWT.
- AI calls use an OpenAI-compatible provider and fall back to rule-based recommendations when no API key is configured.
- AI output is stored in `ai_suggestions` for review, fallback visibility, and auditability.
- Reports are intentionally lightweight Markdown exports generated from saved highlights and code usage.
