import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Database, Calendar, HardDrive, Zap, TrendingDown, FileUp, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Job } from "@shared/schema";

export default function RegistryPage() {
    const { data: jobs, isLoading } = useQuery<Job[]>({
        queryKey: ["/api/jobs"],
    });

    // Filter only completed jobs as "registered" models
    const completedJobs = jobs?.filter(job => job.status === "completed") || [];

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "—";
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    return (
        <div className="h-full overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold flex items-center gap-2">
                            <Database className="h-6 w-6" />
                            Model Registry
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your optimized models ready for deployment
                        </p>
                    </div>
                    <Link href="/upload">
                        <Button>
                            <FileUp className="h-4 w-4 mr-2" />
                            Optimize New Model
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">Total Models</div>
                        <div className="text-2xl font-semibold">
                            {isLoading ? <Skeleton className="h-8 w-12" /> : completedJobs.length}
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">Avg. Speedup</div>
                        <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : completedJobs.length > 0 ? (
                                <>
                                    {Math.round(
                                        completedJobs.reduce((acc, job) => {
                                            if (job.originalLatency && job.optimizedLatency) {
                                                return acc + (job.originalLatency / job.optimizedLatency);
                                            }
                                            return acc;
                                        }, 0) / completedJobs.filter(j => j.originalLatency && j.optimizedLatency).length
                                    ) || 0}x faster
                                </>
                            ) : "—"}
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">Avg. Size Reduction</div>
                        <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                            {isLoading ? (
                                <Skeleton className="h-8 w-14" />
                            ) : completedJobs.length > 0 ? (
                                <>
                                    {Math.round(
                                        completedJobs.reduce((acc, job) => acc + (job.sizeReduction || 0), 0) /
                                        completedJobs.filter(j => j.sizeReduction).length
                                    ) || 0}%
                                </>
                            ) : "—"}
                        </div>
                    </Card>
                </div>

                {/* Model Table */}
                <Card>
                    {isLoading ? (
                        <div className="p-4 space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : completedJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted mb-4">
                                <Database className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No optimized models yet</p>
                            <p className="text-xs text-muted-foreground mt-1 mb-4">
                                Complete an optimization job to register a model
                            </p>
                            <Link href="/upload">
                                <Button size="sm">
                                    <FileUp className="h-4 w-4 mr-2" />
                                    Start Optimization
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Model Name</TableHead>
                                    <TableHead>Config</TableHead>
                                    <TableHead>Performance</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Optimized</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {completedJobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{job.fileName}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    #{job.id.slice(0, 8)}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 flex-wrap">
                                                <Badge variant="secondary" className="text-xs">
                                                    {job.config.quantization}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    {job.config.targetDevice}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {job.originalLatency && job.optimizedLatency ? (
                                                <div className="flex items-center gap-2">
                                                    <Zap className="h-3.5 w-3.5 text-green-500" />
                                                    <span className="text-sm">
                                                        {job.originalLatency}ms → {job.optimizedLatency}ms
                                                    </span>
                                                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                                                        {Math.round((1 - job.optimizedLatency / job.originalLatency) * 100)}% faster
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                {job.sizeReduction ? (
                                                    <>
                                                        <TrendingDown className="h-3.5 w-3.5 text-blue-500" />
                                                        <span className="text-sm">{job.sizeReduction}% smaller</span>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {formatDate(job.completedAt || job.createdAt)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/jobs/${job.id}`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            </div>
        </div>
    );
}
