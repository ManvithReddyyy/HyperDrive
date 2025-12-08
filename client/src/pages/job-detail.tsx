import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  ArrowLeft,
  Timer,
  TrendingDown,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SensitivityChart } from "@/components/business/SensitivityChart";
import { ArchitectureGraph } from "@/components/business/ArchitectureGraph";
import { HardwareMatrix } from "@/components/business/HardwareMatrix";
import type { Job, PipelineStep } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

const stepStatusIcons = {
  pending: Circle,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
};

function PipelineStepItem({ step, index }: { step: PipelineStep; index: number }) {
  const Icon = stepStatusIcons[step.status];
  const isRunning = step.status === "running";
  const isCompleted = step.status === "completed";
  const isFailed = step.status === "failed";

  return (
    <div
      className={`flex items-center gap-3 py-2 ${step.status === "pending" ? "opacity-50" : ""
        }`}
      data-testid={`pipeline-step-${index}`}
    >
      <div className={`flex h-6 w-6 items-center justify-center rounded-full ${isCompleted ? "bg-green-500/10" :
          isFailed ? "bg-destructive/10" :
            isRunning ? "bg-chart-3/10" : "bg-muted"
        }`}>
        <Icon className={`h-3.5 w-3.5 ${isCompleted ? "text-green-600 dark:text-green-400" :
            isFailed ? "text-destructive" :
              isRunning ? "text-chart-3 animate-spin" : "text-muted-foreground"
          }`} />
      </div>
      <div className="flex-1">
        <span className={`text-sm ${isCompleted || isRunning ? "text-foreground" : "text-muted-foreground"
          }`}>
          {index + 1}. {step.name}
        </span>
      </div>
      {step.duration && (
        <span className="text-xs text-muted-foreground">
          {(step.duration / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

function Terminal({ logs }: { logs: string[] }) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={terminalRef}
      className="h-full bg-[#1e1e1e] rounded-md p-4 overflow-auto font-mono text-xs scrollbar-thin"
      data-testid="terminal"
    >
      {logs.length === 0 ? (
        <span className="text-zinc-500">Waiting for logs...</span>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
            <span className="text-zinc-500 select-none mr-3">{String(i + 1).padStart(3, ' ')}</span>
            {log}
          </div>
        ))
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  highlight = false
}: {
  icon: typeof Timer;
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-medium ${highlight ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-muted-foreground mt-0.5">{subtext}</div>
      )}
    </Card>
  );
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const wsRef = useRef<WebSocket | null>(null);
  const [liveJob, setLiveJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState("console");

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
    refetchInterval: 2000, // Poll every 2 seconds as fallback
  });

  useEffect(() => {
    if (!jobId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?jobId=${jobId}`;
    console.log("Connecting to WebSocket:", wsUrl);
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected for job", jobId);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data.type);
        if (data.type === "job_update") {
          setLiveJob(data.job);
          queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
        }
      } catch (e) {
        console.error("WebSocket message parse error:", e);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket closed for job", jobId);
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [jobId]);

  const displayJob = liveJob || job;

  if (isLoading) {
    return (
      <div className="h-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-1 w-full mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!displayJob) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <p className="text-sm text-foreground mb-2">Job not found</p>
        <Link href="/jobs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }

  const isRunning = displayJob.status === "running";
  const isCompleted = displayJob.status === "completed";

  const speedup = displayJob.originalLatency && displayJob.optimizedLatency
    ? Math.round((1 - displayJob.optimizedLatency / displayJob.originalLatency) * 100)
    : null;

  return (
    <div className="h-full flex flex-col">
      <Progress
        value={displayJob.progress}
        className="h-1 rounded-none"
        data-testid="progress-bar"
      />

      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/jobs">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-medium text-foreground" data-testid="text-filename">
                {displayJob.fileName}
              </h1>
              <Badge variant="secondary" className="text-xs">
                #{displayJob.id.slice(0, 8)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {displayJob.config.quantization} • {displayJob.config.targetDevice} • {displayJob.config.strategy}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-64 border-r border-border p-4 overflow-auto">
          <h3 className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wide">
            Pipeline
          </h3>
          <div className="space-y-1">
            {displayJob.pipelineSteps.map((step, i) => (
              <PipelineStepItem key={step.id} step={step} index={i} />
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {isCompleted && (
            <div className="grid grid-cols-3 gap-4">
              <MetricCard
                icon={Timer}
                label="Original Latency"
                value={displayJob.originalLatency ? `${displayJob.originalLatency}ms` : "-"}
              />
              <MetricCard
                icon={Zap}
                label="Optimized Latency"
                value={displayJob.optimizedLatency ? `${displayJob.optimizedLatency}ms` : "-"}
                highlight={true}
              />
              <MetricCard
                icon={TrendingDown}
                label="Speed Improvement"
                value={speedup !== null ? `${speedup}%` : "-"}
                subtext={displayJob.sizeReduction ? `${displayJob.sizeReduction}% smaller` : undefined}
                highlight={true}
              />
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="console">Console</TabsTrigger>
                {isCompleted && <TabsTrigger value="xray">X-Ray Vision</TabsTrigger>}
                {isCompleted && <TabsTrigger value="analysis">Analysis</TabsTrigger>}
              </TabsList>

              <TabsContent value="console" className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full flex flex-col">
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Live Terminal
                  </h3>
                  <div className="h-[calc(100%-24px)]">
                    <Terminal logs={displayJob.logs} />
                  </div>
                </div>
              </TabsContent>

              {isCompleted && (
                <TabsContent value="xray" className="flex-1 min-h-0 overflow-hidden">
                  <div className="h-full">
                    <ArchitectureGraph jobId={jobId} />
                  </div>
                </TabsContent>
              )}

              {isCompleted && (
                <TabsContent value="analysis" className="flex-1 min-h-0 overflow-hidden">
                  <div className="h-full space-y-4">
                    <div className="h-1/2">
                      <SensitivityChart jobId={jobId} />
                    </div>
                    <div className="h-1/2">
                      <HardwareMatrix />
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
