import { z } from "zod";

export const quantizationOptions = ["INT8", "FP16", "FP32"] as const;
export const targetDeviceOptions = ["NVIDIA A100", "NVIDIA T4", "CPU", "Apple M1/M2"] as const;
export const strategyOptions = ["Latency Focus", "Accuracy Focus", "Balanced"] as const;
export const jobStatusOptions = ["pending", "running", "completed", "failed"] as const;

export const optimizationConfigSchema = z.object({
  quantization: z.enum(quantizationOptions),
  targetDevice: z.enum(targetDeviceOptions),
  strategy: z.enum(strategyOptions),
});

export type OptimizationConfig = z.infer<typeof optimizationConfigSchema>;

export const pipelineStepSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  duration: z.number().optional(),
});

export type PipelineStep = z.infer<typeof pipelineStepSchema>;

export const jobSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  config: optimizationConfigSchema,
  status: z.enum(jobStatusOptions),
  progress: z.number().min(0).max(100),
  logs: z.array(z.string()),
  pipelineSteps: z.array(pipelineStepSchema),
  originalLatency: z.number().optional(),
  optimizedLatency: z.number().optional(),
  sizeReduction: z.number().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});

export type Job = z.infer<typeof jobSchema>;

export const createJobSchema = z.object({
  fileName: z.string(),
  fileSize: z.number(),
  config: optimizationConfigSchema,
});

export type CreateJob = z.infer<typeof createJobSchema>;

export const inferenceRequestSchema = z.object({
  prompt: z.string().min(1),
  jobId: z.string().optional(),
});

export type InferenceRequest = z.infer<typeof inferenceRequestSchema>;

export const inferenceResultSchema = z.object({
  original: z.object({
    output: z.string(),
    latency: z.number(),
  }),
  optimized: z.object({
    output: z.string(),
    latency: z.number(),
  }),
});

export type InferenceResult = z.infer<typeof inferenceResultSchema>;

export const deploymentCodeSchema = z.object({
  python: z.string(),
  triton: z.string(),
  docker: z.string(),
});

export type DeploymentCode = z.infer<typeof deploymentCodeSchema>;

export const users = {} as any;
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; email?: string; password: string };

