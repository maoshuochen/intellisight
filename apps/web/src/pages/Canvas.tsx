import "@xyflow/react/dist/style.css";
import { Background, Controls, ReactFlow, applyEdgeChanges, applyNodeChanges, type Edge, type Node } from "@xyflow/react";
import { Card, Typography } from "@arco-design/web-react";
import { useMemo, useState } from "react";

export function Canvas() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: "1", position: { x: 80, y: 80 }, data: { label: "Drag highlights here" } },
    { id: "2", position: { x: 360, y: 180 }, data: { label: "Cluster themes" } }
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const flow = useMemo(() => ({ nodes, edges }), [nodes, edges]);

  return (
    <div className="page canvas-page">
      <Typography.Title heading={3}>Canvas analysis</Typography.Title>
      <Card bordered={false} className="canvas-card">
        <ReactFlow
          nodes={flow.nodes}
          edges={flow.edges}
          onNodesChange={(changes) => setNodes((current) => applyNodeChanges(changes, current))}
          onEdgesChange={(changes) => setEdges((current) => applyEdgeChanges(changes, current))}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </Card>
    </div>
  );
}
