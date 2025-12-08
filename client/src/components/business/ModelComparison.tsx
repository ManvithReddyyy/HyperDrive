import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowRight,
    FileBox,
    Trophy,
    TrendingDown,
    TrendingUp,
    Clock,
    HardDrive,
    Cpu,
    Zap,
    Minus,
    CheckCircle,
    XCircle,
    Scale
} from "lucide-react";
import type { Job } from "@shared/schema";

interface ComparisonData {
    job1: Job;
    job2: Job;
    comparison: {
        sizeImprovement: number;
        latencyImprovement: number;
        winner: "job1" | "job2" | "tie";
    };
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function MetricCard({
    label,
    value1,
    value2,
    unit = "",
    lowerIsBetter = false,
    icon: Icon
}: {
    label: string;
    value1: number | string;
    value2: number | string;
    unit?: string;
    lowerIsBetter?: boolean;
    icon: React.ElementType;
}) {
    const v1 = typeof value1 === "number" ? value1 : 0;
    const v2 = typeof value2 === "number" ? value2 : 0;

    let winner: "left" | "right" | "tie" = "tie";
    if (v1 !== v2) {
        if (lowerIsBetter) {
            winner = v1 < v2 ? "left" : "right";
        } else {
            winner = v1 > v2 ? "left" : "right";
        }
    }

    return (
        <div className="grid grid-cols-3 items-center py-4 border-b last:border-b-0">
            <div className={`text-center p-3 rounded-lg ${winner === "left" ? "bg-green-100 dark:bg-green-900/30" : ""}`}>
                <p className={`text-2xl font-bold ${winner === "left" ? "text-green-600" : ""}`}>
                    {value1}{unit}
                </p>
                {winner === "left" && <Trophy className="h-4 w-4 mx-auto mt-1 text-green-600" />}
            </div>

            <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{label}</span>
                </div>
            </div>

            <div className={`text-center p-3 rounded-lg ${winner === "right" ? "bg-green-100 dark:bg-green-900/30" : ""}`}>
                <p className={`text-2xl font-bold ${winner === "right" ? "text-green-600" : ""}`}>
                    {value2}{unit}
                </p>
                {winner === "right" && <Trophy className="h-4 w-4 mx-auto mt-1 text-green-600" />}
            </div>
        </div>
    );
}

export function ModelComparison() {
    const [job1Id, setJob1Id] = useState<string | null>(null);
    const [job2Id, setJob2Id] = useState<string | null>(null);

    // Fetch all jobs
    const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
        queryKey: ["/api/jobs"],
        queryFn: async () => {
            const res = await fetch("/api/jobs");
            if (!res.ok) throw new Error("Failed to fetch jobs");
            return res.json();
        },
    });

    const completedJobs = jobs?.filter(j => j.status === "completed") || [];

    // Auto-select first two jobs
    useEffect(() => {
        if (completedJobs.length >= 2) {
            if (!job1Id) setJob1Id(completedJobs[0].id);
            if (!job2Id && completedJobs[1]) setJob2Id(completedJobs[1].id);
        }
    }, [completedJobs, job1Id, job2Id]);

    // Fetch comparison data
    const { data: comparison, isLoading: comparisonLoading } = useQuery<ComparisonData>({
        queryKey: ["/api/compare", job1Id, job2Id],
        queryFn: async () => {
            const res = await fetch(`/api/compare/${job1Id}/${job2Id}`);
            if (!res.ok) throw new Error("Failed to fetch comparison");
            return res.json();
        },
        enabled: !!job1Id && !!job2Id && job1Id !== job2Id,
    });

    if (jobsLoading) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (completedJobs.length < 2) {
        return (
            <Card className="p-8 text-center">
                <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">Need More Models</h3>
                <p className="text-muted-foreground mt-2">
                    You need at least 2 completed optimization jobs to compare.
                    Currently you have {completedJobs.length}.
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Selection Header */}
            <div className="grid grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model A</label>
                    <Select value={job1Id || ""} onValueChange={setJob1Id}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select model..." />
                        </SelectTrigger>
                        <SelectContent>
                            {completedJobs.map((job) => (
                                <SelectItem key={job.id} value={job.id} disabled={job.id === job2Id}>
                                    <div className="flex items-center gap-2">
                                        <FileBox className="h-4 w-4" />
                                        <span>{job.fileName}</span>
                                        <Badge variant="outline" className="text-[10px]">{job.config?.quantization}</Badge>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex justify-center pb-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-sm font-medium">VS</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model B</label>
                    <Select value={job2Id || ""} onValueChange={setJob2Id}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select model..." />
                        </SelectTrigger>
                        <SelectContent>
                            {completedJobs.map((job) => (
                                <SelectItem key={job.id} value={job.id} disabled={job.id === job1Id}>
                                    <div className="flex items-center gap-2">
                                        <FileBox className="h-4 w-4" />
                                        <span>{job.fileName}</span>
                                        <Badge variant="outline" className="text-[10px]">{job.config?.quantization}</Badge>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Comparison Results */}
            {comparison && (
                <>
                    {/* Winner Banner */}
                    <Card className={`p-6 text-center ${comparison.comparison.winner === "tie"
                            ? "bg-zinc-100 dark:bg-zinc-800"
                            : "bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/40 dark:to-emerald-950/40 border-green-300"
                        }`}>
                        <div className="flex items-center justify-center gap-3">
                            {comparison.comparison.winner === "tie" ? (
                                <>
                                    <Minus className="h-6 w-6 text-zinc-500" />
                                    <span className="font-semibold text-lg">It's a Tie!</span>
                                </>
                            ) : (
                                <>
                                    <Trophy className="h-6 w-6 text-green-600" />
                                    <span className="font-semibold text-lg text-green-700 dark:text-green-400">
                                        Winner: {comparison.comparison.winner === "job1" ? comparison.job1.fileName : comparison.job2.fileName}
                                    </span>
                                </>
                            )}
                        </div>
                        {comparison.comparison.winner !== "tie" && (
                            <p className="text-sm text-muted-foreground mt-2">
                                {Math.abs(comparison.comparison.sizeImprovement)}% better size reduction
                            </p>
                        )}
                    </Card>

                    {/* Model Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        {/* Model A Card */}
                        <Card className={`p-5 ${comparison.comparison.winner === "job1" ? "border-2 border-green-400" : ""}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <FileBox className="h-5 w-5 text-blue-500" />
                                <h3 className="font-semibold truncate">{comparison.job1.fileName}</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Quantization</span>
                                    <Badge>{comparison.job1.config?.quantization}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Target</span>
                                    <span>{comparison.job1.config?.targetDevice}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Strategy</span>
                                    <span>{comparison.job1.config?.strategy}</span>
                                </div>
                            </div>
                        </Card>

                        {/* Metrics Comparison */}
                        <Card className="p-5 col-span-1 flex items-center justify-center">
                            <div className="text-center">
                                <ArrowRight className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Head-to-Head Comparison</p>
                            </div>
                        </Card>

                        {/* Model B Card */}
                        <Card className={`p-5 ${comparison.comparison.winner === "job2" ? "border-2 border-green-400" : ""}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <FileBox className="h-5 w-5 text-purple-500" />
                                <h3 className="font-semibold truncate">{comparison.job2.fileName}</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Quantization</span>
                                    <Badge>{comparison.job2.config?.quantization}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Target</span>
                                    <span>{comparison.job2.config?.targetDevice}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Strategy</span>
                                    <span>{comparison.job2.config?.strategy}</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Detailed Metrics */}
                    <Card className="p-6">
                        <h4 className="font-semibold mb-4">Detailed Metrics</h4>

                        <MetricCard
                            label="Size Reduction"
                            value1={comparison.job1.sizeReduction || 0}
                            value2={comparison.job2.sizeReduction || 0}
                            unit="%"
                            icon={TrendingDown}
                        />

                        <MetricCard
                            label="Optimized Size"
                            value1={formatBytes(comparison.job1.optimizedSize || 0)}
                            value2={formatBytes(comparison.job2.optimizedSize || 0)}
                            lowerIsBetter
                            icon={HardDrive}
                        />

                        <MetricCard
                            label="Latency"
                            value1={comparison.job1.optimizedLatency || 0}
                            value2={comparison.job2.optimizedLatency || 0}
                            unit="ms"
                            lowerIsBetter
                            icon={Clock}
                        />
                    </Card>
                </>
            )}

            {comparisonLoading && (
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            )}
        </div>
    );
}
