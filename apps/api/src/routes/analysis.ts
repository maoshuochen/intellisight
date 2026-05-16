import type { FastifyPluginAsync } from "fastify";
import { uuidSchema } from "@intellisight/shared";
import { assertProjectRole } from "../services/projects.js";
import { toCamel } from "../utils/case.js";

export const analysisRoutes: FastifyPluginAsync = async (app) => {
  app.get("/canvases", async (request) => {
    const projectId = uuidSchema.parse((request.query as { projectId?: string }).projectId);
    await assertProjectRole(app, request.user.id, projectId);
    const { data, error } = await app.supabase
      .from("canvases")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return toCamel(data);
  });

  app.get("/canvases/:id", async (request) => {
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const { data, error } = await app.supabase.from("canvases").select("*").eq("id", id).single();
    if (error) throw error;
    await assertProjectRole(app, request.user.id, data.project_id);
    return toCamel(data);
  });

  app.put("/canvases/:id", async (request) => {
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const { data: existing, error: existingError } = await app.supabase
      .from("canvases")
      .select("project_id")
      .eq("id", id)
      .single();
    if (existingError) throw existingError;
    await assertProjectRole(app, request.user.id, existing.project_id, ["owner", "editor"]);
    const body = request.body as { name?: string; nodes?: unknown[]; edges?: unknown[]; viewport?: unknown };
    const { data, error } = await app.supabase
      .from("canvases")
      .update({
        name: body.name,
        nodes: body.nodes,
        edges: body.edges,
        viewport: body.viewport
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toCamel(data);
  });
};
