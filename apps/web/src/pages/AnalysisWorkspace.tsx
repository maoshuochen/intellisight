import "@xyflow/react/dist/style.css";
import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node as FlowNode
} from "@xyflow/react";
import {
  GitBranchIcon,
  SaveIcon,
  TrashIcon
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type {
  Annotation,
  CanvasClusterResponse,
  CanvasDocument,
  Code,
  CodeGroup,
  Interview,
  Paragraph,
  RecommendCodesResponse,
  TextImproveResponse
} from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeBadge, EmptyState, InlineAlert, OptionSelect, PanelCard, TextMuted } from "@/components/ui/app-kit";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

type HighlightAnnotation = Annotation & {
  paragraphs?: {
    speaker?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    text?: string;
  };
};

export function AnalysisWorkspace() {
  const projectId = useAppStore((state) => state.projectId);
  const queryClient = useQueryClient();
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionOffsets, setSelectionOffsets] = useState({ start: 0, end: 0 });
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ top: number; left: number } | null>(null);
  const [codeSearch, setCodeSearch] = useState("");
  const [comment, setComment] = useState("");
  const [query, setQuery] = useState("");
  const [highlightQuery, setHighlightQuery] = useState("");
  const [speaker, setSpeaker] = useState<string | undefined>();
  const [centerTab, setCenterTab] = useState("transcript");
  const [canvasId, setCanvasId] = useState<string | undefined>();
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const enabled = Boolean(projectId);

  const interviews = useQuery({
    queryKey: ["interviews", projectId],
    enabled,
    queryFn: () => api.get<Interview[]>(`/interviews?projectId=${projectId}`)
  });
  const activeInterviewId = selectedInterviewId ?? interviews.data?.[0]?.id;
  const paragraphs = useQuery({
    queryKey: ["paragraphs", activeInterviewId],
    enabled: Boolean(activeInterviewId),
    queryFn: () => api.get<Paragraph[]>(`/interviews/${activeInterviewId}/paragraphs`)
  });
  const codes = useQuery({
    queryKey: ["codes", projectId],
    enabled,
    queryFn: () => api.get<Code[]>(`/codes?projectId=${projectId}`)
  });
  const codeGroups = useQuery({
    queryKey: ["code-groups", projectId],
    enabled,
    queryFn: () => api.get<CodeGroup[]>(`/code-groups?projectId=${projectId}`)
  });
  const annotations = useQuery({
    queryKey: ["annotations", projectId],
    enabled,
    queryFn: () => api.get<HighlightAnnotation[]>(`/annotations?projectId=${projectId}`)
  });
  const canvases = useQuery({
    queryKey: ["canvases", projectId],
    enabled,
    queryFn: () => api.get<CanvasDocument[]>(`/canvases?projectId=${projectId}`)
  });
  const activeCanvas = useMemo(() => canvases.data?.find((canvas) => canvas.id === (canvasId ?? canvases.data?.[0]?.id)), [canvasId, canvases.data]);

  useEffect(() => {
    if (!activeCanvas) return;
    setCanvasId(activeCanvas.id);
    setNodes(activeCanvas.nodes as FlowNode[]);
    setEdges(activeCanvas.edges as Edge[]);
  }, [activeCanvas]);

  const codeMap = useMemo(() => new Map((codes.data ?? []).map((code) => [code.id, code])), [codes.data]);
  const speakers = useMemo(
    () => [...new Set((paragraphs.data ?? []).map((paragraph) => paragraph.speaker).filter((item): item is string => Boolean(item)))],
    [paragraphs.data]
  );
  const groupedCodes = useMemo(() => {
    const map = new Map<string, Code[]>();
    for (const group of codeGroups.data ?? []) map.set(group.id, []);
    for (const code of codes.data ?? []) map.get(code.codeGroupId)?.push(code);
    return map;
  }, [codeGroups.data, codes.data]);
  const filteredCodes = useMemo(() => {
    const needle = codeSearch.trim().toLowerCase();
    return (codes.data ?? []).filter((code) => !needle || code.name.toLowerCase().includes(needle)).slice(0, 8);
  }, [codeSearch, codes.data]);
  const filteredParagraphs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (paragraphs.data ?? []).filter((paragraph) => {
      const matchesQuery = !needle || paragraph.text.toLowerCase().includes(needle);
      const matchesSpeaker = !speaker || paragraph.speaker === speaker;
      return matchesQuery && matchesSpeaker;
    });
  }, [paragraphs.data, query, speaker]);
  const filteredHighlights = useMemo(() => {
    const needle = highlightQuery.trim().toLowerCase();
    return (annotations.data ?? []).filter((annotation) => {
      if (!needle) return true;
      return annotation.text.toLowerCase().includes(needle) || annotation.paragraphs?.text?.toLowerCase().includes(needle);
    });
  }, [annotations.data, highlightQuery]);

  const recommendations = useMutation({
    mutationFn: (text: string) =>
      api.post<RecommendCodesResponse>("/ai/codes/recommend", {
        projectId,
        text,
        candidateCodes: (codes.data ?? []).map((code) => ({ id: code.id, name: code.name }))
      })
  });
  const keywords = useMutation({
    mutationFn: (text: string) => api.post<{ keywords: string[]; degraded: boolean; provider: string }>("/ai/keywords/extract", { projectId, text })
  });
  const improveText = useMutation({
    mutationFn: (mode: "correct" | "simplify") => api.post<TextImproveResponse>("/ai/text/improve", { projectId, text: selectedText, mode }),
    onError: (error) => toast.error(error.message)
  });
  const createCode = useMutation({
    mutationFn: (name: string) =>
      api.post<Code>("/codes", {
        projectId,
        codeGroupId: codeGroups.data?.[0]?.id,
        name
      }),
    onSuccess: (code) => {
      setSelectedCodeIds((ids) => (ids.includes(code.id) ? ids : [...ids, code.id]));
      void queryClient.invalidateQueries({ queryKey: ["codes", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });
  const saveAnnotation = useMutation({
    mutationFn: () =>
      api.post<Annotation>("/annotations", {
        projectId,
        paragraphId: selectedParagraphId,
        text: selectedText,
        startOffset: selectionOffsets.start,
        endOffset: selectionOffsets.end,
        comment: comment || undefined,
        codeIds: selectedCodeIds
    }),
    onSuccess: (annotation) => {
      toast.success("Annotation saved");
      addAnnotationNode(annotation);
      setSelectedText("");
      setSelectedCodeIds([]);
      setSelectionBox(null);
      setCodeSearch("");
      setComment("");
      void queryClient.invalidateQueries({ queryKey: ["annotations", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["codes", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });
  const saveCanvas = useMutation({
    mutationFn: () => api.put<CanvasDocument>(`/canvases/${activeCanvas?.id}`, { name: activeCanvas?.name, nodes, edges, viewport: null }),
    onSuccess: () => {
      toast.success("Canvas saved");
      void queryClient.invalidateQueries({ queryKey: ["canvases", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });
  const clusterCanvas = useMutation({
    mutationFn: () =>
      api.post<CanvasClusterResponse>("/ai/canvas/cluster", {
        projectId,
        nodes: nodes.map((node) => ({ id: node.id, label: String(node.data?.label ?? ""), text: String(node.data?.label ?? "") }))
      }),
    onError: (error) => toast.error(error.message)
  });

  function captureSelection(paragraph: Paragraph) {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!text) return;
    const start = paragraph.text.indexOf(text);
    const rect = selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null;
    setSelectedParagraphId(paragraph.id);
    setSelectedText(text);
    setSelectionOffsets({ start: Math.max(0, start), end: Math.max(0, start) + text.length });
    setSelectedCodeIds([]);
    setSelectionBox(rect ? { top: rect.bottom + 10, left: Math.min(rect.left + rect.width / 2, window.innerWidth - 280) } : null);
    setCodeSearch("");
    setComment("");
    recommendations.mutate(text);
    keywords.mutate(text);
  }

  function selectHighlight(annotation: HighlightAnnotation) {
    setSelectedParagraphId(annotation.paragraphId);
    setSelectedText(annotation.text);
    setSelectionOffsets({ start: annotation.startOffset, end: annotation.endOffset });
    setSelectedCodeIds(annotation.codeIds);
    setSelectionBox(null);
    setComment(annotation.comment ?? "");
    recommendations.mutate(annotation.text);
    keywords.mutate(annotation.text);
  }

  function clearSelection() {
    setSelectedText("");
    setSelectedParagraphId(null);
    setSelectedCodeIds([]);
    setSelectionBox(null);
    setCodeSearch("");
    setComment("");
  }

  function toggleCode(codeId: string) {
    setSelectedCodeIds((ids) => (ids.includes(codeId) ? ids.filter((id) => id !== codeId) : [...ids, codeId]));
  }

  function renderParagraphText(paragraph: Paragraph) {
    if (paragraph.id !== selectedParagraphId || !selectedText || selectionOffsets.end <= selectionOffsets.start) return paragraph.text;
    return (
      <>
        {paragraph.text.slice(0, selectionOffsets.start)}
        <span className="active-text-highlight">{paragraph.text.slice(selectionOffsets.start, selectionOffsets.end)}</span>
        {paragraph.text.slice(selectionOffsets.end)}
      </>
    );
  }

  function addAnnotationNode(annotation: Pick<Annotation, "id" | "text" | "codeIds">) {
    setNodes((current) => [
      ...current,
      {
        id: `annotation-${annotation.id}-${Date.now()}`,
        position: { x: 100 + current.length * 28, y: 96 + current.length * 22 },
        data: { label: annotation.text }
      }
    ]);
    setCenterTab("canvas");
  }

  function addThemeNodes() {
    if (!clusterCanvas.data) return;
    setNodes((current) => [
      ...current,
      ...Object.entries(clusterCanvas.data.groups).map(([theme, items], index) => ({
        id: `theme-${theme}-${Date.now()}-${index}`,
        position: { x: 520, y: 88 + index * 112 },
        data: { label: `${theme} (${items.length})` }
      }))
    ]);
  }

  if (!projectId) {
    return (
      <div className="page">
        <EmptyState description="Create or select a project first." />
      </div>
    );
  }

  return (
    <div className="page analysis-workspace">
      <PanelCard title="Project material" className="workspace-nav">
        <Input placeholder="Search transcript" value={query} onChange={(event) => setQuery(event.target.value)} />
        <OptionSelect
          placeholder="Speaker"
          allowClear
          value={speaker}
          onChange={setSpeaker}
          options={speakers.map((item) => ({ label: item, value: item }))}
        />
        <div className="list-stack">
          {(interviews.data ?? []).map((item) => (
            <button key={item.id} type="button" className={`list-row clickable-row ${item.id === activeInterviewId ? "active-row" : ""}`} onClick={() => setSelectedInterviewId(item.id)}>
              <strong>{item.name}</strong>
              <TextMuted>{item.participantName ?? item.sample ?? "Transcript"}</TextMuted>
            </button>
          ))}
        </div>
      </PanelCard>

      <main className="workspace-main">
        <Tabs value={centerTab} onValueChange={(value) => setCenterTab(String(value))}>
          <TabsList>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="highlights">Highlights ({filteredHighlights.length})</TabsTrigger>
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
          </TabsList>
          <TabsContent value="transcript">
            <div className="paragraph-list workspace-scroll">
              {filteredParagraphs.map((paragraph) => (
                <article className="paragraph" key={paragraph.id} onMouseUp={() => captureSelection(paragraph)}>
                  <div className="paragraph-meta">
                    <strong>{paragraph.speaker ?? "Speaker"}</strong>
                    <span>{paragraph.startTime}</span>
                  </div>
                  <p>{renderParagraphText(paragraph)}</p>
                </article>
              ))}
              {!filteredParagraphs.length && (
                <EmptyState
                  description="No transcript paragraphs match the current filters."
                  action={
                    <Button variant="outline" render={<Link to="/interviews" />}>
                      Open Interviews
                    </Button>
                  }
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="highlights">
            <div className="flex flex-col gap-4">
              <Input placeholder="Filter highlights or context" value={highlightQuery} onChange={(event) => setHighlightQuery(event.target.value)} />
              <div className="list-stack">
                {filteredHighlights.map((item) => (
                  <button key={item.id} type="button" className="list-row clickable-row" onClick={() => selectHighlight(item)}>
                    <strong>{item.text}</strong>
                    <TextMuted>{item.paragraphs?.speaker ?? "Speaker"} · {item.paragraphs?.startTime ?? ""} · Codes: {item.codeIds.length}</TextMuted>
                    <TextMuted className="line-clamp-2">{item.paragraphs?.text ?? "No context available"}</TextMuted>
                    <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); addAnnotationNode(item); }}>
                      Add to canvas
                    </Button>
                  </button>
                ))}
                {!filteredHighlights.length && (
                  <EmptyState
                    description="No highlights yet. Select transcript text, choose codes, then save an annotation."
                    action={
                      <Button variant="outline" onClick={() => setCenterTab("transcript")}>
                        Go to transcript
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="canvas">
            <div className="toolbar">
              <OptionSelect
                placeholder="Canvas"
                value={activeCanvas?.id}
                onChange={setCanvasId}
                options={(canvases.data ?? []).map((canvas) => ({ label: canvas.name, value: canvas.id }))}
                className="w-[220px]"
              />
              <Button variant="outline" disabled={!activeCanvas || saveCanvas.isPending} onClick={() => saveCanvas.mutate()}>
                <SaveIcon data-icon="inline-start" />
                Save
              </Button>
              <Button variant="outline" disabled={!nodes.length || clusterCanvas.isPending} onClick={() => clusterCanvas.mutate()}>
                <GitBranchIcon data-icon="inline-start" />
                Cluster
              </Button>
              {clusterCanvas.data && (
                <Button size="sm" onClick={addThemeNodes}>
                  Add themes
                </Button>
              )}
            </div>
            {clusterCanvas.data && (
              <InlineAlert>{`${clusterCanvas.data.degraded ? "Fallback" : "AI"} clustering produced ${Object.keys(clusterCanvas.data.groups).length} themes.`}</InlineAlert>
            )}
            {!nodes.length && (
              <EmptyState
                description="Canvas is empty. Save a coded highlight or add a highlight from the Highlights tab."
                action={
                  <Button variant="outline" onClick={() => setCenterTab("highlights")}>
                    Review highlights
                  </Button>
                }
              />
            )}
            <div className="workspace-canvas">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={(changes) => setNodes((current) => applyNodeChanges(changes, current))}
                onEdgesChange={(changes) => setEdges((current) => applyEdgeChanges(changes, current))}
                onConnect={(connection: Connection) => setEdges((current) => addEdge({ ...connection, type: "smoothstep" }, current))}
                fitView
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <PanelCard title="Quote & AI" className="workspace-side">
        {selectedText ? (
          <div className="flex flex-col gap-4">
            <p className="quote-preview">{selectedText}</p>
            {recommendations.data?.degraded && <InlineAlert>AI provider unavailable. Rule-based recommendations are shown.</InlineAlert>}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={improveText.isPending} onClick={() => improveText.mutate("correct")}>
                Correct
              </Button>
              <Button size="sm" variant="outline" disabled={improveText.isPending} onClick={() => improveText.mutate("simplify")}>
                Simplify
              </Button>
            </div>
            {improveText.data && (
              <InlineAlert>
                <div className="flex flex-col gap-2">
                  <span>{improveText.data.text}</span>
                  <TextMuted>{improveText.data.reason}</TextMuted>
                  <Button size="sm" onClick={() => setSelectedText(improveText.data.text)}>Use candidate</Button>
                </div>
              </InlineAlert>
            )}
            <TextMuted>Selected codes</TextMuted>
            <div className="badge-row">
              {selectedCodeIds.map((id) => (
                <CodeBadge key={id} onClose={() => setSelectedCodeIds((ids) => ids.filter((item) => item !== id))}>
                  {codeMap.get(id)?.name ?? id}
                </CodeBadge>
              ))}
            </div>
            <TextMuted>Recommendations</TextMuted>
            <div className="badge-row">
              {recommendations.isPending && <CodeBadge tone="gray">Loading...</CodeBadge>}
              {(recommendations.data?.recommendations ?? []).map((item) => (
                <Tooltip key={item.id ?? item.label}>
                  <TooltipTrigger>
                    <CodeBadge selected={selectedCodeIds.includes(item.id ?? "")} tone="gray" onClick={() => item.id && setSelectedCodeIds((ids) => (ids.includes(item.id!) ? ids.filter((id) => id !== item.id) : [...ids, item.id!]))}>
                      {item.label}
                    </CodeBadge>
                  </TooltipTrigger>
                  <TooltipContent>{Math.round(item.score * 100)}% · {item.reason}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            <TextMuted>Keyword candidates</TextMuted>
            <div className="badge-row">
              {keywords.isPending && <CodeBadge tone="gray">Extracting...</CodeBadge>}
              {(keywords.data?.keywords ?? []).map((keyword) => (
                <CodeBadge key={keyword} tone="green" onClick={() => createCode.mutate(keyword)}>
                  + {keyword}
                </CodeBadge>
              ))}
            </div>
            <Button disabled={!selectedParagraphId || !selectedCodeIds.length || saveAnnotation.isPending} onClick={() => saveAnnotation.mutate()}>
              Save annotation
            </Button>
          </div>
        ) : (
          <TextMuted>Select transcript text or a highlight to start coding.</TextMuted>
        )}
        <h3 className="section-title">Codes</h3>
        <div className="flex flex-col gap-3">
          {(codeGroups.data ?? []).map((group) => (
            <Card key={group.id} className="compact-card">
              <CardContent>
                <CodeBadge tone={group.color}>{group.name}</CodeBadge>
                <div className="badge-row mt-2">
                  {(groupedCodes.get(group.id) ?? []).map((code) => (
                    <CodeBadge
                      key={code.id}
                      selected={selectedCodeIds.includes(code.id)}
                      tone="gray"
                      onClick={() => setSelectedCodeIds((ids) => (ids.includes(code.id) ? ids.filter((id) => id !== code.id) : [...ids, code.id]))}
                    >
                      {code.name}
                    </CodeBadge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PanelCard>

      {selectedText && selectionBox && (
        <div className="coding-popover" style={{ top: selectionBox.top, left: selectionBox.left }}>
          <Input
            autoFocus
            placeholder="Type to search codes"
            value={codeSearch}
            onChange={(event) => setCodeSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && codeSearch.trim()) createCode.mutate(codeSearch.trim());
            }}
          />
          <TextMuted>Selected</TextMuted>
          <div className="badge-row">
            {selectedCodeIds.length ? (
              selectedCodeIds.map((id) => (
                <CodeBadge key={id} tone={codeMap.get(id)?.codeGroupId ? codeGroups.data?.find((group) => group.id === codeMap.get(id)?.codeGroupId)?.color : "arcoblue"} onClose={() => toggleCode(id)}>
                  {codeMap.get(id)?.name ?? id}
                </CodeBadge>
              ))
            ) : (
              <TextMuted>No codes selected</TextMuted>
            )}
          </div>
          <TextMuted>Recommendation</TextMuted>
          <div className="badge-row">
            {recommendations.isPending && <CodeBadge tone="gray">Loading...</CodeBadge>}
            {(recommendations.data?.recommendations ?? []).map((item) => (
              <Tooltip key={item.id ?? item.label}>
                <TooltipTrigger>
                  <CodeBadge selected={selectedCodeIds.includes(item.id ?? "")} tone="purple" onClick={() => item.id && toggleCode(item.id)}>
                    {item.label}
                  </CodeBadge>
                </TooltipTrigger>
                <TooltipContent>{Math.round(item.score * 100)}% · {item.reason}</TooltipContent>
              </Tooltip>
            ))}
            {filteredCodes.map((code) => (
              <CodeBadge key={code.id} selected={selectedCodeIds.includes(code.id)} tone="gray" onClick={() => toggleCode(code.id)}>
                {code.name}
              </CodeBadge>
            ))}
          </div>
          <div className="coding-popover-create">
            {(keywords.data?.keywords ?? []).slice(0, 2).map((keyword) => (
              <Button key={keyword} variant="ghost" className="justify-start" onClick={() => createCode.mutate(keyword)}>
                Create {keyword}
              </Button>
            ))}
            {codeSearch.trim() && !filteredCodes.some((code) => code.name.toLowerCase() === codeSearch.trim().toLowerCase()) && (
              <Button variant="ghost" className="justify-start" onClick={() => createCode.mutate(codeSearch.trim())}>
                Create {codeSearch.trim()}
              </Button>
            )}
          </div>
          <Input placeholder="Add comment" value={comment} onChange={(event) => setComment(event.target.value)} />
          <div className="coding-popover-actions">
            <Button size="icon-sm" variant="ghost" onClick={clearSelection}><TrashIcon /></Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearSelection}>Cancel</Button>
              <Button disabled={!selectedParagraphId || !selectedCodeIds.length || saveAnnotation.isPending} onClick={() => saveAnnotation.mutate()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
