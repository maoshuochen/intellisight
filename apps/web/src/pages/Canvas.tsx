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
import { Alert, Button, Card, Empty, List, Message, Select, Space, Tag, Typography } from "@arco-design/web-react";
import { IconMindMapping, IconPlus, IconSave } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { Annotation, CanvasClusterResponse, CanvasDocument } from "@intellisight/shared";
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

  function addAnnotationNode(annotation: Annotation) {
    setNodes((current) => [
      ...current,
      {
        id: `annotation-${annotation.id}-${Date.now()}`,
        position: { x: 120 + current.length * 32, y: 120 + current.length * 24 },
        data: { label: annotation.text }
      }
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
        data: { label: `${theme} (${items.length})` }
      }))
    ]);
  }

  if (!projectId) return <Empty description="Create or select a project first." />;

  return (
    <div className="page split-page canvas-workspace">
      <Card className="left-panel" bordered={false}>
        <Space direction="vertical" className="full-width-space">
          <Typography.Title heading={4}>Canvases</Typography.Title>
          <Button icon={<IconPlus />} type="primary" long loading={createCanvas.isPending} onClick={() => createCanvas.mutate()}>
            New canvas
          </Button>
          <Select
            placeholder="Canvas"
            value={activeCanvas?.id}
            onChange={setCanvasId}
            options={(canvases.data ?? []).map((canvas) => ({ label: canvas.name, value: canvas.id }))}
          />
          <Button icon={<IconSave />} long disabled={!activeCanvas} loading={saveCanvas.isPending} onClick={() => saveCanvas.mutate()}>
            Save canvas
          </Button>
          <Button icon={<IconMindMapping />} long disabled={!nodes.length} loading={clusterCanvas.isPending} onClick={() => clusterCanvas.mutate()}>
            Cluster nodes
          </Button>
          {clusterCanvas.data && (
            <Alert
              type={clusterCanvas.data.degraded ? "warning" : "info"}
              content={
                <Space direction="vertical" className="full-width-space">
                  <Typography.Text>{clusterCanvas.data.degraded ? "Fallback clustering" : "AI clustering"} produced {Object.keys(clusterCanvas.data.groups).length} themes.</Typography.Text>
                  <Space wrap>
                    {Object.entries(clusterCanvas.data.groups).map(([theme, items]) => (
                      <Tag key={theme}>{theme}: {items.length}</Tag>
                    ))}
                  </Space>
                  <Button size="mini" type="primary" onClick={addThemeNodes}>
                    Add theme nodes
                  </Button>
                </Space>
              }
            />
          )}
          <Typography.Text type="secondary">Click highlights below to add them as nodes.</Typography.Text>
          <List
            dataSource={annotations.data ?? []}
            render={(item) => (
              <List.Item key={item.id} className="clickable-row" onClick={() => addAnnotationNode(item)}>
                <List.Item.Meta title={item.text} description={`${item.codeIds.length} codes`} />
              </List.Item>
            )}
          />
        </Space>
      </Card>
      <Card bordered={false} className="canvas-card transcript-panel">
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
      </Card>
    </div>
  );
}
