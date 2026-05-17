import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

function createDemoSupabaseClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: new Error("Demo mode does not require sign in.") }),
      signUp: async () => ({ data: { session: null, user: null }, error: new Error("Demo mode does not require sign up.") }),
      signOut: async () => ({ error: null })
    }
  } as unknown as SupabaseClient;
}

export const supabase = env.demoMode ? createDemoSupabaseClient() : createClient(env.supabaseUrl, env.supabaseAnonKey);
