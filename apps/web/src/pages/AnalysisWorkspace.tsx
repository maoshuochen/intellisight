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
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  Message,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from "@arco-design/web-react";
import { IconDelete, IconMindMapping, IconSave } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
    onError: (error) => Message.error(error.message)
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
    onError: (error) => Message.error(error.message)
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
      Message.success("Annotation saved");
      addAnnotationNode(annotation);
      setSelectedText("");
      setSelectedCodeIds([]);
      setSelectionBox(null);
      setCodeSearch("");
      setComment("");
      void queryClient.invalidateQueries({ queryKey: ["annotations", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["codes", projectId] });
    },
    onError: (error) => Message.error(error.message)
  });
  const saveCanvas = useMutation({
    mutationFn: () => api.put<CanvasDocument>(`/canvases/${activeCanvas?.id}`, { name: activeCanvas?.name, nodes, edges, viewport: null }),
    onSuccess: () => {
      Message.success("Canvas saved");
      void queryClient.invalidateQueries({ queryKey: ["canvases", projectId] });
    },
    onError: (error) => Message.error(error.message)
  });
  const clusterCanvas = useMutation({
    mutationFn: () =>
      api.post<CanvasClusterResponse>("/ai/canvas/cluster", {
        projectId,
        nodes: nodes.map((node) => ({ id: node.id, label: String(node.data?.label ?? ""), text: String(node.data?.label ?? "") }))
      }),
    onError: (error) => Message.error(error.message)
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
        <Empty description="Create or select a project first." />
      </div>
    );
  }

  return (
    <div className="page analysis-workspace">
      <aside className="workspace-nav">
        <Typography.Title heading={4}>Project material</Typography.Title>
        <Input.Search placeholder="Search transcript" value={query} onChange={setQuery} allowClear />
        <Select
          placeholder="Speaker"
          allowClear
          value={speaker}
          onChange={setSpeaker}
          options={speakers.map((item) => ({ label: item, value: item }))}
        />
        <List
          dataSource={interviews.data ?? []}
          render={(item) => (
            <List.Item key={item.id} className={item.id === activeInterviewId ? "active-row" : ""} onClick={() => setSelectedInterviewId(item.id)}>
              <List.Item.Meta title={item.name} description={item.participantName ?? item.sample ?? "Transcript"} />
            </List.Item>
          )}
        />
      </aside>

      <main className="workspace-main">
        <Tabs activeTab={centerTab} onChange={setCenterTab}>
          <Tabs.TabPane key="transcript" title="Transcript">
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
              {!filteredParagraphs.length && <Empty description="No transcript paragraphs match the current filters." />}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane key="highlights" title={`Highlights (${filteredHighlights.length})`}>
            <Space direction="vertical" className="full-width-space">
              <Input.Search placeholder="Filter highlights or context" value={highlightQuery} onChange={setHighlightQuery} allowClear />
              <List
                dataSource={filteredHighlights}
                render={(item) => (
                  <List.Item key={item.id} className="clickable-row" onClick={() => selectHighlight(item)}>
                    <List.Item.Meta
                      title={item.text}
                      description={
                        <Space direction="vertical" size={4}>
                          <Typography.Text type="secondary">
                            {item.paragraphs?.speaker ?? "Speaker"} · {item.paragraphs?.startTime ?? ""} · Codes: {item.codeIds.length}
                          </Typography.Text>
                          <Typography.Text type="secondary" ellipsis={{ rows: 2 }}>
                            {item.paragraphs?.text ?? "No context available"}
                          </Typography.Text>
                          <Button size="mini" onClick={(event) => { event.stopPropagation(); addAnnotationNode(item); }}>
                            Add to canvas
                          </Button>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Space>
          </Tabs.TabPane>
          <Tabs.TabPane key="canvas" title="Canvas">
            <Space className="toolbar" wrap>
              <Select
                placeholder="Canvas"
                value={activeCanvas?.id}
                onChange={setCanvasId}
                options={(canvases.data ?? []).map((canvas) => ({ label: canvas.name, value: canvas.id }))}
                style={{ width: 220 }}
              />
              <Button icon={<IconSave />} disabled={!activeCanvas} loading={saveCanvas.isPending} onClick={() => saveCanvas.mutate()}>
                Save
              </Button>
              <Button icon={<IconMindMapping />} disabled={!nodes.length} loading={clusterCanvas.isPending} onClick={() => clusterCanvas.mutate()}>
                Cluster
              </Button>
              {clusterCanvas.data && (
                <Button size="small" type="primary" onClick={addThemeNodes}>
                  Add themes
                </Button>
              )}
            </Space>
            {clusterCanvas.data && (
              <Alert
                className="page-alert"
                type={clusterCanvas.data.degraded ? "warning" : "info"}
                content={`${clusterCanvas.data.degraded ? "Fallback" : "AI"} clustering produced ${Object.keys(clusterCanvas.data.groups).length} themes.`}
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
          </Tabs.TabPane>
        </Tabs>
      </main>

      <aside className="workspace-side">
        <Typography.Title heading={4}>Quote & AI</Typography.Title>
        {selectedText ? (
          <Space direction="vertical" className="full-width-space">
            <Typography.Paragraph ellipsis={{ rows: 5, expandable: true }}>{selectedText}</Typography.Paragraph>
            {recommendations.data?.degraded && <Alert type="warning" content="AI provider unavailable. Rule-based recommendations are shown." />}
            <Space>
              <Button size="small" loading={improveText.isPending} onClick={() => improveText.mutate("correct")}>
                Correct
              </Button>
              <Button size="small" loading={improveText.isPending} onClick={() => improveText.mutate("simplify")}>
                Simplify
              </Button>
            </Space>
            {improveText.data && (
              <Alert
                type={improveText.data.degraded ? "warning" : "info"}
                content={
                  <Space direction="vertical" className="full-width-space">
                    <Typography.Text>{improveText.data.text}</Typography.Text>
                    <Typography.Text type="secondary">{improveText.data.reason}</Typography.Text>
                    <Button size="mini" type="primary" onClick={() => setSelectedText(improveText.data.text)}>
                      Use candidate
                    </Button>
                  </Space>
                }
              />
            )}
            <Typography.Text type="secondary">Selected codes</Typography.Text>
            <Space wrap>
              {selectedCodeIds.map((id) => (
                <Tag key={id} closable onClose={() => setSelectedCodeIds((ids) => ids.filter((item) => item !== id))}>
                  {codeMap.get(id)?.name ?? id}
                </Tag>
              ))}
            </Space>
            <Typography.Text type="secondary">Recommendations</Typography.Text>
            <Space wrap>
              {recommendations.isPending && <Tag>Loading...</Tag>}
              {(recommendations.data?.recommendations ?? []).map((item) => (
                <Tooltip key={item.id ?? item.label} content={`${Math.round(item.score * 100)}% · ${item.reason}`}>
                  <Tag
                    color={selectedCodeIds.includes(item.id ?? "") ? "arcoblue" : "gray"}
                    onClick={() => item.id && setSelectedCodeIds((ids) => (ids.includes(item.id!) ? ids.filter((id) => id !== item.id) : [...ids, item.id!]))}
                  >
                    {item.label}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
            <Typography.Text type="secondary">Keyword candidates</Typography.Text>
            <Space wrap>
              {keywords.isPending && <Tag>Extracting...</Tag>}
              {(keywords.data?.keywords ?? []).map((keyword) => (
                <Tag key={keyword} color="green" onClick={() => createCode.mutate(keyword)}>
                  + {keyword}
                </Tag>
              ))}
            </Space>
            <Button type="primary" disabled={!selectedParagraphId || !selectedCodeIds.length} loading={saveAnnotation.isPending} onClick={() => saveAnnotation.mutate()}>
              Save annotation
            </Button>
          </Space>
        ) : (
          <Typography.Text type="secondary">Select transcript text or a highlight to start coding.</Typography.Text>
        )}
        <Typography.Title heading={5}>Codes</Typography.Title>
        <Space direction="vertical" className="full-width-space">
          {(codeGroups.data ?? []).map((group) => (
            <Card key={group.id} bordered={false} className="compact-card">
              <Space direction="vertical" className="full-width-space" size={8}>
                <Tag color={group.color}>{group.name}</Tag>
                <Space wrap>
                  {(groupedCodes.get(group.id) ?? []).map((code) => (
                    <Tag
                      key={code.id}
                      color={selectedCodeIds.includes(code.id) ? "arcoblue" : "gray"}
                      onClick={() => setSelectedCodeIds((ids) => (ids.includes(code.id) ? ids.filter((id) => id !== code.id) : [...ids, code.id]))}
                    >
                      {code.name}
                    </Tag>
                  ))}
                </Space>
              </Space>
            </Card>
          ))}
        </Space>
      </aside>

      {selectedText && selectionBox && (
        <div className="coding-popover" style={{ top: selectionBox.top, left: selectionBox.left }}>
          <Input.Search
            autoFocus
            placeholder="Type to search codes"
            value={codeSearch}
            onChange={setCodeSearch}
            onPressEnter={() => codeSearch.trim() && createCode.mutate(codeSearch.trim())}
          />
          <Typography.Text type="secondary">Selected</Typography.Text>
          <Space wrap>
            {selectedCodeIds.length ? (
              selectedCodeIds.map((id) => (
                <Tag key={id} closable color={codeMap.get(id)?.codeGroupId ? codeGroups.data?.find((group) => group.id === codeMap.get(id)?.codeGroupId)?.color : "arcoblue"} onClose={() => toggleCode(id)}>
                  {codeMap.get(id)?.name ?? id}
                </Tag>
              ))
            ) : (
              <Typography.Text type="secondary">No codes selected</Typography.Text>
            )}
          </Space>
          <Typography.Text type="secondary">Recommendation</Typography.Text>
          <Space wrap>
            {recommendations.isPending && <Tag>Loading...</Tag>}
            {(recommendations.data?.recommendations ?? []).map((item) => (
              <Tooltip key={item.id ?? item.label} content={`${Math.round(item.score * 100)}% · ${item.reason}`}>
                <Tag color={selectedCodeIds.includes(item.id ?? "") ? "arcoblue" : "purple"} onClick={() => item.id && toggleCode(item.id)}>
                  {item.label}
                </Tag>
              </Tooltip>
            ))}
            {filteredCodes.map((code) => (
              <Tag key={code.id} color={selectedCodeIds.includes(code.id) ? "arcoblue" : "gray"} onClick={() => toggleCode(code.id)}>
                {code.name}
              </Tag>
            ))}
          </Space>
          <div className="coding-popover-create">
            {(keywords.data?.keywords ?? []).slice(0, 2).map((keyword) => (
              <Button key={keyword} type="text" long onClick={() => createCode.mutate(keyword)}>
                Create {keyword}
              </Button>
            ))}
            {codeSearch.trim() && !filteredCodes.some((code) => code.name.toLowerCase() === codeSearch.trim().toLowerCase()) && (
              <Button type="text" long onClick={() => createCode.mutate(codeSearch.trim())}>
                Create {codeSearch.trim()}
              </Button>
            )}
          </div>
          <Input placeholder="Add comment" value={comment} onChange={setComment} />
          <div className="coding-popover-actions">
            <Button icon={<IconDelete />} onClick={clearSelection} />
            <Space>
              <Button onClick={clearSelection}>Cancel</Button>
              <Button type="primary" disabled={!selectedParagraphId || !selectedCodeIds.length} loading={saveAnnotation.isPending} onClick={() => saveAnnotation.mutate()}>
                Save
              </Button>
            </Space>
          </div>
        </div>
      )}
    </div>
  );
}
