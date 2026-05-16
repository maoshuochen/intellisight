import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  canvasClusterResponseSchema,
  recommendCodesResponseSchema,
  textImproveResponseSchema,
  type CanvasClusterResponse,
  type RecommendCodesResponse,
  type TextImproveResponse
} from "@intellisight/shared";
import { canUseAiModel, getAiConfig } from "./aiConfig.js";

type CandidateCode = { id: string; name: string };

const tokenPattern = /[\p{L}\p{N}]+/gu;

function tokenize(text: string) {
  return [...text.toLowerCase().matchAll(tokenPattern)].map((match) => match[0]);
}

function jaccardScore(a: string, b: string) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size || !right.size) return 0;
  let hit = 0;
  for (const item of left) {
    if (right.has(item)) hit += 1;
  }
  return hit / new Set([...left, ...right]).size;
}

export function hashInput(input: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

async function callJsonModel<T>(system: string, input: unknown): Promise<T> {
  const config = getAiConfig();
  const response = await fetch(`${config.apiBase.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(input) }
      ]
    })
  });

  if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI response had no content");
  return JSON.parse(content) as T;
}

export async function recommendCodes(text: string, candidateCodes: CandidateCode[]): Promise<RecommendCodesResponse> {
  if (!canUseAiModel() || candidateCodes.length === 0) {
    return fallbackRecommend(text, candidateCodes);
  }

  try {
    const parsed = await callJsonModel<Pick<RecommendCodesResponse, "recommendations">>(
      "You are assisting a user researcher. Rank candidate qualitative codes for a transcript quote. Return JSON with recommendations: [{id,label,score,reason}]. Scores must be 0..1. Reasons must be concise and explain why the code may fit.",
      { text, candidateCodes }
    );
    return recommendCodesResponseSchema.parse({
      provider: "openai-compatible",
      degraded: false,
      recommendations: parsed.recommendations.slice(0, 6)
    });
  } catch {
    return fallbackRecommend(text, candidateCodes);
  }
}

export function fallbackRecommend(text: string, candidateCodes: CandidateCode[]): RecommendCodesResponse {
  return recommendCodesResponseSchema.parse({
    provider: "rules",
    degraded: true,
    recommendations: candidateCodes
      .map((code) => ({
        id: code.id,
        label: code.name,
        score: Math.max(0.1, Math.min(1, jaccardScore(text, code.name))),
        reason: "Keyword overlap fallback recommendation"
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  });
}

export function extractKeywords(text: string) {
  const stopWords = new Set(["the", "and", "for", "with", "this", "that", "一个", "我们", "他们", "可以", "就是"]);
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    if (token.length < 2 || stopWords.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([keyword]) => keyword);
}

export async function improveText(text: string, mode: "correct" | "simplify"): Promise<TextImproveResponse> {
  if (!canUseAiModel()) {
    return textImproveResponseSchema.parse({
      provider: "rules",
      degraded: true,
      text: text.trim().replace(/\s+/g, " "),
      reason: "Whitespace cleanup fallback; configure AI_API_KEY for semantic correction."
    });
  }

  try {
    const parsed = await callJsonModel<{ text: string; reason?: string }>(
      mode === "simplify"
        ? "You help user researchers clean transcript quotes. Simplify the text while preserving meaning and speaker intent. Return JSON: {text, reason}."
        : "You help user researchers clean transcript quotes. Correct obvious grammar and transcription issues while preserving meaning and speaker intent. Return JSON: {text, reason}.",
      { text }
    );
    return textImproveResponseSchema.parse({
      provider: "openai-compatible",
      degraded: false,
      text: parsed.text,
      reason: parsed.reason ?? "AI generated transcript improvement candidate."
    });
  } catch {
    return textImproveResponseSchema.parse({
      provider: "rules",
      degraded: true,
      text: text.trim().replace(/\s+/g, " "),
      reason: "AI request failed; whitespace cleanup fallback was used."
    });
  }
}

export async function clusterCanvas(nodes: Array<{ id: string; label: string; text?: string }>): Promise<CanvasClusterResponse> {
  if (!canUseAiModel()) {
    return fallbackCluster(nodes);
  }

  try {
    const parsed = await callJsonModel<Pick<CanvasClusterResponse, "groups">>(
      "You help user researchers cluster qualitative highlights into themes. Return JSON: {groups}, where groups is an object mapping concise theme names to arrays of {id,label}. Use only node ids from input.",
      { nodes }
    );
    return canvasClusterResponseSchema.parse({ provider: "openai-compatible", degraded: false, groups: parsed.groups });
  } catch {
    return fallbackCluster(nodes);
  }
}

export function fallbackCluster(nodes: Array<{ id: string; label: string }>): CanvasClusterResponse {
  const groups = nodes.reduce<Record<string, Array<{ id: string; label: string }>>>((acc, node) => {
    const tokens = tokenize(node.label).filter((token) => token.length > 3);
    const firstToken = tokens[0];
    const key = firstToken ? firstToken.charAt(0).toUpperCase() + firstToken.slice(1) : "Other";
    acc[key] = acc[key] ?? [];
    acc[key].push({ id: node.id, label: node.label });
    return acc;
  }, {});
  return canvasClusterResponseSchema.parse({ provider: "rules", degraded: true, groups });
}

export async function saveAiSuggestion(app: FastifyInstance, params: {
  projectId: string;
  userId: string;
  feature: string;
  provider: string;
  model?: string | null;
  input: unknown;
  result: unknown;
}) {
  await app.supabase.from("ai_suggestions").insert({
    project_id: params.projectId,
    created_by: params.userId,
    feature: params.feature,
    provider: params.provider,
    model: params.model ?? null,
    input_hash: hashInput(params.input),
    result: params.result as any
  });
}
