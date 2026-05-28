import type { FastifyPluginAsync } from "fastify";
import { createCanvasSchema, createOutlineSchema, createReportSchema, updateCanvasSchema, updateOutlineQuestionsSchema, updateReportSchema, uuidSchema } from "@intellisight/shared";
import { assertProjectRole } from "../services/projects.js";
import { toCamel } from "../utils/case.js";

export const analysisRoutes: FastifyPluginAsync = async (app) => {
  app.get("/outlines", async (request) => {
    const projectId = uuidSchema.parse((request.query as { projectId?: string }).projectId);
    await assertProjectRole(app, request.user.id, projectId);
    const { data, error } = await app.supabase
      .from("outlines")
      .select("*, outline_questions(*)")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const outlines = data as Array<Record<string, any> & { outline_questions?: Array<Record<string, any>> }>;
    return toCamel(
      outlines.map((outline) => ({
        ...outline,
        questions: [...(outline.outline_questions ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      }))
    );
  });

  app.post("/outlines", async (request, reply) => {
    const body = createOutlineSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const { data, error } = await app.supabase
      .from("outlines")
      .insert({ project_id: body.projectId, name: body.name })
      .select("*")
      .single();
    if (error) throw error;
    return reply.code(201).send(toCamel({ ...data, questions: [] }));
  });

  app.patch("/outlines/:id", async (request) => {
    const outlineId = uuidSchema.parse((request.params as { id: string }).id);
    const body = request.body as { name?: string };
    const { data: outline, error: outlineError } = await app.supabase.from("outlines").select("project_id").eq("id", outlineId).single();
    if (outlineError) throw outlineError;
    await assertProjectRole(app, request.user.id, outline.project_id, ["owner", "editor"]);
    const { data, error } = await app.supabase
      .from("outlines")
      .update({ name: body.name })
      .eq("id", outlineId)
      .select("*")
      .single();
    if (error) throw error;
    return toCamel(data);
  });

  app.put("/outlines/:id/questions", async (request) => {
    const outlineId = uuidSchema.parse((request.params as { id: string }).id);
    const body = updateOutlineQuestionsSchema.parse(request.body);
    const { data: outline, error: outlineError } = await app.supabase.from("outlines").select("project_id").eq("id", outlineId).single();
    if (outlineError) throw outlineError;
    await assertProjectRole(app, request.user.id, outline.project_id, ["owner", "editor"]);
    const { error: deleteError } = await app.supabase.from("outline_questions").delete().eq("outline_id", outlineId);
    if (deleteError) throw deleteError;
    if (body.questions.length) {
      const { error: insertError } = await app.supabase.from("outline_questions").insert(
        body.questions.map((question) => ({
          outline_id: outlineId,
          project_id: outline.project_id,
          content: question.content,
          tags: question.tags,
          sort_order: question.sortOrder
        }))
      );
      if (insertError) throw insertError;
    }
    const { data, error } = await app.supabase
      .from("outlines")
      .select("*, outline_questions(*)")
      .eq("id", outlineId)
      .single();
    if (error) throw error;
    const outlineWithQuestions = data as Record<string, any> & { outline_questions?: Array<Record<string, any>> };
    return toCamel({ ...outlineWithQuestions, questions: [...(outlineWithQuestions.outline_questions ?? [])].sort((a, b) => a.sort_order - b.sort_order) });
  });

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

  app.post("/canvases", async (request, reply) => {
    const body = createCanvasSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const { data, error } = await app.supabase
      .from("canvases")
      .insert({ project_id: body.projectId, name: body.name, nodes: [], edges: [] })
      .select("*")
      .single();
    if (error) throw error;
    return reply.code(201).send(toCamel(data));
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
    const body = updateCanvasSchema.parse(request.body);
    const { data, error } = await app.supabase
      .from("canvases")
      .update({
        name: body.name,
        nodes: body.nodes as any,
        edges: body.edges as any,
        viewport: body.viewport as any
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toCamel(data);
  });

  app.get("/reports", async (request) => {
    const projectId = uuidSchema.parse((request.query as { projectId?: string }).projectId);
    await assertProjectRole(app, request.user.id, projectId);
    const { data, error } = await app.supabase
      .from("reports")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return toCamel(data);
  });

  app.post("/reports", async (request, reply) => {
    const body = createReportSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const { data, error } = await app.supabase
      .from("reports")
      .insert({ project_id: body.projectId, title: body.title, body: body.body })
      .select("*")
      .single();
    if (error) throw error;
    return reply.code(201).send(toCamel(data));
  });

  app.patch("/reports/:id", async (request) => {
    const reportId = uuidSchema.parse((request.params as { id: string }).id);
    const body = updateReportSchema.parse(request.body);
    const { data: existing, error: existingError } = await app.supabase
      .from("reports")
      .select("project_id")
      .eq("id", reportId)
      .single();
    if (existingError) throw existingError;
    await assertProjectRole(app, request.user.id, existing.project_id, ["owner", "editor"]);
    const { data, error } = await app.supabase
      .from("reports")
      .update(body)
      .eq("id", reportId)
      .select("*")
      .single();
    if (error) throw error;
    return toCamel(data);
  });
};
