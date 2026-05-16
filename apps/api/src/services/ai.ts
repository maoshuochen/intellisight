import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { RecommendCodesResponse } from "@intellisight/shared";
import { env } from "../config/env.js";

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

export async function recommendCodes(text: string, candidateCodes: CandidateCode[]): Promise<RecommendCodesResponse> {
  if (!env.AI_ENABLED || !env.AI_API_KEY || candidateCodes.length === 0) {
    return fallbackRecommend(text, candidateCodes);
  }

  try {
    const response = await fetch(`${env.AI_API_BASE.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are assisting a user researcher. Rank candidate qualitative codes for a transcript quote. Return JSON with recommendations: [{id,label,score,reason}]. Scores must be 0..1."
          },
          {
            role: "user",
            content: JSON.stringify({ text, candidateCodes })
          }
        ]
      })
    });

    if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI response had no content");
    const parsed = JSON.parse(content) as Pick<RecommendCodesResponse, "recommendations">;
    return {
      provider: "openai-compatible",
      degraded: false,
      recommendations: parsed.recommendations.slice(0, 6)
    };
  } catch {
    return fallbackRecommend(text, candidateCodes);
  }
}

export function fallbackRecommend(text: string, candidateCodes: CandidateCode[]): RecommendCodesResponse {
  return {
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
  };
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
    result: params.result
  });
}
