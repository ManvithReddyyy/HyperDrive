import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SensitivityChart } from "@/components/business/SensitivityChart";
import { OptimizedSensitivityChart } from "@/components/business/OptimizedSensitivityChart";
import { ArchitectureGraph } from "@/components/business/ArchitectureGraph";
import { HardwareMatrix } from "@/components/business/HardwareMatrix";
import type { Job } from "@shared/schema";

export default function AnalysisPage() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  // Fetch all jobs
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      return res.json();
    },
  });

  // Filter completed jobs only
  const completedJobs = jobs.filter(j => j.status === "completed");

  // Auto-select first completed job if available
  const jobToAnalyze = selectedJobId || completedJobs[0]?.id;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/jobs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-sm font-medium text-foreground">Analysis</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Select Job:</label>
          <Select value={jobToAnalyze || ""} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a completed job..." />
            </SelectTrigger>
            <SelectContent>
              {completedJobs.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No completed jobs found
                </div>
              ) : (
                completedJobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.fileName} - {job.id.slice(0, 8)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!jobToAnalyze ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">No completed jobs available</p>
            <p className="text-xs text-muted-foreground">Run an optimization to see analysis</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden p-6">
          <Tabs defaultValue="sensitivity" className="h-full flex flex-col">
            <TabsList className="w-full justify-start mb-4">
              <TabsTrigger value="sensitivity">Layer Sensitivity</TabsTrigger>
              <TabsTrigger value="architecture">Architecture</TabsTrigger>
              <TabsTrigger value="hardware">Hardware Options</TabsTrigger>
            </TabsList>

            <TabsContent value="sensitivity" className="flex-1 min-h-0">
              <div className="h-full grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase">Before Optimization</h3>
                  <div className="flex-1 bg-zinc-50 rounded border border-border p-4 overflow-auto">
                    <SensitivityChart jobId={jobToAnalyze} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase">After Optimization</h3>
                  <div className="flex-1 bg-zinc-50 rounded border border-border p-4 overflow-auto">
                    <OptimizedSensitivityChart jobId={jobToAnalyze} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="architecture" className="flex-1 min-h-0">
              <div className="h-full grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase">Original Architecture</h3>
                  <div className="flex-1 bg-zinc-50 rounded border border-border overflow-hidden">
                    <ArchitectureGraph jobId={jobToAnalyze} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase">Optimized Architecture</h3>
                  <div className="flex-1 bg-zinc-50 rounded border border-border overflow-hidden">
                    <ArchitectureGraph jobId={jobToAnalyze} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hardware" className="flex-1 min-h-0">
              <div className="h-full">
                <h3 className="text-xs font-medium text-muted-foreground mb-4 uppercase">Deployment Hardware Recommendations</h3>
                <HardwareMatrix />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
