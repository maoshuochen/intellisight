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
  type Node
} from "@xyflow/react";
import { FileTextIcon, GitBranchIcon, PlusIcon, SaveIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Annotation, CanvasClusterResponse, CanvasDocument } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CodeBadge, EmptyState, InlineAlert, OptionSelect, PanelCard, TextMuted } from "@/components/ui/app-kit";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

export function Canvas() {
  const projectId = useAppStore((state) => state.projectId);
  const queryClient = useQueryClient();
  const [canvasId, setCanvasId] = useState<string | undefined>();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const canvases = useQuery({
    queryKey: ["canvases", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<CanvasDocument[]>(`/canvases?projectId=${projectId}`)
  });
  const annotations = useQuery({
    queryKey: ["annotations", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<Annotation[]>(`/annotations?projectId=${projectId}`)
  });
  const activeCanvas = useMemo(() => canvases.data?.find((canvas) => canvas.id === (canvasId ?? canvases.data?.[0]?.id)), [canvasId, canvases.data]);
  const themeNodeCount = nodes.filter((node) => (node.data as any)?.sourceType === "theme").length;

  useEffect(() => {
    if (!activeCanvas) return;
    setCanvasId(activeCanvas.id);
    setNodes(activeCanvas.nodes as Node[]);
    setEdges(activeCanvas.edges as Edge[]);
  }, [activeCanvas]);

  const createCanvas = useMutation({
    mutationFn: () => api.post<CanvasDocument>("/canvases", { projectId, name: "New canvas" }),
    onSuccess: (canvas) => {
      setCanvasId(canvas.id);
      void queryClient.invalidateQueries({ queryKey: ["canvases", projectId] });
    }
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

  function addAnnotationNode(annotation: Annotation) {
    addAnnotationNodes([annotation]);
  }

  function addAnnotationNodes(items: Annotation[]) {
    setNodes((current) => [
      ...current,
      ...items.map((annotation, index) => ({
        id: `annotation-${annotation.id}-${Date.now()}-${index}`,
        position: { x: 120 + ((current.length + index) % 3) * 260, y: 120 + Math.floor((current.length + index) / 3) * 140 },
        data: {
          label: annotation.text,
          sourceType: "highlight",
          annotationId: annotation.id,
          sourceAnnotationIds: [annotation.id],
          interviewName: annotation.interviewName,
          participantName: annotation.participant?.displayName,
          sampleGroup: annotation.participant?.sampleGroup
        }
      }))
    ]);
  }

  function addThemeNodes() {
    if (!clusterCanvas.data) return;
    const themes = Object.entries(clusterCanvas.data.groups);
    setNodes((current) => [
      ...current,
      ...themes.map(([theme, items], index) => ({
        id: `theme-${theme}-${Date.now()}-${index}`,
        position: { x: 520, y: 80 + index * 120 },
        data: { label: `${theme} (${items.length})`, sourceType: "theme", sourceAnnotationIds: items.map((item) => item.id.replace(/^annotation-/, "")), reportReady: true }
      }))
    ]);
    toast.success("Theme nodes added. Save the canvas, then open Reports to use them.");
  }

  function addAllHighlights() {
    const existingAnnotationIds = new Set(nodes.map((node) => String((node.data as any)?.annotationId ?? "")));
    addAnnotationNodes((annotations.data ?? []).filter((annotation) => !existingAnnotationIds.has(annotation.id)));
  }

  if (!projectId) return <EmptyState description="Create or select a project first." />;

  return (
    <div className="page split-page canvas-page">
      <PanelCard title="Canvases" className="left-panel">
        <div className="flex flex-col gap-3">
          <Button disabled={createCanvas.isPending} onClick={() => createCanvas.mutate()}>
            <PlusIcon data-icon="inline-start" />
            New canvas
          </Button>
          <OptionSelect
            placeholder="Canvas"
            value={activeCanvas?.id}
            onChange={setCanvasId}
            options={(canvases.data ?? []).map((canvas) => ({ label: canvas.name, value: canvas.id }))}
          />
          <Button variant="outline" disabled={!activeCanvas || saveCanvas.isPending} onClick={() => saveCanvas.mutate()}>
            <SaveIcon data-icon="inline-start" />
            Save canvas
          </Button>
          <Button variant="outline" disabled={!(annotations.data ?? []).length} onClick={addAllHighlights}>
            <PlusIcon data-icon="inline-start" />
            Add all highlights
          </Button>
          <Button variant="outline" disabled={!nodes.length || clusterCanvas.isPending} onClick={() => clusterCanvas.mutate()}>
            <GitBranchIcon data-icon="inline-start" />
            Cluster nodes
          </Button>
          <Button variant="outline" disabled={!themeNodeCount} render={themeNodeCount ? <Link to="/reports" /> : undefined}>
            <FileTextIcon data-icon="inline-start" />
            Themes feed reports
          </Button>
          {themeNodeCount > 0 && (
            <InlineAlert>
              {themeNodeCount} theme nodes can feed the report. Save the canvas before opening Reports so the draft uses the latest synthesis.
            </InlineAlert>
          )}
          {clusterCanvas.data && (
            <InlineAlert>
              <div className="flex flex-col gap-2">
                <span>{clusterCanvas.data.degraded ? "Fallback clustering" : "AI clustering"} preview: {Object.keys(clusterCanvas.data.groups).length} themes. Accept to add theme nodes with source links.</span>
                  <div className="badge-row">
                    {Object.entries(clusterCanvas.data.groups).map(([theme, items]) => (
                      <CodeBadge key={theme}>{theme}: {items.length}</CodeBadge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addThemeNodes}>Accept themes</Button>
                    <Button size="sm" variant="outline" onClick={() => clusterCanvas.reset()}>Discard</Button>
                  </div>
              </div>
            </InlineAlert>
          )}
          <TextMuted>Click highlights below to add them as nodes.</TextMuted>
          <div className="list-stack">
            {(annotations.data ?? []).map((item) => (
              <button key={item.id} type="button" className="list-row clickable-row" onClick={() => addAnnotationNode(item)}>
                <strong>{item.text}</strong>
                <TextMuted>{[item.interviewName, item.participant?.displayName, item.participant?.sampleGroup].filter(Boolean).join(" · ") || `${item.codeIds.length} codes`}</TextMuted>
                <div className="badge-row">
                  <CodeBadge tone="gray">{item.codeIds.length} codes</CodeBadge>
                </div>
              </button>
            ))}
            {!(annotations.data ?? []).length && <EmptyState description="No highlights yet. Code transcript quotes first, then add them to canvas for synthesis." />}
          </div>
        </div>
      </PanelCard>
      <Card className="canvas-card transcript-panel">
        <CardContent>
          {!activeCanvas && (
            <EmptyState
              description="No canvas selected."
              action={
                <Button disabled={createCanvas.isPending} onClick={() => createCanvas.mutate()}>
                  Create canvas
                </Button>
              }
            />
          )}
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
        </CardContent>
      </Card>
    </div>
  );
}
