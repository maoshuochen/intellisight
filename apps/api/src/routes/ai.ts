import type { FastifyPluginAsync } from "fastify";
import {
  clusterCanvasRequestSchema,
  extractKeywordsRequestSchema,
  recommendCodesRequestSchema,
  textImproveRequestSchema,
  uuidSchema,
  updateAiSettingsSchema
} from "@intellisight/shared";
import { clusterCanvas, extractKeywords, improveText, recommendCodes, saveAiSuggestion } from "../services/ai.js";
import { aiStatusFromConfig, getAiConfig, updateAiConfig, type AiProviderConfig } from "../services/aiConfig.js";
import { assertProjectRole } from "../services/projects.js";
import { toCamel } from "../utils/case.js";

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.get("/ai/status", async (request) => {
    const projectId = (request.query as { projectId?: string }).projectId;
    if (!projectId) return aiStatusFromConfig(getAiConfig());
    const parsedProjectId = uuidSchema.parse(projectId);
    await assertProjectRole(app, request.user.id, parsedProjectId);
    const config = await getProjectAiConfig(parsedProjectId);
    return aiStatusFromConfig(config);
  });

  app.put("/ai/settings", async (request) => {
    const body = updateAiSettingsSchema.parse(request.body);
    if (body.projectId) {
      await assertProjectRole(app, request.user.id, body.projectId, ["owner", "editor"]);
      const current = await getProjectAiConfig(body.projectId);
      const { data, error } = await (app.supabase as any)
        .from("project_ai_settings")
        .upsert({
          project_id: body.projectId,
          enabled: body.enabled,
          api_base: body.apiBase,
          api_key: body.apiKey?.trim() || current.apiKey || null,
          model: body.model,
          created_by: request.user.id
        })
        .select("*")
        .single();
      if (error) throw error;
      const config = rowToAiConfig(data as any);
      updateAiConfig(config);
      return aiStatusFromConfig(config);
    }

    return aiStatusFromConfig(updateAiConfig({
      enabled: body.enabled,
      apiBase: body.apiBase,
      apiKey: body.apiKey,
      model: body.model
    }));
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

  async function getProjectAiConfig(projectId: string): Promise<AiProviderConfig> {
    const { data, error } = await (app.supabase as any).from("project_ai_settings").select("*").eq("project_id", projectId).maybeSingle();
    if (error) throw error;
    if (!data) return getAiConfig();
    return rowToAiConfig(data as any);
  }

  function rowToAiConfig(row: Record<string, any>): AiProviderConfig {
    const item = toCamel(row) as { enabled: boolean; apiBase: string; apiKey?: string | null; model: string };
    return {
      enabled: item.enabled,
      apiBase: item.apiBase,
      apiKey: item.apiKey ?? undefined,
      model: item.model,
      source: "runtime"
    };
  }
};
