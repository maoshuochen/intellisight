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
    return toCamel((data as Array<{ projects?: unknown }>).map((row) => row.projects).filter(Boolean));
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

    const { data: interview } = await app.supabase
      .from("interviews")
      .insert({
        project_id: project.id,
        name: "Demo interview",
        sample: "Usability study",
        owner: request.user.email ?? "Researcher",
        length: "12:30",
        participant_name: "Participant A"
      })
      .select("*")
      .single();

    if (interview) {
      await app.supabase.from("paragraphs").insert([
        {
          project_id: project.id,
          interview_id: interview.id,
          speaker: "Researcher",
          start_time: "00:00",
          end_time: "00:12",
          sort_order: 1,
          text: "Can you walk me through the last time you tried to organize interview notes after a research session?"
        },
        {
          project_id: project.id,
          interview_id: interview.id,
          speaker: "Participant",
          start_time: "00:13",
          end_time: "00:44",
          sort_order: 2,
          text: "I usually paste everything into a document first, then copy quotes into a spreadsheet. The hardest part is keeping track of where each quote came from."
        },
        {
          project_id: project.id,
          interview_id: interview.id,
          speaker: "Participant",
          start_time: "00:45",
          end_time: "01:08",
          sort_order: 3,
          text: "When there are several interviews, I spend a lot of time comparing repeated themes. It would help if the tool could suggest codes but still let me decide."
        }
      ]);
    }

    return reply.code(201).send(toCamel(project));
  });
};
