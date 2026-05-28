import { z } from "zod";
export type { Database, Json } from "./database.types.js";

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
  participantId: uuidSchema.nullable().optional(),
  participantName: z.string().nullable(),
  participant: z
    .object({
      id: uuidSchema,
      displayName: z.string(),
      role: z.string().nullable(),
      sampleGroup: z.string().nullable(),
      tags: z.array(z.string()).default([]),
      notes: z.string().nullable().optional()
    })
    .nullable()
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Interview = z.infer<typeof interviewSchema>;

export const participantSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  displayName: z.string(),
  role: z.string().nullable(),
  sampleGroup: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Participant = z.infer<typeof participantSchema>;

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
  definition: z.string().nullable().optional(),
  owner: z.string().nullable(),
  usage: z.number().default(0),
  createdAt: z.string()
});
export type Code = z.infer<typeof codeSchema>;

export const annotationSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  paragraphId: uuidSchema,
  interviewId: uuidSchema.optional(),
  interviewName: z.string().optional(),
  paragraphSortOrder: z.number().optional(),
  participant: z
    .object({
      id: uuidSchema.optional(),
      displayName: z.string().nullable().optional(),
      role: z.string().nullable().optional(),
      sampleGroup: z.string().nullable().optional(),
      tags: z.array(z.string()).optional()
    })
    .nullable()
    .optional(),
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

export const reportSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Report = z.infer<typeof reportSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

export const createCodeSchema = z.object({
  projectId: uuidSchema,
  codeGroupId: uuidSchema,
  name: z.string().min(1),
  definition: z.string().optional(),
  owner: z.string().optional()
});

export const createCodeGroupSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1),
  color: z.string().min(1).default("blue")
});

export const createParticipantSchema = z.object({
  projectId: uuidSchema,
  displayName: z.string().min(1),
  role: z.string().optional(),
  sampleGroup: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional()
});

export const updateParticipantSchema = z.object({
  displayName: z.string().min(1).optional(),
  role: z.string().nullable().optional(),
  sampleGroup: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional()
});

export const updateCodeGroupSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  sortOrder: z.number().int().optional()
});

export const updateCodeSchema = z.object({
  name: z.string().min(1).optional(),
  definition: z.string().nullable().optional(),
  codeGroupId: uuidSchema.optional()
});

export const createInterviewSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1),
  sample: z.string().optional(),
  owner: z.string().optional(),
  length: z.string().optional(),
  participantId: uuidSchema.optional(),
  participantName: z.string().optional(),
  participantRole: z.string().optional(),
  sampleGroup: z.string().optional(),
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

export const importTranscriptSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1),
  sample: z.string().optional(),
  participantId: uuidSchema.optional(),
  participantName: z.string().optional(),
  participantRole: z.string().optional(),
  sampleGroup: z.string().optional(),
  transcript: z.string().min(1)
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

export const updateAnnotationSchema = z.object({
  text: z.string().min(1).optional(),
  startOffset: z.number().int().min(0).optional(),
  endOffset: z.number().int().min(0).optional(),
  comment: z.string().nullable().optional(),
  codeIds: z.array(uuidSchema).min(1).optional()
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

export const createReportSchema = z.object({
  projectId: uuidSchema,
  title: z.string().min(1),
  body: z.string().default("")
});

export const updateReportSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional()
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

export const updateAiSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  projectId: uuidSchema.optional(),
  apiBase: z.string().url(),
  apiKey: z.string().optional(),
  model: z.string().min(1)
});
export type UpdateAiSettings = z.infer<typeof updateAiSettingsSchema>;

export const textImproveResponseSchema = z.object({
  provider: z.string(),
  degraded: z.boolean(),
  text: z.string(),
  reason: z.string()
});
export type TextImproveResponse = z.infer<typeof textImproveResponseSchema>;

export const canvasClusterResponseSchema = z.object({
  provider: z.string(),
  degraded: z.boolean(),
  groups: z.record(z.array(z.object({ id: z.string(), label: z.string() })))
});
export type CanvasClusterResponse = z.infer<typeof canvasClusterResponseSchema>;

export type AiStatus = {
  enabled: boolean;
  provider: string;
  model: string | null;
  apiBase: string;
  configured: boolean;
  apiKeyConfigured: boolean;
  source: "env" | "runtime";
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
