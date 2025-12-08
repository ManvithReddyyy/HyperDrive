import React, { useEffect, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
} from "reactflow";
import "reactflow/dist/style.css";

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
    : "border border-zinc-200";

  return (
    <div
      className={`px-4 py-3 rounded bg-white ${borderClass} text-zinc-900 text-sm font-medium`}
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
        const res = await fetch(`/api/jobs/${jobId}/graph`);
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
    return <div className="text-zinc-600">Loading architecture...</div>;
  }

  if (!graphData) {
    return <div className="text-zinc-600">Failed to load graph data.</div>;
  }

  return (
    <div className="w-full h-full bg-zinc-50 rounded border border-zinc-200 overflow-hidden">
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
