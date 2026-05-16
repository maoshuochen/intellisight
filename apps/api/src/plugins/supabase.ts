import { createClient } from "@supabase/supabase-js";
import fp from "fastify-plugin";
import { env } from "../config/env.js";

export type SupabaseClient = ReturnType<typeof createClient<any>>;

declare module "fastify" {
  interface FastifyInstance {
    supabase: SupabaseClient;
  }
}

export const supabasePlugin = fp(async (app) => {
  const supabase = createClient<any>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  app.decorate("supabase", supabase);
});
