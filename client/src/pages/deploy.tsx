import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Code, Server, Container, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Job, DeploymentCode } from "@shared/schema";

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Code snippet has been copied.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative h-full">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 z-10"
        onClick={handleCopy}
        data-testid={`button-copy-${language}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
      <pre className="h-full bg-[#1e1e1e] rounded-md p-4 overflow-auto font-mono text-xs text-zinc-300 scrollbar-thin">
        <code data-testid={`code-${language}`}>{code}</code>
      </pre>
    </div>
  );
}

export default function DeployPage() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const completedJobs = jobs?.filter(j => j.status === "completed") || [];
  const activeJobId = selectedJobId || completedJobs[0]?.id;

  const { data: deployCode } = useQuery<DeploymentCode>({
    queryKey: ["/api/deploy", activeJobId],
    enabled: !!activeJobId,
  });

  const selectedJob = completedJobs.find(j => j.id === activeJobId);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-sm font-medium text-foreground">Deployment</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get ready-to-use code snippets for your optimized model
            </p>
          </div>
          
          {completedJobs.length > 0 && (
            <div className="w-64">
              <Select value={activeJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger data-testid="select-job">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {completedJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.fileName} (#{job.id.slice(0, 6)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        {completedJobs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted mb-4">
              <Code className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No optimized models yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete an optimization job to generate deployment code
            </p>
          </div>
        ) : (
          <Tabs defaultValue="python" className="h-full flex flex-col">
            <TabsList className="w-fit mb-4">
              <TabsTrigger value="python" className="gap-2" data-testid="tab-python">
                <FileCode className="h-3.5 w-3.5" />
                Python (ONNX)
              </TabsTrigger>
              <TabsTrigger value="triton" className="gap-2" data-testid="tab-triton">
                <Server className="h-3.5 w-3.5" />
                Triton Server
              </TabsTrigger>
              <TabsTrigger value="docker" className="gap-2" data-testid="tab-docker">
                <Container className="h-3.5 w-3.5" />
                Docker
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0">
              <TabsContent value="python" className="h-full mt-0">
                <CodeBlock 
                  code={deployCode?.python || "# Loading..."} 
                  language="python"
                />
              </TabsContent>
              <TabsContent value="triton" className="h-full mt-0">
                <CodeBlock 
                  code={deployCode?.triton || "# Loading..."} 
                  language="triton"
                />
              </TabsContent>
              <TabsContent value="docker" className="h-full mt-0">
                <CodeBlock 
                  code={deployCode?.docker || "# Loading..."} 
                  language="docker"
                />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
}
