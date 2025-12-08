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

