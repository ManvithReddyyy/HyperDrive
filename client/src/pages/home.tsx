import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, History, FlaskConical, Rocket, ArrowRight, Zap, Timer, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Job } from "@shared/schema";

function QuickActionCard({ 
  icon: Icon, 
  title, 
  description, 
  href,
  testId
}: { 
  icon: typeof Plus;
  title: string; 
  description: string;
  href: string;
  testId: string;
}) {
  return (
    <Link href={href}>
      <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer group" data-testid={testId}>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{title}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {description}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  highlight = false 
}: { 
  icon: typeof Zap;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-3.5 w-3.5 ${highlight ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`text-xl font-medium ${highlight ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
        {value}
      </div>
    </Card>
  );
}

export default function HomePage() {
  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const completedJobs = jobs?.filter(j => j.status === "completed") || [];
  const runningJobs = jobs?.filter(j => j.status === "running") || [];
  
  const avgSpeedup = completedJobs.length > 0
    ? completedJobs.reduce((acc, job) => {
        if (job.originalLatency && job.optimizedLatency) {
          return acc + (1 - job.optimizedLatency / job.originalLatency) * 100;
        }
        return acc;
      }, 0) / completedJobs.filter(j => j.originalLatency && j.optimizedLatency).length
    : 0;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-lg font-medium text-foreground">Welcome to HyperDrive</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Optimize your AI models for faster inference and smaller deployment sizes
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={History}
            label="Total Jobs"
            value={String(jobs?.length || 0)}
          />
          <StatCard
            icon={Timer}
            label="In Progress"
            value={String(runningJobs.length)}
          />
          <StatCard
            icon={TrendingDown}
            label="Avg. Speedup"
            value={avgSpeedup > 0 ? `${Math.round(avgSpeedup)}%` : "-"}
            highlight={avgSpeedup > 0}
          />
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard
              icon={Plus}
              title="New Optimization"
              description="Upload a model and configure optimization settings"
              href="/upload"
              testId="card-new-optimization"
            />
            <QuickActionCard
              icon={History}
              title="Job History"
              description="View all optimization jobs and their status"
              href="/jobs"
              testId="card-job-history"
            />
            <QuickActionCard
              icon={FlaskConical}
              title="Playground"
              description="Compare original and optimized model outputs"
              href="/playground"
              testId="card-playground"
            />
            <QuickActionCard
              icon={Rocket}
              title="Deployment"
              description="Get ready-to-use code for your optimized models"
              href="/deploy"
              testId="card-deployment"
            />
          </div>
        </div>

        {completedJobs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-foreground">Recent Completions</h2>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" data-testid="button-view-all">
                  View all
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {completedJobs.slice(0, 3).map((job) => {
                const speedup = job.originalLatency && job.optimizedLatency
                  ? Math.round((1 - job.optimizedLatency / job.originalLatency) * 100)
                  : null;
                return (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <Card 
                      className="px-4 py-3 hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`recent-job-${job.id}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/10 shrink-0">
                            <Zap className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {job.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {job.config.quantization} • {job.config.targetDevice}
                            </p>
                          </div>
                        </div>
                        {speedup !== null && (
                          <span className="text-xs font-medium text-green-600 dark:text-green-400 shrink-0">
                            {speedup}% faster
                          </span>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
