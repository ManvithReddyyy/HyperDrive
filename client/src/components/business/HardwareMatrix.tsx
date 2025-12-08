import React, { useEffect, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface HardwareOption {
  name: string;
  cost_per_hour: number;
  throughput_tokens_s: number;
}

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { name, cost_per_hour, throughput_tokens_s } = payload[0].payload;

    // "Recommended" if high speed AND low cost
    const recommended =
      throughput_tokens_s > 300 && cost_per_hour < 2.0;

    return (
      <div className="rounded bg-white border border-zinc-200 p-3 text-zinc-900 text-sm shadow-sm">
        <p className="font-medium">{name}</p>
        <p className="text-xs text-zinc-600">
          Cost: ${cost_per_hour.toFixed(2)}/hr
        </p>
        <p className="text-xs text-zinc-600">
          Speed: {throughput_tokens_s} tokens/s
        </p>
        {recommended && (
          <p className="text-xs font-semibold text-green-600 mt-1">
            ✓ Recommended
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function HardwareMatrix() {
  const [data, setData] = useState<HardwareOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/hardware-matrix");
        const options = await res.json();
        setData(options);
      } catch (err) {
        console.error("Failed to fetch hardware matrix:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="text-zinc-600">Loading hardware options...</div>;
  }

  const getColor = (item: HardwareOption) => {
    // Recommended: high speed, low cost
    if (item.throughput_tokens_s > 300 && item.cost_per_hour < 2.0) {
      return "#22c55e"; // green
    }
    // Good balance
    if (item.throughput_tokens_s > 100 && item.cost_per_hour < 1.0) {
      return "#3b82f6"; // blue
    }
    // Default
    return "#a1a5b4"; // gray
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-sm font-semibold text-zinc-900 mb-2">
        Deployment Hardware Options
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis
              type="number"
              dataKey="cost_per_hour"
              name="Cost ($/hour)"
              tick={{ fontSize: 12, fill: "#71717a" }}
              axisLine={{ stroke: "#e4e4e7" }}
            />
            <YAxis
              type="number"
              dataKey="throughput_tokens_s"
              name="Speed (tokens/s)"
              tick={{ fontSize: 12, fill: "#71717a" }}
              axisLine={{ stroke: "#e4e4e7" }}
            />
            <Tooltip content={<CustomScatterTooltip />} />
            <Scatter name="Hardware" data={data} fill="#3b82f6">
              {data.map((item, idx) => (
                <Cell key={`cell-${idx}`} fill={getColor(item)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-zinc-600 mt-2 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Recommended</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Good Balance</span>
        </div>
      </div>
    </div>
  );
}
