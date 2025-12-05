import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Play, Loader2, Clock, Zap, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import type { InferenceResult, Job } from "@shared/schema";

function OutputPanel({ 
  title, 
  output, 
  latency, 
  isOptimized = false,
  isLoading = false 
}: { 
  title: string; 
  output: string; 
  latency: number | null;
  isOptimized?: boolean;
  isLoading?: boolean;
}) {
  return (
    <Card className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {latency !== null && (
          <div className={`flex items-center gap-1.5 text-xs ${
            isOptimized ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
          }`}>
            {isOptimized ? <Zap className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            <span className="font-medium">{latency}ms</span>
          </div>
        )}
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : output ? (
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" data-testid={`text-output-${isOptimized ? 'optimized' : 'original'}`}>
            {output}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            Run inference to see output
          </p>
        )}
      </div>
    </Card>
  );
}

export default function PlaygroundPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [result, setResult] = useState<InferenceResult | null>(null);

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const completedJobs = jobs?.filter(j => j.status === "completed") || [];

  const inferenceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/inference/compare", {
        prompt,
        jobId: selectedJobId || undefined,
      });
      return await response.json() as InferenceResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleRunInference = () => {
    if (prompt.trim()) {
      inferenceMutation.mutate();
    }
  };

  const speedup = result
    ? Math.round((1 - result.optimized.latency / result.original.latency) * 100)
    : null;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-sm font-medium text-foreground">Playground</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Compare original and optimized model outputs side-by-side
        </p>
      </div>

      <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-2 block">
              Input Prompt
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt to test both models..."
              className="resize-none min-h-[100px]"
              data-testid="textarea-prompt"
            />
          </div>
          <div className="flex flex-col gap-2">
            {completedJobs.length > 0 && (
              <div className="w-48">
                <label className="text-xs text-muted-foreground mb-2 block">
                  Model (Optional)
                </label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger data-testid="select-model">
                    <SelectValue placeholder="Latest model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Latest model</SelectItem>
                    {completedJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.fileName.slice(0, 20)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={handleRunInference}
              disabled={!prompt.trim() || inferenceMutation.isPending}
              className="w-48"
              data-testid="button-run-inference"
            >
              {inferenceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Inference
                </>
              )}
            </Button>
          </div>
        </div>

        {speedup !== null && (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs font-medium" data-testid="text-speedup">
                Optimized model is {speedup}% faster
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 flex gap-4 min-h-0">
          <OutputPanel
            title="Original Model"
            output={result?.original.output || ""}
            latency={result?.original.latency || null}
            isLoading={inferenceMutation.isPending}
          />
          <OutputPanel
            title="Optimized Model"
            output={result?.optimized.output || ""}
            latency={result?.optimized.latency || null}
            isOptimized={true}
            isLoading={inferenceMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
