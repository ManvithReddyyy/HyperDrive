import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { HardDrive, AlertTriangle, CheckCircle } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
} from "recharts";

interface MemoryData {
    currentBatchSize: number;
    vram: number;
    ram: number;
    peakVram: number;
    peakRam: number;
    vramLimit: number;
    utilizationPercent: number;
    isOOM: boolean;
    maxSafeBatch: number;
    curveData: { batchSize: number; vram: number; ram: number; peakVram: number }[];
}

interface MemoryStressTestProps {
    jobId?: string;
}

const GPU_OPTIONS = [
    { label: "RTX 3060 (12GB)", vram: 12 },
    { label: "RTX 3080 (10GB)", vram: 10 },
    { label: "RTX 3090 (24GB)", vram: 24 },
    { label: "RTX 4090 (24GB)", vram: 24 },
    { label: "A10 (24GB)", vram: 24 },
    { label: "A100 (40GB)", vram: 40 },
    { label: "A100 (80GB)", vram: 80 },
    { label: "H100 (80GB)", vram: 80 },
    { label: "L4 (24GB)", vram: 24 },
    { label: "T4 (16GB)", vram: 16 },
    { label: "V100 (16GB)", vram: 16 },
    { label: "V100 (32GB)", vram: 32 },
];

export function MemoryStressTest({ jobId }: MemoryStressTestProps) {
    const [batchSize, setBatchSize] = useState(1);
    const [selectedGpu, setSelectedGpu] = useState("RTX 4090 (24GB)");
    const [memoryData, setMemoryData] = useState<MemoryData | null>(null);

    const vramLimit = GPU_OPTIONS.find(g => g.label === selectedGpu)?.vram || 24;

    const mutation = useMutation({
        mutationFn: async ({ bs, limit }: { bs: number; limit: number }) => {
            const res = await fetch("/api/simulation/memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ batchSize: bs, jobId, vramLimit: limit }),
            });
            if (!res.ok) throw new Error("Failed to run simulation");
            return res.json() as Promise<MemoryData>;
        },
        onSuccess: (data) => {
            setMemoryData({ ...data, vramLimit });
        },
    });

    const updateBatchSize = useCallback((value: number) => {
        setBatchSize(value);
        mutation.mutate({ bs: value, limit: vramLimit });
    }, [mutation, vramLimit]);

    const updateGpu = useCallback((gpu: string) => {
        setSelectedGpu(gpu);
        const limit = GPU_OPTIONS.find(g => g.label === gpu)?.vram || 24;
        mutation.mutate({ bs: batchSize, limit });
    }, [mutation, batchSize]);

    useEffect(() => {
        mutation.mutate({ bs: 1, limit: vramLimit });
    }, []);

    const batchSizes = [1, 2, 4, 8, 16, 32, 64, 128];
    const currentIndex = batchSizes.indexOf(batchSize) !== -1 ? batchSizes.indexOf(batchSize) : 0;

    // Recalculate OOM and maxSafeBatch based on selected GPU
    const isOOM = memoryData ? memoryData.peakVram > vramLimit : false;
    const maxSafeBatch = memoryData?.curveData.filter(d => d.peakVram <= vramLimit).pop()?.batchSize || 1;

    return (
        <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Memory Stress Test</h3>
                </div>
            </div>

            <div className="space-y-5">
                {/* GPU Selector */}
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Target GPU</label>
                    <Select value={selectedGpu} onValueChange={updateGpu}>
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {GPU_OPTIONS.map((gpu) => (
                                <SelectItem key={gpu.label} value={gpu.label}>
                                    {gpu.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

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

                {/* Memory Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                        <p className="text-xs text-muted-foreground mb-0.5">VRAM Usage</p>
                        {memoryData ? (
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-semibold ${isOOM ? "text-red-600" : ""}`}>
                                    {memoryData.peakVram} GB
                                </span>
                                <span className="text-xs text-muted-foreground">/ {vramLimit} GB</span>
                            </div>
                        ) : (
                            <Skeleton className="h-7 w-20" />
                        )}
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                        <p className="text-xs text-muted-foreground mb-0.5">RAM Usage</p>
                        {memoryData ? (
                            <span className="text-xl font-semibold">{memoryData.peakRam} GB</span>
                        ) : (
                            <Skeleton className="h-7 w-16" />
                        )}
                    </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                    {memoryData ? (
                        isOOM ? (
                            <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm font-medium">OOM Risk! Reduce batch</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm">Safe to deploy</span>
                            </div>
                        )
                    ) : (
                        <Skeleton className="h-5 w-32" />
                    )}
                    {memoryData && (
                        <Badge variant="outline" className="text-xs">
                            Max safe: {maxSafeBatch}
                        </Badge>
                    )}
                </div>

                {/* Chart */}
                <div className="h-36">
                    {memoryData?.curveData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={memoryData.curveData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                                <XAxis dataKey="batchSize" tick={{ fontSize: 10 }} stroke="#a1a1aa" />
                                <YAxis tick={{ fontSize: 10 }} stroke="#a1a1aa" />
                                <Tooltip
                                    formatter={(value: number, name: string) => [`${value} GB`, name === "peakVram" ? "Peak VRAM" : name]}
                                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                />
                                <ReferenceLine y={vramLimit} stroke="#ef4444" strokeDasharray="5 5" />
                                <Bar dataKey="peakVram" name="Peak VRAM">
                                    {memoryData.curveData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.peakVram > vramLimit ? "#ef4444" : "#3b82f6"}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <Skeleton className="h-full w-full" />
                    )}
                </div>

                <p className="text-xs text-muted-foreground">
                    Red bars exceed {vramLimit}GB VRAM limit for {selectedGpu.split(" (")[0]}.
                </p>
            </div>
        </Card>
    );
}

