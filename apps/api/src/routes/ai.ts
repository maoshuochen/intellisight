import type { FastifyPluginAsync } from "fastify";
import {
  clusterCanvasRequestSchema,
  extractKeywordsRequestSchema,
  recommendCodesRequestSchema,
  textImproveRequestSchema
} from "@intellisight/shared";
import { env } from "../config/env.js";
import { extractKeywords, recommendCodes, saveAiSuggestion } from "../services/ai.js";
import { assertProjectRole } from "../services/projects.js";

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.post("/ai/codes/recommend", async (request) => {
    const body = recommendCodesRequestSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const result = await recommendCodes(body.text, body.candidateCodes);
    await saveAiSuggestion(app, {
      projectId: body.projectId,
      userId: request.user.id,
      feature: "codes.recommend",
      provider: result.provider,
      model: result.degraded ? null : env.AI_MODEL,
      input: body,
      result
    });
    return result;
  });

  app.post("/ai/keywords/extract", async (request) => {
    const body = extractKeywordsRequestSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const keywords = extractKeywords(body.text);
    const result = { provider: "rules", degraded: true, keywords };
    await saveAiSuggestion(app, {
      projectId: body.projectId,
      userId: request.user.id,
      feature: "keywords.extract",
      provider: "rules",
      input: body,
      result
    });
    return result;
  });

  app.post("/ai/text/improve", async (request) => {
    const body = textImproveRequestSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const result = {
      provider: "rules",
      degraded: true,
      text: body.text.trim().replace(/\s+/g, " ")
    };
    return result;
  });

  app.post("/ai/canvas/cluster", async (request) => {
    const body = clusterCanvasRequestSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const groups = body.nodes.reduce<Record<string, Array<{ id: string; label: string }>>>((acc, node) => {
      const key = node.label.slice(0, 1).toUpperCase() || "Other";
      acc[key] = acc[key] ?? [];
      acc[key].push({ id: node.id, label: node.label });
      return acc;
    }, {});
    return { provider: "rules", degraded: true, groups };
  });
};
