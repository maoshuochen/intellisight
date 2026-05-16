import type { FastifyPluginAsync } from "fastify";
import { createAnnotationSchema, createCodeSchema, createInterviewSchema, uuidSchema } from "@intellisight/shared";
import { assertProjectRole } from "../services/projects.js";
import { toCamel, toSnake } from "../utils/case.js";

export const researchRoutes: FastifyPluginAsync = async (app) => {
  app.get("/interviews", async (request) => {
    const projectId = uuidSchema.parse((request.query as { projectId?: string }).projectId);
    await assertProjectRole(app, request.user.id, projectId);

    const { data, error } = await app.supabase
      .from("interviews")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return toCamel(data);
  });

  app.post("/interviews", async (request, reply) => {
    const body = createInterviewSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);

    const { data: interview, error } = await app.supabase
      .from("interviews")
      .insert({
        project_id: body.projectId,
        name: body.name,
        sample: body.sample ?? null,
        owner: body.owner ?? request.user.email ?? null,
        length: body.length ?? null,
        participant_name: body.participantName ?? null
      })
      .select("*")
      .single();
    if (error) throw error;

    const { error: paragraphError } = await app.supabase.from("paragraphs").insert(
      body.paragraphs.map((paragraph, index) => ({
        project_id: body.projectId,
        interview_id: interview.id,
        text: paragraph.text,
        speaker: paragraph.speaker ?? null,
        start_time: paragraph.startTime ?? null,
        end_time: paragraph.endTime ?? null,
        sort_order: index + 1
      }))
    );
    if (paragraphError) throw paragraphError;

    return reply.code(201).send(toCamel(interview));
  });

  app.get("/interviews/:id/paragraphs", async (request) => {
    const interviewId = uuidSchema.parse((request.params as { id: string }).id);
    const { data: interview, error: interviewError } = await app.supabase
      .from("interviews")
      .select("project_id")
      .eq("id", interviewId)
      .single();
    if (interviewError) throw interviewError;
    await assertProjectRole(app, request.user.id, interview.project_id);

    const { data, error } = await app.supabase
      .from("paragraphs")
      .select("*")
      .eq("interview_id", interviewId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return toCamel(data);
  });

  app.put("/paragraphs/:id", async (request) => {
    const paragraphId = uuidSchema.parse((request.params as { id: string }).id);
    const body = toSnake(request.body as Record<string, unknown>);
    const { data: paragraph, error: paragraphError } = await app.supabase
      .from("paragraphs")
      .select("project_id")
      .eq("id", paragraphId)
      .single();
    if (paragraphError) throw paragraphError;
    await assertProjectRole(app, request.user.id, paragraph.project_id, ["owner", "editor"]);

    const { data, error } = await app.supabase
      .from("paragraphs")
      .update(body)
      .eq("id", paragraphId)
      .select("*")
      .single();
    if (error) throw error;
    return toCamel(data);
  });

  app.get("/code-groups", async (request) => {
    const projectId = uuidSchema.parse((request.query as { projectId?: string }).projectId);
    await assertProjectRole(app, request.user.id, projectId);
    const { data, error } = await app.supabase
      .from("code_groups")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order");
    if (error) throw error;
    return toCamel(data);
  });

  app.get("/codes", async (request) => {
    const projectId = uuidSchema.parse((request.query as { projectId?: string }).projectId);
    await assertProjectRole(app, request.user.id, projectId);
    const { data, error } = await app.supabase
      .from("codes")
      .select("*, annotation_codes(count)")
      .eq("project_id", projectId)
      .order("created_at");
    if (error) throw error;
    return toCamel(
      data.map((code) => ({
        ...code,
        usage: code.annotation_codes?.[0]?.count ?? 0
      }))
    );
  });

  app.post("/codes", async (request, reply) => {
    const body = createCodeSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const { data, error } = await app.supabase
      .from("codes")
      .insert({
        project_id: body.projectId,
        code_group_id: body.codeGroupId,
        name: body.name,
        owner: body.owner ?? request.user.email ?? null
      })
      .select("*")
      .single();
    if (error) throw error;
    return reply.code(201).send(toCamel(data));
  });

  app.patch("/codes/:id", async (request) => {
    const codeId = uuidSchema.parse((request.params as { id: string }).id);
    const { data: code, error: codeError } = await app.supabase
      .from("codes")
      .select("project_id")
      .eq("id", codeId)
      .single();
    if (codeError) throw codeError;
    await assertProjectRole(app, request.user.id, code.project_id, ["owner", "editor"]);
    const { data, error } = await app.supabase
      .from("codes")
      .update(toSnake(request.body as Record<string, unknown>))
      .eq("id", codeId)
      .select("*")
      .single();
    if (error) throw error;
    return toCamel(data);
  });

  app.delete("/codes/:id", async (request, reply) => {
    const codeId = uuidSchema.parse((request.params as { id: string }).id);
    const { data: code, error: codeError } = await app.supabase
      .from("codes")
      .select("project_id")
      .eq("id", codeId)
      .single();
    if (codeError) throw codeError;
    await assertProjectRole(app, request.user.id, code.project_id, ["owner", "editor"]);
    const { error } = await app.supabase.from("codes").delete().eq("id", codeId);
    if (error) throw error;
    return reply.code(204).send();
  });

  app.get("/annotations", async (request) => {
    const query = request.query as { projectId?: string; paragraphId?: string };
    const projectId = uuidSchema.parse(query.projectId);
    await assertProjectRole(app, request.user.id, projectId);
    let builder = app.supabase
      .from("annotations")
      .select("*, annotation_codes(code_id), paragraphs(speaker,start_time,end_time,text)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (query.paragraphId) builder = builder.eq("paragraph_id", uuidSchema.parse(query.paragraphId));
    const { data, error } = await builder;
    if (error) throw error;
    return toCamel(data.map((annotation) => ({
      ...annotation,
      code_ids: annotation.annotation_codes?.map((item: { code_id: string }) => item.code_id) ?? []
    })));
  });

  app.post("/annotations", async (request, reply) => {
    const body = createAnnotationSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const { data: annotation, error } = await app.supabase
      .from("annotations")
      .insert({
        project_id: body.projectId,
        paragraph_id: body.paragraphId,
        text: body.text,
        start_offset: body.startOffset,
        end_offset: body.endOffset,
        comment: body.comment ?? null
      })
      .select("*")
      .single();
    if (error) throw error;
    const links = body.codeIds.map((codeId) => ({
      annotation_id: annotation.id,
      code_id: codeId,
      project_id: body.projectId
    }));
    const { error: linkError } = await app.supabase.from("annotation_codes").insert(links);
    if (linkError) throw linkError;
    return reply.code(201).send(toCamel({ ...annotation, code_ids: body.codeIds }));
  });
};
