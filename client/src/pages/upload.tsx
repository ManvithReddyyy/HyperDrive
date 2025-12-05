import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Upload, FileUp, Zap, Cpu, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { OptimizationConfig, Job } from "@shared/schema";
import {
  quantizationOptions,
  targetDeviceOptions,
  strategyOptions,
} from "@shared/schema";

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [config, setConfig] = useState<OptimizationConfig>({
    quantization: "INT8",
    targetDevice: "NVIDIA A100",
    strategy: "Latency Focus",
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const response = await apiRequest("POST", "/api/jobs", {
        fileName: file.name,
        fileSize: file.size,
        config,
      });
      return await response.json() as Job;
    },
    onSuccess: (job) => {
      toast({
        title: "Optimization started",
        description: `Job ${job.id.slice(0, 8)} has been queued for processing.`,
      });
      setLocation(`/jobs/${job.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 flex flex-col gap-6">
        <div
          className={`flex-1 flex flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors ${
            isDragging
              ? "border-foreground bg-muted/50"
              : file
              ? "border-foreground/30 bg-card"
              : "border-border bg-card"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-testid="dropzone"
        >
          {file ? (
            <div className="flex flex-col items-center gap-3 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                <FileUp className="h-6 w-6 text-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground" data-testid="text-filename">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-filesize">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
                data-testid="button-remove-file"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Drop your model file here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports ONNX, PyTorch (.pt, .pth), TensorFlow (.pb, .h5)
                </p>
              </div>
              <label>
                <input
                  type="file"
                  className="hidden"
                  accept=".onnx,.pt,.pth,.pb,.h5,.safetensors"
                  onChange={handleFileSelect}
                  data-testid="input-file"
                />
                <Button variant="secondary" size="sm" asChild>
                  <span>Browse files</span>
                </Button>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="w-80 border-l border-border bg-card p-6">
        <h3 className="text-sm font-medium text-foreground mb-6">Properties</h3>
        
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              Quantization
            </label>
            <Select
              value={config.quantization}
              onValueChange={(value) =>
                setConfig({ ...config, quantization: value as typeof config.quantization })
              }
            >
              <SelectTrigger data-testid="select-quantization">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quantizationOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Cpu className="h-3.5 w-3.5" />
              Target Device
            </label>
            <Select
              value={config.targetDevice}
              onValueChange={(value) =>
                setConfig({ ...config, targetDevice: value as typeof config.targetDevice })
              }
            >
              <SelectTrigger data-testid="select-target-device">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targetDeviceOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              Strategy
            </label>
            <Select
              value={config.strategy}
              onValueChange={(value) =>
                setConfig({ ...config, strategy: value as typeof config.strategy })
              }
            >
              <SelectTrigger data-testid="select-strategy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {strategyOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-8">
          <Button
            className="w-full"
            disabled={!file || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
            data-testid="button-optimize"
          >
            {uploadMutation.isPending ? "Starting..." : "Optimize Model"}
          </Button>
        </div>
      </div>
    </div>
  );
}
