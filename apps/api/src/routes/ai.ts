import type { FastifyPluginAsync } from "fastify";
import {
  clusterCanvasRequestSchema,
  extractKeywordsRequestSchema,
  recommendCodesRequestSchema,
  textImproveRequestSchema,
  updateAiSettingsSchema
} from "@intellisight/shared";
import { clusterCanvas, extractKeywords, improveText, recommendCodes, saveAiSuggestion } from "../services/ai.js";
import { getAiConfig, updateAiConfig } from "../services/aiConfig.js";
import { assertProjectRole } from "../services/projects.js";

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.get("/ai/status", async () => {
    const config = getAiConfig();
    return {
      enabled: config.enabled,
      provider: "openai-compatible",
      model: config.enabled && config.apiKey ? config.model : null,
      apiBase: config.apiBase,
      configured: Boolean(config.enabled && config.apiKey),
      apiKeyConfigured: Boolean(config.apiKey),
      source: config.source
    };
  });

  app.put("/ai/settings", async (request) => {
    const body = updateAiSettingsSchema.parse(request.body);
    const config = updateAiConfig({
      enabled: body.enabled,
      apiBase: body.apiBase,
      apiKey: body.apiKey,
      model: body.model
    });
    return {
      enabled: config.enabled,
      provider: "openai-compatible",
      model: config.enabled && config.apiKey ? config.model : null,
      apiBase: config.apiBase,
      configured: Boolean(config.enabled && config.apiKey),
      apiKeyConfigured: Boolean(config.apiKey),
      source: config.source
    };
  });

  app.post("/ai/codes/recommend", async (request) => {
    const body = recommendCodesRequestSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const result = await recommendCodes(body.text, body.candidateCodes);
    await saveAiSuggestion(app, {
      projectId: body.projectId,
      userId: request.user.id,
      feature: "codes.recommend",
      provider: result.provider,
      model: result.degraded ? null : getAiConfig().model,
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
    const result = await improveText(body.text, body.mode);
    await saveAiSuggestion(app, {
      projectId: body.projectId,
      userId: request.user.id,
      feature: `text.${body.mode}`,
      provider: result.provider,
      model: result.degraded ? null : getAiConfig().model,
      input: body,
      result
    });
    return result;
  });

  app.post("/ai/canvas/cluster", async (request) => {
    const body = clusterCanvasRequestSchema.parse(request.body);
    await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
    const result = await clusterCanvas(body.nodes);
    await saveAiSuggestion(app, {
      projectId: body.projectId,
      userId: request.user.id,
      feature: "canvas.cluster",
      provider: result.provider,
      model: result.degraded ? null : getAiConfig().model,
      input: body,
      result
    });
    return result;
  });
};
