type DemoProject = {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type DemoInterview = {
  id: string;
  projectId: string;
  name: string;
  sample: string | null;
  owner: string | null;
  length: string | null;
  participantName: string | null;
  createdAt: string;
  updatedAt: string;
};

type DemoParagraph = {
  id: string;
  projectId: string;
  interviewId: string;
  text: string;
  speaker: string | null;
  startTime: string | null;
  endTime: string | null;
  sortOrder: number;
};

type DemoCodeGroup = {
  id: string;
  projectId: string;
  name: string;
  color: string;
  sortOrder: number;
};

type DemoCode = {
  id: string;
  projectId: string;
  codeGroupId: string;
  name: string;
  definition: string | null;
  owner: string | null;
  usage: number;
  createdAt: string;
};

type DemoAnnotation = {
  id: string;
  projectId: string;
  paragraphId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  comment: string | null;
  codeIds: string[];
  createdAt: string;
  updatedAt: string;
  paragraphs?: Pick<DemoParagraph, "speaker" | "startTime" | "endTime" | "text">;
};

type DemoCanvas = {
  id: string;
  projectId: string;
  name: string;
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
  viewport: Record<string, unknown> | null;
  updatedAt: string;
};

type DemoReport = {
  id: string;
  projectId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type DemoOutline = {
  id: string;
  projectId: string;
  name: string;
  questions: Array<{ id: string; outlineId: string; content: string; tags: string[]; sortOrder: number }>;
};

type DemoState = {
  projects: DemoProject[];
  interviews: DemoInterview[];
  paragraphs: DemoParagraph[];
  codeGroups: DemoCodeGroup[];
  codes: DemoCode[];
  annotations: DemoAnnotation[];
  canvases: DemoCanvas[];
  reports: DemoReport[];
  outlines: DemoOutline[];
  aiStatus: {
    enabled: boolean;
    provider: string;
    model: string | null;
    apiBase: string;
    configured: boolean;
    apiKeyConfigured: boolean;
    source: "env" | "runtime";
  };
};

const storageKey = "intellisight.demoState.v1";

export async function demoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  await new Promise((resolve) => window.setTimeout(resolve, 80));
  const method = init.method ?? "GET";
  const state = loadState();
  const url = new URL(path, "https://demo.intellisight.local");
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const now = new Date().toISOString();

  if (url.pathname === "/projects" && method === "GET") return state.projects as T;
  if (url.pathname === "/projects" && method === "POST") {
    const project: DemoProject = { id: id(), name: body.name, description: body.description ?? null, createdBy: "demo-user", createdAt: now, updatedAt: now };
    state.projects.unshift(project);
    addDefaultCodeGroups(state, project.id);
    saveState(state);
    return project as T;
  }

  if (url.pathname === "/interviews" && method === "GET") {
    return state.interviews.filter((item) => item.projectId === url.searchParams.get("projectId")) as T;
  }
  if (url.pathname === "/interviews" && method === "POST") {
    const interview = createInterview(state, body, now);
    saveState(state);
    return interview as T;
  }
  if (url.pathname === "/interviews/import" && method === "POST") {
    const paragraphs = parseTranscript(body.transcript);
    const interview = createInterview(state, { ...body, sample: "Imported transcript", paragraphs }, now);
    saveState(state);
    return { ...interview, paragraphCount: paragraphs.length } as T;
  }
  const paragraphMatch = url.pathname.match(/^\/interviews\/(.+)\/paragraphs$/);
  if (paragraphMatch && method === "GET") {
    return state.paragraphs.filter((item) => item.interviewId === paragraphMatch[1]).sort((a, b) => a.sortOrder - b.sortOrder) as T;
  }

  if (url.pathname === "/code-groups" && method === "GET") {
    return state.codeGroups.filter((item) => item.projectId === url.searchParams.get("projectId")).sort((a, b) => a.sortOrder - b.sortOrder) as T;
  }
  if (url.pathname === "/code-groups" && method === "POST") {
    const group: DemoCodeGroup = { id: id(), projectId: body.projectId, name: body.name, color: body.color ?? "blue", sortOrder: state.codeGroups.length + 1 };
    state.codeGroups.push(group);
    saveState(state);
    return group as T;
  }
  const groupMatch = url.pathname.match(/^\/code-groups\/(.+)$/);
  if (groupMatch && method === "PATCH") {
    const group = mustFind(state.codeGroups, matchId(groupMatch));
    Object.assign(group, body);
    saveState(state);
    return group as T;
  }

  if (url.pathname === "/codes" && method === "GET") {
    return state.codes.filter((item) => item.projectId === url.searchParams.get("projectId")).map((code) => ({ ...code, usage: usage(state, code.id) })) as T;
  }
  if (url.pathname === "/codes" && method === "POST") {
    const code: DemoCode = { id: id(), projectId: body.projectId, codeGroupId: body.codeGroupId, name: body.name, definition: body.definition ?? null, owner: "demo", usage: 0, createdAt: now };
    state.codes.push(code);
    saveState(state);
    return code as T;
  }
  const codeMatch = url.pathname.match(/^\/codes\/(.+)$/);
  if (codeMatch && method === "PATCH") {
    const code = mustFind(state.codes, matchId(codeMatch));
    Object.assign(code, body);
    saveState(state);
    return code as T;
  }
  if (codeMatch && method === "DELETE") {
    state.codes = state.codes.filter((item) => item.id !== codeMatch[1]);
    state.annotations.forEach((annotation) => {
      annotation.codeIds = annotation.codeIds.filter((codeId) => codeId !== codeMatch[1]);
    });
    saveState(state);
    return undefined as T;
  }

  if (url.pathname === "/annotations" && method === "GET") {
    return state.annotations
      .filter((item) => item.projectId === url.searchParams.get("projectId"))
      .map((annotation) => ({ ...annotation, paragraphs: paragraphSummary(state, annotation.paragraphId) })) as T;
  }
  if (url.pathname === "/annotations" && method === "POST") {
    const annotation: DemoAnnotation = { id: id(), projectId: body.projectId, paragraphId: body.paragraphId, text: body.text, startOffset: body.startOffset, endOffset: body.endOffset, comment: body.comment ?? null, codeIds: body.codeIds, createdAt: now, updatedAt: now };
    state.annotations.unshift(annotation);
    saveState(state);
    return annotation as T;
  }

  if (url.pathname === "/canvases" && method === "GET") {
    return state.canvases.filter((item) => item.projectId === url.searchParams.get("projectId")) as T;
  }
  if (url.pathname === "/canvases" && method === "POST") {
    const canvas: DemoCanvas = { id: id(), projectId: body.projectId, name: body.name, nodes: [], edges: [], viewport: null, updatedAt: now };
    state.canvases.unshift(canvas);
    saveState(state);
    return canvas as T;
  }
  const canvasMatch = url.pathname.match(/^\/canvases\/(.+)$/);
  if (canvasMatch && method === "PUT") {
    const canvas = mustFind(state.canvases, matchId(canvasMatch));
    Object.assign(canvas, body, { updatedAt: now });
    saveState(state);
    return canvas as T;
  }

  if (url.pathname === "/reports" && method === "GET") return state.reports.filter((item) => item.projectId === url.searchParams.get("projectId")) as T;
  if (url.pathname === "/reports" && method === "POST") {
    const report: DemoReport = { id: id(), projectId: body.projectId, title: body.title, body: body.body, createdAt: now, updatedAt: now };
    state.reports.unshift(report);
    saveState(state);
    return report as T;
  }

  if (url.pathname === "/outlines" && method === "GET") return state.outlines.filter((item) => item.projectId === url.searchParams.get("projectId")) as T;
  if (url.pathname === "/outlines" && method === "POST") {
    const outline: DemoOutline = { id: id(), projectId: body.projectId, name: body.name, questions: [] };
    state.outlines.unshift(outline);
    saveState(state);
    return outline as T;
  }
  const outlineMatch = url.pathname.match(/^\/outlines\/(.+)$/);
  if (outlineMatch && method === "PATCH") {
    const outline = mustFind(state.outlines, matchId(outlineMatch));
    Object.assign(outline, body);
    saveState(state);
    return outline as T;
  }
  const outlineQuestionsMatch = url.pathname.match(/^\/outlines\/(.+)\/questions$/);
  if (outlineQuestionsMatch && method === "PUT") {
    const outline = mustFind(state.outlines, matchId(outlineQuestionsMatch));
    outline.questions = body.questions.map((question: { content: string; tags?: string[]; sortOrder: number }) => ({ id: id(), outlineId: outline.id, content: question.content, tags: question.tags ?? [], sortOrder: question.sortOrder }));
    saveState(state);
    return outline as T;
  }

  if (url.pathname === "/ai/status" && method === "GET") return state.aiStatus as T;
  if (url.pathname === "/ai/settings" && method === "PUT") {
    state.aiStatus = { enabled: body.enabled, provider: "openai-compatible", model: body.apiKey ? body.model : null, apiBase: body.apiBase, configured: Boolean(body.apiKey), apiKeyConfigured: Boolean(body.apiKey), source: "runtime" };
    saveState(state);
    return state.aiStatus as T;
  }
  if (url.pathname === "/ai/codes/recommend" && method === "POST") {
    return { provider: "demo-rules", degraded: true, recommendations: body.candidateCodes.slice(0, 3).map((code: { id: string; name: string }, index: number) => ({ id: code.id, label: code.name, score: 0.9 - index * 0.12, reason: "Demo similarity match" })) } as T;
  }
  if (url.pathname === "/ai/keywords/extract" && method === "POST") {
    return { provider: "demo-rules", degraded: true, keywords: extractKeywords(body.text) } as T;
  }
  if (url.pathname === "/ai/text/improve" && method === "POST") {
    return { provider: "demo-rules", degraded: true, text: body.text, reason: "Demo mode keeps the original wording." } as T;
  }
  if (url.pathname === "/ai/canvas/cluster" && method === "POST") {
    return { provider: "demo-rules", degraded: true, groups: { "Emerging theme": body.nodes ?? [] } } as T;
  }

  throw new Error(`Demo API route not implemented: ${method} ${url.pathname}`);
}

function loadState(): DemoState {
  const existing = localStorage.getItem(storageKey);
  if (existing) return JSON.parse(existing) as DemoState;
  const seeded = seedState();
  saveState(seeded);
  return seeded;
}

function saveState(state: DemoState) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function seedState(): DemoState {
  const now = new Date().toISOString();
  const projectId = id();
  const interviewId = id();
  const needGroup: DemoCodeGroup = { id: id(), projectId, name: "Need", color: "blue", sortOrder: 1 };
  const painGroup: DemoCodeGroup = { id: id(), projectId, name: "Pain Point", color: "orange", sortOrder: 2 };
  const opportunityGroup: DemoCodeGroup = { id: id(), projectId, name: "Opportunity", color: "purple", sortOrder: 3 };
  const needId = id();
  const painId = id();
  const opportunityId = id();
  return {
    projects: [{ id: projectId, name: "Demo Research Project", description: null, createdBy: "demo-user", createdAt: now, updatedAt: now }],
    interviews: [{ id: interviewId, projectId, name: "Kitchen workflow interview", sample: "Demo transcript", owner: "demo", length: "08:20", participantName: "Participant A", createdAt: now, updatedAt: now }],
    paragraphs: [
      { id: id(), projectId, interviewId, speaker: "Researcher", startTime: "00:00", endTime: null, sortOrder: 1, text: "How do you usually prepare meals during a busy weekday?" },
      { id: id(), projectId, interviewId, speaker: "Participant", startTime: "00:18", endTime: null, sortOrder: 2, text: "Storage is always the hard part. We buy ingredients locally, but the kitchen is small and everything competes for space." },
      { id: id(), projectId, interviewId, speaker: "Participant", startTime: "00:52", endTime: null, sortOrder: 3, text: "Fast cooking matters more than fancy tools. If something saves ten minutes and is easy to clean, I use it every week." }
    ],
    codeGroups: [needGroup, painGroup, opportunityGroup],
    codes: [
      { id: needId, projectId, codeGroupId: needGroup.id, name: "Small kitchen storage", definition: "Limited storage creates friction in daily meal preparation.", owner: "demo", usage: 0, createdAt: now },
      { id: painId, projectId, codeGroupId: painGroup.id, name: "Cleanup burden", definition: "Tools are avoided when cleanup costs outweigh time savings.", owner: "demo", usage: 0, createdAt: now },
      { id: opportunityId, projectId, codeGroupId: opportunityGroup.id, name: "Fast weekday cooking", definition: "Products that save time without extra complexity feel valuable.", owner: "demo", usage: 0, createdAt: now }
    ],
    annotations: [],
    canvases: [{ id: id(), projectId, name: "Theme analysis", nodes: [], edges: [], viewport: null, updatedAt: now }],
    reports: [],
    outlines: [],
    aiStatus: { enabled: true, provider: "demo-rules", model: null, apiBase: "demo://local", configured: false, apiKeyConfigured: false, source: "runtime" }
  };
}

function addDefaultCodeGroups(state: DemoState, projectId: string) {
  state.codeGroups.push(
    { id: id(), projectId, name: "Need", color: "blue", sortOrder: 1 },
    { id: id(), projectId, name: "Pain Point", color: "orange", sortOrder: 2 },
    { id: id(), projectId, name: "Opportunity", color: "purple", sortOrder: 3 }
  );
}

function createInterview(state: DemoState, body: any, now: string) {
  const interview: DemoInterview = { id: id(), projectId: body.projectId, name: body.name, sample: body.sample ?? null, owner: "demo", length: body.length ?? null, participantName: body.participantName ?? null, createdAt: now, updatedAt: now };
  state.interviews.unshift(interview);
  state.paragraphs.push(...body.paragraphs.map((paragraph: any, index: number) => ({ id: id(), projectId: body.projectId, interviewId: interview.id, text: paragraph.text, speaker: paragraph.speaker ?? null, startTime: paragraph.startTime ?? null, endTime: paragraph.endTime ?? null, sortOrder: index + 1 })));
  return interview;
}

function parseTranscript(input: string) {
  return input.split(/\n+/).map((line: string) => {
    const match = line.trim().match(/^(?:(?<speaker>[A-Za-z][\w .'-]{0,48})\s*)?(?:\[?(?<time>\d{1,2}:\d{2}(?::\d{2})?)\]?)?\s*[:\-–]\s*(?<text>.+)$/);
    return { speaker: match?.groups?.speaker, startTime: match?.groups?.time, text: match?.groups?.text ?? line.trim() };
  }).filter((paragraph) => paragraph.text);
}

function paragraphSummary(state: DemoState, paragraphId: string) {
  const paragraph = state.paragraphs.find((item) => item.id === paragraphId);
  return paragraph ? { speaker: paragraph.speaker, startTime: paragraph.startTime, endTime: paragraph.endTime, text: paragraph.text } : undefined;
}

function usage(state: DemoState, codeId: string) {
  return state.annotations.filter((annotation) => annotation.codeIds.includes(codeId)).length;
}

function extractKeywords(text: string) {
  return [...new Set(text.toLowerCase().match(/[a-z][a-z-]{4,}/g) ?? [])].slice(0, 4).map((word) => word.replace(/^\w/, (letter) => letter.toUpperCase()));
}

function mustFind<T extends { id: string }>(items: T[], itemId: string): T {
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error("Demo item not found");
  return item;
}

function matchId(match: RegExpMatchArray) {
  const value = match[1];
  if (!value) throw new Error("Missing demo route id");
  return value;
}

function id() {
  return crypto.randomUUID();
}
