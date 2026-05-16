import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: string;
      email?: string;
    };
  }
}

export const authPlugin = fp(async (app) => {
  app.decorateRequest("user");

  app.addHook("preHandler", async (request, reply) => {
    if (request.url === "/health") return;

    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
    if (!token) {
      return reply.code(401).send({ error: { code: "unauthorized", message: "Missing bearer token" } });
    }

    const { data, error } = await app.supabase.auth.getUser(token);
    if (error || !data.user) {
      return reply.code(401).send({ error: { code: "unauthorized", message: "Invalid session" } });
    }

    request.user = { id: data.user.id, email: data.user.email };
    await app.supabase.from("profiles").upsert({
      user_id: data.user.id,
      display_name: data.user.user_metadata?.name ?? data.user.email ?? "Researcher",
      avatar_url: data.user.user_metadata?.avatar_url ?? null
    });
  });
});
