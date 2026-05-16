import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@intellisight/shared";
import { buildApp } from "../app.js";
import { env } from "../config/env.js";

const hasSupabase = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
type InjectJsonResponse = {
  statusCode: number;
  json: () => any;
};

describe.skipIf(!hasSupabase)("API integration", () => {
  const admin = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token = "";
  let userId = "";
  let projectId = "";

  beforeAll(async () => {
    app = await buildApp();
    const email = `vitest-${Date.now()}@example.com`;
    const password = `Vitest-${Date.now()}!`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (createError) throw createError;
    userId = created.user.id;

    const anon = createClient<Database>(env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: session, error: signInError } = await anon.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    token = session.session.access_token;
  });

  afterAll(async () => {
    if (projectId) await admin.from("projects").delete().eq("id", projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
    await app.close();
  });

  async function request(path: string, payload?: unknown) {
    const response = (await app.inject({
      method: payload ? "POST" : "GET",
      url: `/api${path}`,
      headers: { authorization: `Bearer ${token}` },
      payload: payload as Record<string, unknown> | undefined
    })) as InjectJsonResponse;
    expect(response.statusCode).toBeGreaterThanOrEqual(200);
    expect(response.statusCode).toBeLessThan(300);
    return response.json();
  }

  it("creates a project, writes AI suggestions, and saves a report", async () => {
    const status = await request("/ai/status");
    expect(status.provider).toBe("openai-compatible");

    const project = await request("/projects", { name: "Vitest workspace", description: "temporary integration project" });
    projectId = project.id;

    const improved = await request("/ai/text/improve", {
      projectId,
      text: "  quotes   lose  context  ",
      mode: "correct"
    });
    expect(improved.text).toContain("quotes");

    const clustered = await request("/ai/canvas/cluster", {
      projectId,
      nodes: [{ id: "n1", label: "Quote source tracking" }]
    });
    expect(Object.keys(clustered.groups).length).toBeGreaterThan(0);

    const report = await request("/reports", {
      projectId,
      title: "Integration report",
      body: "# Integration report"
    });
    expect(report.title).toBe("Integration report");

    const { count, error } = await admin.from("ai_suggestions").select("*", { count: "exact", head: true }).eq("project_id", projectId);
    if (error) throw error;
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
