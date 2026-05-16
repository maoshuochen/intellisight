# IntelliSight Database

Supabase is the source of truth for the new TypeScript implementation.

Apply migrations in order from `supabase/migrations` in a hosted Supabase SQL editor or through the Supabase CLI if you choose to add local Supabase later.

The app uses:

- Supabase Auth for sessions.
- Postgres tables in `public`.
- RLS policies rooted in `project_members`.
- Fastify as the only business data access layer.
