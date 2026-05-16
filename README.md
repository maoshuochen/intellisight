# IntelliSight

IntelliSight is being rebuilt as a full-stack TypeScript MVP for interview text processing in user research.

The legacy Vue + Flask prototype is still available in `frontend/` and `backend/` for reference. The new implementation lives in:

- `apps/web` - React + TypeScript + Vite workspace UI
- `apps/api` - Fastify + TypeScript business API
- `packages/shared` - shared Zod schemas and DTO types
- `packages/db` - Supabase database notes
- `supabase/migrations` - Postgres schema, indexes, triggers, and RLS policies
- `scripts/migrate-sqlite-to-supabase.ts` - SQLite legacy data migration

## Setup

Install dependencies:

```sh
npm install
```

Create a hosted Supabase project, then run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor.

Copy environment files:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Fill in:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- optional `AI_API_BASE`, `AI_API_KEY`, `AI_MODEL`

## Development

```sh
npm run dev
```

The API runs on `http://localhost:5000`; the web app runs on `http://localhost:3000`.

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
npm run build
npm run test
```

## Architecture Notes

- Supabase Auth owns sessions.
- Supabase Postgres stores research data.
- RLS is rooted in `project_members`.
- The frontend uses Supabase only for login/session handling.
- All business data access goes through Fastify with the user's JWT.
- AI calls use an OpenAI-compatible provider and fall back to rule-based recommendations when no API key is configured.
