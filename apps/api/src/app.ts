import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { analysisRoutes } from "./routes/analysis.js";
import { aiRoutes } from "./routes/ai.js";
import { projectRoutes } from "./routes/projects.js";
import { researchRoutes } from "./routes/research.js";
import { authPlugin } from "./plugins/auth.js";
import { supabasePlugin } from "./plugins/supabase.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true
  });
  await app.register(supabasePlugin);
  await app.register(authPlugin);

  app.get("/health", async () => ({ ok: true }));
  await app.register(projectRoutes, { prefix: "/api" });
  await app.register(researchRoutes, { prefix: "/api" });
  await app.register(analysisRoutes, { prefix: "/api" });
  await app.register(aiRoutes, { prefix: "/api" });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: { code: "validation_error", message: error.issues.map((issue) => issue.message).join("; ") }
      });
    }
    if (error instanceof Error && error.name === "ForbiddenError") {
      return reply.code(403).send({ error: { code: "forbidden", message: error.message } });
    }
    const message = error instanceof Error ? error.message : "Unexpected server error";
    app.log.error(error);
    return reply.code(500).send({ error: { code: "internal_error", message } });
  });

  return app;
}
