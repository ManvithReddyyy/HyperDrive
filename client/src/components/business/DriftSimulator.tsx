import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Activity, TrendingDown } from "lucide-react";
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

interface DriftData {
    currentDrift: number;
    currentAccuracy: number;
    breakingPoint: number;
    curveData: { drift: number; accuracy: number }[];
}

interface DriftSimulatorProps {
    jobId?: string;
}

export function DriftSimulator({ jobId }: DriftSimulatorProps) {
    const [driftLevel, setDriftLevel] = useState(0);
    const [driftData, setDriftData] = useState<DriftData | null>(null);

    const mutation = useMutation({
        mutationFn: async (level: number) => {
            const res = await fetch("/api/simulation/drift", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ driftLevel: level, jobId }),
            });
            if (!res.ok) throw new Error("Failed to run simulation");
            return res.json() as Promise<DriftData>;
        },
        onSuccess: (data) => {
            setDriftData(data);
        },
    });

    // Debounced update
    const updateDrift = useCallback((value: number) => {
        setDriftLevel(value);
        mutation.mutate(value);
    }, [mutation]);

    // Initial load
    useEffect(() => {
        mutation.mutate(0);
    }, []);

    const getAccuracyColor = (accuracy: number) => {
        if (accuracy >= 90) return "text-green-600 dark:text-green-400";
        if (accuracy >= 80) return "text-yellow-600 dark:text-yellow-400";
        return "text-red-600 dark:text-red-400";
    };

    const getStatusMessage = () => {
        if (!driftData) return "";
        const { currentAccuracy, breakingPoint, currentDrift } = driftData;

        if (currentAccuracy >= 95) return "Model performing excellently";
        if (currentAccuracy >= 90) return "Model performing well";
        if (currentAccuracy >= 80) return "Performance degradation detected";
        if (currentAccuracy >= 70) return "Significant accuracy drop";
        return "Model breaking point reached";
    };

    return (
        <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Data Drift Simulator</h3>
            </div>

            <div className="space-y-6">
                {/* Slider Control */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Drift Intensity</span>
                        <span className="font-mono font-medium">{driftLevel}%</span>
                    </div>
                    <Slider
                        value={[driftLevel]}
                        onValueChange={([value]) => updateDrift(value)}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Clean Data</span>
                        <span>Severe Drift</span>
                    </div>
                </div>

                {/* Accuracy Display */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                    <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Projected Accuracy</p>
                        {driftData ? (
                            <p className={`text-2xl font-semibold ${getAccuracyColor(driftData.currentAccuracy)}`}>
                                {driftData.currentAccuracy}%
                            </p>
                        ) : (
                            <Skeleton className="h-8 w-16" />
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-0.5">Breaking Point</p>
                        {driftData ? (
                            <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                <span className="font-medium">{driftData.breakingPoint}% drift</span>
                            </div>
                        ) : (
                            <Skeleton className="h-5 w-20" />
                        )}
                    </div>
                </div>

                {/* Status Message */}
                <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className={`h-4 w-4 ${driftData && driftData.currentAccuracy < 80 ? "text-red-500" : "text-muted-foreground"}`} />
                    <span className="text-muted-foreground">{getStatusMessage()}</span>
                </div>

                {/* Chart */}
                <div className="h-48">
                    {driftData?.curveData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={driftData.curveData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                                <XAxis
                                    dataKey="drift"
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(v) => `${v}%`}
                                    stroke="#a1a1aa"
                                />
                                <YAxis
                                    domain={[40, 100]}
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(v) => `${v}%`}
                                    stroke="#a1a1aa"
                                />
                                <Tooltip
                                    formatter={(value: number) => [`${value}%`, "Accuracy"]}
                                    labelFormatter={(label) => `Drift: ${label}%`}
                                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                />
                                <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: "Threshold", fontSize: 10, fill: "#f59e0b" }} />
                                <ReferenceLine x={driftLevel} stroke="#3b82f6" strokeWidth={2} />
                                <Area
                                    type="monotone"
                                    dataKey="accuracy"
                                    fill="url(#accuracyGradient)"
                                    stroke="none"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="accuracy"
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
                    Drag the slider to simulate how your model performs under various data drift conditions.
                    The breaking point indicates when accuracy drops below 80%.
                </p>
            </div>
        </Card>
    );
}
