import type { FastifyPluginAsync } from "fastify";
import { createProjectSchema } from "@intellisight/shared";
import { toCamel } from "../utils/case.js";

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.get("/projects", async (request) => {
    const { data, error } = await app.supabase
      .from("project_members")
      .select("projects(*)")
      .eq("user_id", request.user.id);

    if (error) throw error;
    return toCamel(data.map((row) => row.projects).filter(Boolean));
  });

  app.post("/projects", async (request, reply) => {
    const body = createProjectSchema.parse(request.body);

    const { data: project, error } = await app.supabase
      .from("projects")
      .insert({
        name: body.name,
        description: body.description ?? null,
        created_by: request.user.id
      })
      .select("*")
      .single();

    if (error) throw error;

    const { error: memberError } = await app.supabase.from("project_members").insert({
      project_id: project.id,
      user_id: request.user.id,
      role: "owner"
    });
    if (memberError) throw memberError;

    const { error: groupError } = await app.supabase.from("code_groups").insert([
      { project_id: project.id, name: "Need", color: "blue", sort_order: 1 },
      { project_id: project.id, name: "Pain Point", color: "orange", sort_order: 2 },
      { project_id: project.id, name: "Opportunity", color: "purple", sort_order: 3 }
    ]);
    if (groupError) throw groupError;

    await app.supabase.from("outlines").insert({
      project_id: project.id,
      name: "Interview outline"
    });

    await app.supabase.from("canvases").insert({
      project_id: project.id,
      name: "Theme analysis",
      nodes: [],
      edges: []
    });

    return reply.code(201).send(toCamel(project));
  });
};
