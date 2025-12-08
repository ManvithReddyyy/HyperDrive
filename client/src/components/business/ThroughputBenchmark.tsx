import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Gauge, TrendingUp, Zap } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Area,
    ComposedChart,
} from "recharts";

interface ThroughputData {
    currentBatchSize: number;
    throughput: number;
    latencyMs: number;
    unit: string;
    optimalBatchSize: number;
    maxThroughput: number;
    curveData: { batchSize: number; throughput: number; latency: number; efficiency: number }[];
}

interface ThroughputBenchmarkProps {
    jobId?: string;
}

export function ThroughputBenchmark({ jobId }: ThroughputBenchmarkProps) {
    const [batchSize, setBatchSize] = useState(1);
    const [data, setData] = useState<ThroughputData | null>(null);

    const mutation = useMutation({
        mutationFn: async (bs: number) => {
            const res = await fetch("/api/simulation/throughput", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ batchSize: bs, jobId }),
            });
            if (!res.ok) throw new Error("Failed to run simulation");
            return res.json() as Promise<ThroughputData>;
        },
        onSuccess: (result) => {
            setData(result);
        },
    });

    const updateBatchSize = useCallback((value: number) => {
        setBatchSize(value);
        mutation.mutate(value);
    }, [mutation]);

    useEffect(() => {
        mutation.mutate(1);
    }, []);

    const batchSizes = [1, 2, 4, 8, 16, 32, 64, 128];
    const currentIndex = batchSizes.indexOf(batchSize) !== -1 ? batchSizes.indexOf(batchSize) : 0;

    const isOptimal = data && batchSize === data.optimalBatchSize;

    return (
        <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Throughput Benchmark</h3>
            </div>

            <div className="space-y-6">
                {/* Batch Size Selector */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Batch Size</span>
                        <span className="font-mono font-medium">{batchSize}</span>
                    </div>
                    <Slider
                        value={[currentIndex]}
                        onValueChange={([idx]) => updateBatchSize(batchSizes[idx])}
                        min={0}
                        max={batchSizes.length - 1}
                        step={1}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1</span>
                        <span>128</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                        <p className="text-xs text-muted-foreground mb-0.5">Throughput</p>
                        {data ? (
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-semibold ${isOptimal ? "text-green-600 dark:text-green-400" : ""}`}>
                                    {data.throughput.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">{data.unit}</span>
                            </div>
                        ) : (
                            <Skeleton className="h-7 w-24" />
                        )}
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                        <p className="text-xs text-muted-foreground mb-0.5">Latency</p>
                        {data ? (
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-semibold">{data.latencyMs}</span>
                                <span className="text-xs text-muted-foreground">ms/batch</span>
                            </div>
                        ) : (
                            <Skeleton className="h-7 w-16" />
                        )}
                    </div>
                </div>

                {/* Optimal Indicator */}
                <div className="flex items-center justify-between">
                    {data ? (
                        isOptimal ? (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <Zap className="h-4 w-4" />
                                <span className="text-sm font-medium">Optimal batch size!</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <TrendingUp className="h-4 w-4" />
                                <span className="text-sm">
                                    Try batch={data.optimalBatchSize} for +{Math.round((data.maxThroughput / data.throughput - 1) * 100)}% throughput
                                </span>
                            </div>
                        )
                    ) : (
                        <Skeleton className="h-5 w-40" />
                    )}
                    {data && (
                        <Badge variant={isOptimal ? "default" : "outline"} className="text-xs">
                            Max: {data.maxThroughput.toLocaleString()}/s
                        </Badge>
                    )}
                </div>

                {/* Chart */}
                <div className="h-40">
                    {data?.curveData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.curveData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                                <XAxis dataKey="batchSize" tick={{ fontSize: 10 }} stroke="#a1a1aa" />
                                <YAxis tick={{ fontSize: 10 }} stroke="#a1a1aa" />
                                <Tooltip
                                    formatter={(value: number, name: string) => [
                                        name === "throughput" ? `${value.toLocaleString()}/s` : `${value}%`,
                                        name === "throughput" ? "Throughput" : "Efficiency"
                                    ]}
                                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                />
                                <ReferenceLine x={batchSize} stroke="#3b82f6" strokeWidth={2} />
                                <ReferenceLine x={data.optimalBatchSize} stroke="#22c55e" strokeDasharray="5 5" />
                                <Area
                                    type="monotone"
                                    dataKey="throughput"
                                    fill="url(#throughputGradient)"
                                    stroke="none"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="throughput"
                                    stroke="#18181b"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: "#18181b" }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <Skeleton className="h-full w-full" />
                    )}
                </div>

                <p className="text-xs text-muted-foreground">
                    Find the optimal batch size for maximum throughput. Green dashed line shows the sweet spot.
                </p>
            </div>
        </Card>
    );
}
