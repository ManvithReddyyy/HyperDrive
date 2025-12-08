import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SensitivityLayer {
  layer: string;
  error: number;
}

export function SensitivityChart({ jobId }: { jobId: string }) {
  const [data, setData] = useState<SensitivityLayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/sensitivity`);
        const layers = await res.json();
        setData(layers);
      } catch (err) {
        console.error("Failed to fetch sensitivity data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  if (loading) {
    return <div className="text-zinc-600">Loading sensitivity data...</div>;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { layer, error } = payload[0].payload;
      return (
        <div className="rounded bg-white border border-zinc-200 p-2 text-zinc-900 text-sm shadow-sm">
          <p className="font-medium">{layer}</p>
          <p>Error: {(error * 100).toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-sm font-semibold text-zinc-900 mb-2">
        Layer-Wise Sensitivity
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="layer"
              tick={{ fontSize: 12, fill: "#71717a" }}
              axisLine={{ stroke: "#e4e4e7" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#71717a" }}
              axisLine={{ stroke: "#e4e4e7" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="error" radius={[4, 4, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={entry.error > 0.15 ? "#ef4444" : "#e5e7eb"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
