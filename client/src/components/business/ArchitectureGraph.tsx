import React, { useEffect, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
} from "reactflow";
import "reactflow/dist/style.css";

import { apiRequest } from "@/lib/queryClient";

interface GraphNode extends Node {
  data: {
    label: string;
    fused?: boolean;
  };
}

interface GraphData {
  nodes: GraphNode[];
  edges: Edge[];
}

const CustomNode = ({ data }: { data: { label: string; fused?: boolean } }) => {
  const borderClass = data.fused
    ? "border-2 border-green-500"
    : "border border-border";

  return (
    <div
      className={`px-4 py-3 rounded bg-card ${borderClass} text-card-foreground text-sm font-medium`}
    >
      {data.label}
    </div>
  );
};

const nodeTypes = {
  default: CustomNode,
};

export function ArchitectureGraph({ jobId }: { jobId: string }) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest("GET", `/api/jobs/${jobId}/graph`);
        const data = await res.json();
        setGraphData(data);
      } catch (err) {
        console.error("Failed to fetch graph data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  if (loading) {
    return <div className="text-muted-foreground">Loading architecture...</div>;
  }

  if (!graphData) {
    return <div className="text-muted-foreground">Failed to load graph data.</div>;
  }

  return (
    <div className="w-full h-full bg-muted/30 rounded border border-border overflow-hidden">
      <ReactFlow
        nodes={graphData.nodes}
        edges={graphData.edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#e4e4e7" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
