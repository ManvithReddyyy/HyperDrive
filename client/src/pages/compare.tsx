import { useState, useEffect } from "react";
import { Scale, FileBox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StressTester } from "@/components/business/StressTester";
import type { Job } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ComparePage() {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    const { data: jobs, isLoading } = useQuery<Job[]>({
        queryKey: ["/api/jobs"],
        queryFn: async () => {
            const res = await fetch("/api/jobs");
            if (!res.ok) throw new Error("Failed to fetch jobs");
            return res.json();
        },
    });

    const completedJobs = jobs?.filter(j => j.status === "completed") || [];

    useEffect(() => {
        if (completedJobs.length > 0 && !selectedJobId) {
            setSelectedJobId(completedJobs[0].id);
        }
    }, [completedJobs, selectedJobId]);

    return (
        <div className="h-full overflow-auto">
            <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    <h1 className="text-sm font-medium text-foreground">Compare</h1>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Compare an optimized model against its original uncompressed baseline
                </p>
            </div>

            <div className="p-6 max-w-5xl mx-auto space-y-6">
                {isLoading ? (
                     <Skeleton className="h-24 w-full" />
                ) : completedJobs.length === 0 ? (
                    <Card className="p-8 text-center">
                        <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold text-lg">No Models Available</h3>
                        <p className="text-muted-foreground mt-2">
                            Upload and optimize a model first to run the comparison engine.
                        </p>
                    </Card>
                ) : (
                    <>
                        <div className="space-y-2 w-1/2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Optimized Profile</label>
                            <Select value={selectedJobId || ""} onValueChange={setSelectedJobId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select model..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {completedJobs.map((job) => (
                                        <SelectItem key={job.id} value={job.id}>
                                            <div className="flex items-center gap-2">
                                                <FileBox className="h-4 w-4" />
                                                <span>{job.fileName}</span>
                                                <Badge variant="outline" className="text-[10px]">{job.config?.quantization || "Unknown"}</Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {selectedJobId && (
                            <StressTester jobId={selectedJobId} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
