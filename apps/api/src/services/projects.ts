import type { FastifyInstance } from "fastify";

export async function assertProjectRole(
  app: FastifyInstance,
  userId: string,
  projectId: string,
  roles: Array<"owner" | "editor" | "viewer"> = ["owner", "editor", "viewer"]
) {
  const { data, error } = await app.supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || !roles.includes(data.role)) {
    const required = roles.join(", ");
    const err = new Error(`Project permission required: ${required}`);
    err.name = "ForbiddenError";
    throw err;
  }
}
