import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle2, XCircle, Loader2, FileUp, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job } from "@shared/schema";

const statusConfig = {
  pending: { icon: Clock, label: "Pending", className: "bg-muted text-muted-foreground" },
  running: { icon: Loader2, label: "Running", className: "bg-chart-3/10 text-chart-3" },
  completed: { icon: CheckCircle2, label: "Completed", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  failed: { icon: XCircle, label: "Failed", className: "bg-destructive/10 text-destructive" },
};

function JobRow({ job }: { job: Job }) {
  const status = statusConfig[job.status];
  const StatusIcon = status.icon;
  const isRunning = job.status === "running";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <Link href={`/jobs/${job.id}`}>
      <div 
        className="flex items-center gap-4 px-4 py-3 border-b border-border hover-elevate active-elevate-2 cursor-pointer"
        data-testid={`job-row-${job.id}`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
          <FileUp className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {job.fileName}
            </span>
            <span className="text-xs text-muted-foreground">
              #{job.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {formatFileSize(job.fileSize)}
            </span>
            <span className="text-xs text-muted-foreground">
              {job.config.quantization}
            </span>
            <span className="text-xs text-muted-foreground">
              {job.config.targetDevice}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {job.status === "completed" && job.optimizedLatency && job.originalLatency && (
            <div className="text-right">
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                {Math.round((1 - job.optimizedLatency / job.originalLatency) * 100)}% faster
              </span>
            </div>
          )}
          
          <Badge variant="secondary" className={`${status.className} gap-1`}>
            <StatusIcon className={`h-3 w-3 ${isRunning ? "animate-spin" : ""}`} />
            <span className="text-xs">{status.label}</span>
          </Badge>

          <span className="text-xs text-muted-foreground w-24 text-right">
            {formatDate(job.createdAt)}
          </span>

          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

function JobSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
      <Skeleton className="h-8 w-8 rounded-md" />
      <div className="flex-1">
        <Skeleton className="h-4 w-48 mb-1.5" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export default function JobsPage() {
  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-sm font-medium text-foreground">Job History</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          View all optimization jobs and their status
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <JobSkeleton key={i} />
            ))}
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div>
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted mb-4">
              <FileUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No optimization jobs yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Upload a model to get started
            </p>
            <Link href="/upload">
              <span className="text-xs text-foreground underline underline-offset-2 cursor-pointer">
                Go to New Optimization
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
