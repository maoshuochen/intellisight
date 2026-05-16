import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const memberRoleSchema = z.enum(["owner", "editor", "viewer"]);
export type MemberRole = z.infer<typeof memberRoleSchema>;

export const projectSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  createdBy: uuidSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Project = z.infer<typeof projectSchema>;

export const interviewSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  name: z.string(),
  sample: z.string().nullable(),
  owner: z.string().nullable(),
  length: z.string().nullable(),
  participantName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Interview = z.infer<typeof interviewSchema>;

export const paragraphSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  interviewId: uuidSchema,
  text: z.string(),
  speaker: z.string().nullable(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  sortOrder: z.number()
});
export type Paragraph = z.infer<typeof paragraphSchema>;

export const codeGroupSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  name: z.string(),
  color: z.string(),
  sortOrder: z.number()
});
export type CodeGroup = z.infer<typeof codeGroupSchema>;

export const codeSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  codeGroupId: uuidSchema,
  name: z.string(),
  owner: z.string().nullable(),
  usage: z.number().default(0),
  createdAt: z.string()
});
export type Code = z.infer<typeof codeSchema>;

export const annotationSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  paragraphId: uuidSchema,
  text: z.string(),
  startOffset: z.number(),
  endOffset: z.number(),
  comment: z.string().nullable(),
  codeIds: z.array(uuidSchema),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Annotation = z.infer<typeof annotationSchema>;

export const outlineQuestionSchema = z.object({
  id: uuidSchema,
  outlineId: uuidSchema,
  content: z.string(),
  tags: z.array(z.string()),
  sortOrder: z.number()
});
export type OutlineQuestion = z.infer<typeof outlineQuestionSchema>;

export const outlineSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  name: z.string(),
  questions: z.array(outlineQuestionSchema).default([])
});
export type Outline = z.infer<typeof outlineSchema>;

export const canvasDocumentSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  name: z.string(),
  nodes: z.array(z.record(z.unknown())),
  edges: z.array(z.record(z.unknown())),
  viewport: z.record(z.unknown()).nullable(),
  updatedAt: z.string()
});
export type CanvasDocument = z.infer<typeof canvasDocumentSchema>;

export const aiSuggestionSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  feature: z.string(),
  provider: z.string(),
  model: z.string().nullable(),
  inputHash: z.string(),
  result: z.unknown(),
  accepted: z.boolean().nullable(),
  createdAt: z.string()
});
export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

export const createCodeSchema = z.object({
  projectId: uuidSchema,
  codeGroupId: uuidSchema,
  name: z.string().min(1),
  owner: z.string().optional()
});

export const createCodeGroupSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1),
  color: z.string().min(1).default("blue")
});

export const updateCodeGroupSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  sortOrder: z.number().int().optional()
});

export const updateCodeSchema = z.object({
  name: z.string().min(1).optional(),
  codeGroupId: uuidSchema.optional()
});

export const createInterviewSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1),
  sample: z.string().optional(),
  owner: z.string().optional(),
  length: z.string().optional(),
  participantName: z.string().optional(),
  paragraphs: z
    .array(
      z.object({
        text: z.string().min(1),
        speaker: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional()
      })
    )
    .min(1)
});

export const createAnnotationSchema = z.object({
  projectId: uuidSchema,
  paragraphId: uuidSchema,
  text: z.string().min(1),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(0),
  comment: z.string().optional(),
  codeIds: z.array(uuidSchema).min(1)
});

export const createOutlineSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1)
});

export const updateOutlineQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      id: uuidSchema.optional(),
      content: z.string().min(1),
      tags: z.array(z.string()).default([]),
      sortOrder: z.number().int().min(0)
    })
  )
});

export const createCanvasSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1)
});

export const updateCanvasSchema = z.object({
  name: z.string().min(1).optional(),
  nodes: z.array(z.record(z.unknown())).optional(),
  edges: z.array(z.record(z.unknown())).optional(),
  viewport: z.record(z.unknown()).nullable().optional()
});

export const recommendCodesRequestSchema = z.object({
  projectId: uuidSchema,
  text: z.string().min(1),
  candidateCodes: z.array(z.object({ id: uuidSchema, name: z.string() })).default([])
});

export const recommendCodesResponseSchema = z.object({
  provider: z.string(),
  degraded: z.boolean(),
  recommendations: z.array(
    z.object({
      id: uuidSchema.optional(),
      label: z.string(),
      score: z.number().min(0).max(1),
      reason: z.string()
    })
  )
});
export type RecommendCodesResponse = z.infer<typeof recommendCodesResponseSchema>;

export const extractKeywordsRequestSchema = z.object({
  projectId: uuidSchema,
  text: z.string().min(1)
});

export const textImproveRequestSchema = z.object({
  projectId: uuidSchema,
  text: z.string().min(1),
  mode: z.enum(["correct", "simplify"]).default("correct")
});

export const clusterCanvasRequestSchema = z.object({
  projectId: uuidSchema,
  nodes: z.array(z.object({ id: z.string(), label: z.string(), text: z.string().optional() }))
});

export type TextImproveResponse = {
  provider: string;
  degraded: boolean;
  text: string;
  reason: string;
};

export type CanvasClusterResponse = {
  provider: string;
  degraded: boolean;
  groups: Record<string, Array<{ id: string; label: string }>>;
};

export type AiStatus = {
  enabled: boolean;
  provider: string;
  model: string | null;
  configured: boolean;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
