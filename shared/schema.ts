import { z } from "zod";

export const quantizationOptions = [
  // Integer Quantization
  "INT8 Static",
  "INT8 Dynamic",
  "INT8 Per-Channel",
  "INT8 Per-Tensor",
  "INT4 AWQ",
  "INT4 GPTQ",
  "INT4 RTN",
  "INT3 (Experimental)",
  "INT2 (Ultra-Low)",
  // Floating Point
  "FP32 (Full Precision)",
  "FP16 (Half Precision)",
  "BF16 (Brain Float)",
  "TF32 (Tensor Float)",
  "FP8 E4M3",
  "FP8 E5M2",
  // Mixed Precision
  "Mixed INT8/FP16",
  "Mixed INT4/FP16",
  "Mixed BF16/FP32",
  "Auto Mixed Precision",
  // Specialized
  "QAT (Quantization Aware)",
  "PTQ (Post-Training)",
  "SmoothQuant",
  "GGUF Q4_K_M",
  "GGUF Q5_K_S",
] as const;

export const targetDeviceOptions = [
  // NVIDIA GPUs
  "NVIDIA A100",
  "NVIDIA H100",
  "NVIDIA A10",
  "NVIDIA T4",
  "NVIDIA V100",
  "NVIDIA L4",
  "NVIDIA L40",
  "NVIDIA RTX 4090",
  "NVIDIA RTX 3090",
  "NVIDIA Jetson Orin",
  "NVIDIA Jetson Xavier",
  // AMD GPUs
  "AMD MI300X",
  "AMD MI250X",
  "AMD RX 7900 XTX",
  "AMD ROCm Generic",
  // Intel
  "Intel Xeon (AVX-512)",
  "Intel Core (AVX2)",
  "Intel Arc A770",
  "Intel Gaudi 2",
  // Apple
  "Apple M1/M2/M3",
  "Apple Neural Engine",
  // Cloud TPUs
  "Google TPU v4",
  "Google TPU v5e",
  "AWS Inferentia2",
  "AWS Trainium",
  // Edge & Mobile
  "Qualcomm Hexagon DSP",
  "ARM Cortex-A (NEON)",
  "Edge TPU (Coral)",
  "Raspberry Pi 5",
  // Runtimes
  "ONNX Runtime CPU",
  "ONNX Runtime CUDA",
  "TensorRT",
  "OpenVINO",
  "TFLite",
] as const;

export const strategyOptions = [
  // Performance
  "Latency Focus",
  "Throughput Focus",
  "Batch Optimized",
  "Real-Time Streaming",
  "Low Latency P99",
  // Quality
  "Accuracy Focus",
  "Quality Preserving",
  "Perplexity Optimized",
  "BLEU Score Focus",
  // Balanced
  "Balanced",
  "Cost-Performance Balanced",
  "Accuracy-Speed Tradeoff",
  // Resource
  "Memory Optimized",
  "VRAM Minimized",
  "Power Efficient",
  "Energy Saving",
  // Deployment
  "Production Ready",
  "Edge Deployment",
  "Mobile Optimized",
  "Serverless Ready",
  // Specialized
  "LLM Inference",
  "Vision Transformer",
  "Diffusion Models",
  "Speech & Audio",
  "Multimodal",
] as const;
export const jobStatusOptions = ["pending", "running", "completed", "failed"] as const;

export const pruningOptions = [
  "None",
  "2:4 Structured Sparsity",
  "Unstructured (50%)",
  "Unstructured (75%)",
  "Magnitude Pruning",
] as const;

export const graphOptimizationOptions = [
  "Level 1 (Basic)",
  "Level 2 (Extended)",
  "Level 3 (All - Fusion + Fold)",
] as const;

export const optimizationConfigSchema = z.object({
  quantization: z.enum(quantizationOptions),
  targetDevice: z.enum(targetDeviceOptions),
  strategy: z.enum(strategyOptions),
  pruning: z.enum(pruningOptions).optional(),
  graphOptimization: z.enum(graphOptimizationOptions).optional(),
  knowledgeDistillation: z.boolean().optional(),
  kernelAutoTuning: z.boolean().optional(),
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

// ================== Job Templates ==================
export const jobTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  config: optimizationConfigSchema,
  userId: z.string(),
  isPublic: z.boolean().default(false),
  usageCount: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type JobTemplate = z.infer<typeof jobTemplateSchema>;

export const createJobTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  config: optimizationConfigSchema,
  isPublic: z.boolean().default(false),
});

export type CreateJobTemplate = z.infer<typeof createJobTemplateSchema>;

// ================== Batch Jobs ==================
export const jobBatchSchema = z.object({
  id: z.string(),
  name: z.string(),
  jobIds: z.array(z.string()),
  status: z.enum(["pending", "running", "completed", "failed", "partial"]),
  totalJobs: z.number(),
  completedJobs: z.number(),
  failedJobs: z.number(),
  userId: z.string(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});

export type JobBatch = z.infer<typeof jobBatchSchema>;

export const createJobBatchSchema = z.object({
  name: z.string(),
  files: z.array(z.object({
    fileName: z.string(),
    fileSize: z.number(),
  })),
  config: optimizationConfigSchema,
});

export type CreateJobBatch = z.infer<typeof createJobBatchSchema>;

// ================== Job Scheduling ==================
export const jobScheduleSchema = z.object({
  id: z.string(),
  jobData: createJobSchema,
  scheduledFor: z.string(), // ISO datetime
  status: z.enum(["scheduled", "triggered", "cancelled"]),
  userId: z.string(),
  createdAt: z.string(),
  triggeredAt: z.string().optional(),
  resultJobId: z.string().optional(),
});

export type JobSchedule = z.infer<typeof jobScheduleSchema>;

// ================== Job Versions ==================
export const jobVersionSchema = z.object({
  id: z.string(),
  originalJobId: z.string(),
  version: z.number(),
  jobId: z.string(), // References the actual job
  createdAt: z.string(),
  notes: z.string().optional(),
});

export type JobVersion = z.infer<typeof jobVersionSchema>;

// ================== Teams & Collaboration ==================
export const teamRoleOptions = ["owner", "admin", "editor", "viewer"] as const;

export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  ownerId: z.string(),
  createdAt: z.string(),
});

export type Team = z.infer<typeof teamSchema>;

export const teamMemberSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string(),
  role: z.enum(teamRoleOptions),
  joinedAt: z.string(),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

// ================== Comments ==================
export const commentSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  userId: z.string(),
  username: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type Comment = z.infer<typeof commentSchema>;

// ================== Audit Log ==================
export const auditActionOptions = [
  "job.create", "job.delete", "job.update",
  "template.create", "template.delete",
  "team.create", "team.invite", "team.remove",
  "settings.update", "webhook.trigger",
  "apikey.create", "apikey.revoke",
] as const;

export const auditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  action: z.enum(auditActionOptions),
  resourceType: z.string(),
  resourceId: z.string(),
  details: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  timestamp: z.string(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

// ================== Webhooks ==================
export const webhookEventOptions = [
  "job.completed", "job.failed", "batch.completed",
  "alert.triggered", "drift.detected",
] as const;

export const webhookSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  events: z.array(z.enum(webhookEventOptions)),
  secret: z.string().optional(),
  isActive: z.boolean().default(true),
  userId: z.string(),
  lastTriggeredAt: z.string().optional(),
  createdAt: z.string(),
});

export type Webhook = z.infer<typeof webhookSchema>;

export const createWebhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.enum(webhookEventOptions)).min(1),
  secret: z.string().optional(),
});

export type CreateWebhook = z.infer<typeof createWebhookSchema>;

// ================== API Keys ==================
export const apiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  keyPrefix: z.string(), // First 8 chars for display
  keyHash: z.string(), // Hashed full key
  scopes: z.array(z.string()),
  expiresAt: z.string().optional(),
  lastUsedAt: z.string().optional(),
  userId: z.string(),
  createdAt: z.string(),
});

export type ApiKey = z.infer<typeof apiKeySchema>;

export const createApiKeySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).default(["read", "write"]),
  expiresInDays: z.number().optional(),
});

export type CreateApiKey = z.infer<typeof createApiKeySchema>;

// ================== Alerts ==================
export const alertConditionOptions = [
  "latency_above", "error_rate_above", "throughput_below",
  "drift_detected", "accuracy_below",
] as const;

export const alertSchema = z.object({
  id: z.string(),
  name: z.string(),
  condition: z.enum(alertConditionOptions),
  threshold: z.number(),
  jobId: z.string().optional(),
  isActive: z.boolean().default(true),
  userId: z.string(),
  lastTriggeredAt: z.string().optional(),
  createdAt: z.string(),
});

export type Alert = z.infer<typeof alertSchema>;

// ================== Cost Estimation ==================
export const costEstimateSchema = z.object({
  hardware: z.string(),
  hoursPerDay: z.number(),
  daysPerMonth: z.number(),
  estimatedTokens: z.number(),
  monthlyCost: z.number(),
  costPerMillionTokens: z.number(),
});

export type CostEstimate = z.infer<typeof costEstimateSchema>;

// ================== Users ==================
export const users = {} as any;
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; email?: string; password: string; teamId?: string; role?: string };

