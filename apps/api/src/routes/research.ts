import type { FastifyPluginAsync } from "fastify";
import {
  createAnnotationSchema,
  createCodeGroupSchema,
  createCodeSchema,
  createInterviewSchema,
  createParticipantSchema,
  importTranscriptSchema,
  updateAnnotationSchema,
  updateCodeGroupSchema,
  updateCodeSchema,
  updateParticipantSchema,
  uuidSchema
} from "@intellisight/shared";
import { assertProjectRole } from "../services/projects.js";
import { parseTranscript } from "../services/transcriptImport.js";
import { toCamel, toSnake } from "../utils/case.js";

export const researchRoutes: FastifyPluginAsync = async (app) => {
  app.get("/interviews", async (request) => {
    const projectId = uuidSchema.parse((request.query as { projectId?: string }).projectId);
    await assertProjectRole(app, request.user.id, projectId);

    const { data, error } = await app.supabase
      .from("interviews")
      .select("*, participants(id,display_name,role,sample_group,tags,notes)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return toCamel((data as Array<Record<string, any>>).map((interview) => ({
      ...interview,
      participant: interview.participants ?? participantFallback(interview)
    })));
  });

  app.post("/interviews", async (request, reply) => {
    const body = createInterviewSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const participant = await resolveParticipant({
      projectId: body.projectId,
      participantId: body.participantId,
      participantName: body.participantName,
      role: body.participantRole,
      sampleGroup: body.sampleGroup
    });

    const { data: interview, error } = await app.supabase
      .from("interviews")
      .insert({
        project_id: body.projectId,
        name: body.name,
        sample: body.sample ?? null,
        owner: body.owner ?? request.user.email ?? null,
        length: body.length ?? null,
        participant_id: participant?.id ?? null,
        participant_name: participant?.display_name ?? body.participantName ?? null
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

  app.post("/interviews/import", async (request, reply) => {
    const body = importTranscriptSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const participant = await resolveParticipant({
      projectId: body.projectId,
      participantId: body.participantId,
      participantName: body.participantName,
      role: body.participantRole,
      sampleGroup: body.sampleGroup
    });
    const paragraphs = parseTranscript(body.transcript);
    if (!paragraphs.length) {
      const err = new Error("Transcript did not contain any importable paragraphs");
      err.name = "BadRequestError";
      throw err;
    }

    const { data: interview, error } = await app.supabase
      .from("interviews")
      .insert({
        project_id: body.projectId,
        name: body.name,
        sample: body.sample ?? "Imported transcript",
        owner: request.user.email ?? null,
        length: null,
        participant_id: participant?.id ?? null,
        participant_name: participant?.display_name ?? body.participantName ?? null
      })
      .select("*")
      .single();
    if (error) throw error;

    const { error: paragraphError } = await app.supabase.from("paragraphs").insert(
      paragraphs.map((paragraph, index) => ({
        project_id: body.projectId,
        interview_id: interview.id,
        text: paragraph.text,
        speaker: paragraph.speaker ?? null,
        start_time: paragraph.startTime ?? null,
        end_time: null,
        sort_order: index + 1
      }))
    );
    if (paragraphError) throw paragraphError;

    return reply.code(201).send(toCamel({ ...interview, paragraph_count: paragraphs.length }));
  });

  app.get("/participants", async (request) => {
    const projectId = uuidSchema.parse((request.query as { projectId?: string }).projectId);
    await assertProjectRole(app, request.user.id, projectId);
    const { data, error } = await app.supabase
      .from("participants")
      .select("*")
      .eq("project_id", projectId)
      .order("display_name", { ascending: true });
    if (error) throw error;
    return toCamel(data);
  });

  app.post("/participants", async (request, reply) => {
    const body = createParticipantSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const { data, error } = await app.supabase
      .from("participants")
      .insert({
        project_id: body.projectId,
        display_name: body.displayName.trim(),
        role: body.role?.trim() || null,
        sample_group: body.sampleGroup?.trim() || null,
        tags: body.tags,
        notes: body.notes?.trim() || null
      })
      .select("*")
      .single();
    if (error) throw error;
    return reply.code(201).send(toCamel(data));
  });

  app.patch("/participants/:id", async (request) => {
    const participantId = uuidSchema.parse((request.params as { id: string }).id);
    const body = updateParticipantSchema.parse(request.body);
    const { data: participant, error: participantError } = await app.supabase
      .from("participants")
      .select("project_id")
      .eq("id", participantId)
      .single();
    if (participantError) throw participantError;
    await assertProjectRole(app, request.user.id, participant.project_id, ["owner", "editor"]);
    const { data, error } = await app.supabase
      .from("participants")
      .update(toSnake(body) as any)
      .eq("id", participantId)
      .select("*")
      .single();
    if (error) throw error;
    return toCamel(data);
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
      .update(body as any)
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

  app.post("/code-groups", async (request, reply) => {
    const body = createCodeGroupSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const { count } = await app.supabase.from("code_groups").select("*", { count: "exact", head: true }).eq("project_id", body.projectId);
    const { data, error } = await app.supabase
      .from("code_groups")
      .insert({
        project_id: body.projectId,
        name: body.name,
        color: body.color,
        sort_order: (count ?? 0) + 1
      })
      .select("*")
      .single();
    if (error) throw error;
    return reply.code(201).send(toCamel(data));
  });

  app.patch("/code-groups/:id", async (request) => {
    const groupId = uuidSchema.parse((request.params as { id: string }).id);
    const body = updateCodeGroupSchema.parse(request.body);
    const { data: group, error: groupError } = await app.supabase.from("code_groups").select("project_id").eq("id", groupId).single();
    if (groupError) throw groupError;
    await assertProjectRole(app, request.user.id, group.project_id, ["owner", "editor"]);
    const { data, error } = await app.supabase
      .from("code_groups")
      .update(toSnake(body) as any)
      .eq("id", groupId)
      .select("*")
      .single();
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
    const rows = data as Array<Record<string, any> & { annotation_codes?: Array<{ count?: number }> }>;
    return toCamel(
      rows.map((code) => ({
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
        definition: body.definition ?? null,
        owner: body.owner ?? request.user.email ?? null
      } as any)
      .select("*")
      .single();
    if (error) throw error;
    return reply.code(201).send(toCamel(data));
  });

  app.patch("/codes/:id", async (request) => {
    const codeId = uuidSchema.parse((request.params as { id: string }).id);
    const body = updateCodeSchema.parse(request.body);
    const { data: code, error: codeError } = await app.supabase
      .from("codes")
      .select("project_id")
      .eq("id", codeId)
      .single();
    if (codeError) throw codeError;
    await assertProjectRole(app, request.user.id, code.project_id, ["owner", "editor"]);
    const { data, error } = await app.supabase
      .from("codes")
      .update(toSnake(body) as any)
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
      .select("*, annotation_codes(code_id), paragraphs(speaker,start_time,end_time,text,sort_order,interviews(id,name,participant_name,participants(id,display_name,role,sample_group,tags)))")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (query.paragraphId) builder = builder.eq("paragraph_id", uuidSchema.parse(query.paragraphId));
    const { data, error } = await builder;
    if (error) throw error;
    const rows = data as Array<Record<string, any> & { annotation_codes?: Array<{ code_id: string }>; paragraphs?: Record<string, any> & { interviews?: Record<string, any> } }>;
    return toCamel(rows.map((annotation) => ({
      ...annotation,
      interview_id: annotation.paragraphs?.interviews?.id,
      interview_name: annotation.paragraphs?.interviews?.name,
      paragraph_sort_order: annotation.paragraphs?.sort_order,
      participant: annotation.paragraphs?.interviews?.participants ?? participantFallback(annotation.paragraphs?.interviews),
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

  app.patch("/annotations/:id", async (request) => {
    const annotationId = uuidSchema.parse((request.params as { id: string }).id);
    const body = updateAnnotationSchema.parse(request.body);
    const { data: existing, error: existingError } = await app.supabase
      .from("annotations")
      .select("project_id")
      .eq("id", annotationId)
      .single();
    if (existingError) throw existingError;
    await assertProjectRole(app, request.user.id, existing.project_id, ["owner", "editor"]);

    const annotationPatch: Record<string, unknown> = {};
    if (body.text !== undefined) annotationPatch.text = body.text;
    if (body.startOffset !== undefined) annotationPatch.start_offset = body.startOffset;
    if (body.endOffset !== undefined) annotationPatch.end_offset = body.endOffset;
    if (body.comment !== undefined) annotationPatch.comment = body.comment;

    let annotation = existing as Record<string, unknown>;
    if (Object.keys(annotationPatch).length) {
      const { data, error } = await app.supabase
        .from("annotations")
        .update(annotationPatch as any)
        .eq("id", annotationId)
        .select("*")
        .single();
      if (error) throw error;
      annotation = data as Record<string, unknown>;
    } else {
      const { data, error } = await app.supabase.from("annotations").select("*").eq("id", annotationId).single();
      if (error) throw error;
      annotation = data as Record<string, unknown>;
    }

    if (body.codeIds) {
      const { error: deleteError } = await app.supabase.from("annotation_codes").delete().eq("annotation_id", annotationId);
      if (deleteError) throw deleteError;
      const { error: insertError } = await app.supabase.from("annotation_codes").insert(
        body.codeIds.map((codeId) => ({
          annotation_id: annotationId,
          code_id: codeId,
          project_id: existing.project_id
        }))
      );
      if (insertError) throw insertError;
    }

    return toCamel({ ...annotation, code_ids: body.codeIds });
  });

  app.delete("/annotations/:id", async (request, reply) => {
    const annotationId = uuidSchema.parse((request.params as { id: string }).id);
    const { data: annotation, error: annotationError } = await app.supabase
      .from("annotations")
      .select("project_id")
      .eq("id", annotationId)
      .single();
    if (annotationError) throw annotationError;
    await assertProjectRole(app, request.user.id, annotation.project_id, ["owner", "editor"]);
    const { error } = await app.supabase.from("annotations").delete().eq("id", annotationId);
    if (error) throw error;
    return reply.code(204).send();
  });

  async function resolveParticipant(input: {
    projectId: string;
    participantId?: string;
    participantName?: string;
    role?: string;
    sampleGroup?: string;
  }): Promise<Record<string, any> | null> {
    if (input.participantId) {
      const { data, error } = await app.supabase
        .from("participants")
        .select("*")
        .eq("id", input.participantId)
        .eq("project_id", input.projectId)
        .single();
      if (error) throw error;
      return data as Record<string, any>;
    }

    const displayName = input.participantName?.trim();
    if (!displayName) return null;

    const { data: existing, error: existingError } = await app.supabase
      .from("participants")
      .select("*")
      .eq("project_id", input.projectId)
      .ilike("display_name", displayName)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return existing as Record<string, any>;

    const { data, error } = await app.supabase
      .from("participants")
      .insert({
        project_id: input.projectId,
        display_name: displayName,
        role: input.role?.trim() || null,
        sample_group: input.sampleGroup?.trim() || null,
        tags: [],
        notes: null
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as Record<string, any>;
  }

  function participantFallback(row?: Record<string, any> | null) {
    const displayName = row?.participant_name;
    if (!displayName) return null;
    return {
      id: row.participant_id,
      display_name: displayName,
      role: null,
      sample_group: null,
      tags: []
    };
  }
};
