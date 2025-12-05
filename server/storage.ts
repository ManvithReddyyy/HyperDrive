import { randomUUID } from "crypto";
import type { 
  Job, 
  CreateJob, 
  OptimizationConfig,
  PipelineStep,
  DeploymentCode 
} from "@shared/schema";

export interface IStorage {
  createJob(data: CreateJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getAllJobs(): Promise<Job[]>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined>;
  getDeploymentCode(jobId: string): Promise<DeploymentCode | undefined>;
}

const defaultPipelineSteps: Omit<PipelineStep, "status" | "duration">[] = [
  { id: 1, name: "Graph Analysis" },
  { id: 2, name: "Graph Fusion" },
  { id: 3, name: "Constant Folding" },
  { id: 4, name: "Quantization Calibration" },
  { id: 5, name: "Weight Compression" },
  { id: 6, name: "Model Export" },
];

export class MemStorage implements IStorage {
  private jobs: Map<string, Job>;
  private jobUpdateCallbacks: Map<string, ((job: Job) => void)[]>;

  constructor() {
    this.jobs = new Map();
    this.jobUpdateCallbacks = new Map();
  }

  async createJob(data: CreateJob): Promise<Job> {
    const id = randomUUID();
    const job: Job = {
      id,
      fileName: data.fileName,
      fileSize: data.fileSize,
      config: data.config,
      status: "pending",
      progress: 0,
      logs: [],
      pipelineSteps: defaultPipelineSteps.map(step => ({
        ...step,
        status: "pending" as const,
      })),
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(id, job);
    
    this.startOptimizationSimulation(id);
    
    return job;
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getAllJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates };
    this.jobs.set(id, updatedJob);
    
    const callbacks = this.jobUpdateCallbacks.get(id) || [];
    callbacks.forEach(cb => cb(updatedJob));
    
    return updatedJob;
  }

  subscribeToJobUpdates(jobId: string, callback: (job: Job) => void): () => void {
    const callbacks = this.jobUpdateCallbacks.get(jobId) || [];
    callbacks.push(callback);
    this.jobUpdateCallbacks.set(jobId, callbacks);
    
    return () => {
      const currentCallbacks = this.jobUpdateCallbacks.get(jobId) || [];
      const index = currentCallbacks.indexOf(callback);
      if (index > -1) {
        currentCallbacks.splice(index, 1);
        this.jobUpdateCallbacks.set(jobId, currentCallbacks);
      }
    };
  }

  async getDeploymentCode(jobId: string): Promise<DeploymentCode | undefined> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "completed") return undefined;

    const modelName = job.fileName.replace(/\.[^/.]+$/, "");
    const quantization = job.config.quantization.toLowerCase();

    const pythonCode = `import onnxruntime as ort
import numpy as np

# Load the optimized model
model_path = "${modelName}_optimized_${quantization}.onnx"
session = ort.InferenceSession(model_path, providers=['CUDAExecutionProvider'])

# Get input/output names
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

# Prepare input data (adjust shape as needed)
input_data = np.random.randn(1, 3, 224, 224).astype(np.float32)

# Run inference
result = session.run([output_name], {input_name: input_data})
print(f"Output shape: {result[0].shape}")
print(f"Inference completed successfully!")`;

    const tritonCode = `name: "${modelName}_optimized"
platform: "onnxruntime_onnx"
max_batch_size: 8

input [
  {
    name: "input"
    data_type: TYPE_FP32
    dims: [ 3, 224, 224 ]
  }
]

output [
  {
    name: "output"
    data_type: TYPE_FP32
    dims: [ 1000 ]
  }
]

instance_group [
  {
    count: 2
    kind: KIND_GPU
  }
]

optimization {
  execution_accelerators {
    gpu_execution_accelerator : [ { name : "tensorrt" } ]
  }
}`;

    const dockerCode = `FROM nvcr.io/nvidia/tritonserver:23.10-py3

# Copy the optimized model
COPY ${modelName}_optimized_${quantization}.onnx /models/${modelName}/1/model.onnx
COPY config.pbtxt /models/${modelName}/config.pbtxt

# Expose Triton ports
EXPOSE 8000 8001 8002

# Start Triton server
CMD ["tritonserver", "--model-repository=/models", "--strict-model-config=false"]

# Build and run:
# docker build -t ${modelName}-server .
# docker run --gpus=1 -p 8000:8000 -p 8001:8001 -p 8002:8002 ${modelName}-server`;

    return {
      python: pythonCode,
      triton: tritonCode,
      docker: dockerCode,
    };
  }

  private async startOptimizationSimulation(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const technicalLogs = [
      "[INFO] Starting optimization pipeline...",
      "[INFO] Loading model graph...",
      `[INFO] Model size: ${(job.fileSize / 1024 / 1024).toFixed(2)} MB`,
      `[INFO] Target quantization: ${job.config.quantization}`,
      `[INFO] Target device: ${job.config.targetDevice}`,
      "[INFO] Analyzing computational graph...",
      "[DEBUG] Found 156 nodes, 89 operations",
      "[INFO] Identifying fusion opportunities...",
      "[DEBUG] Conv2d-BatchNorm pairs found: 12",
      "[DEBUG] Linear-ReLU pairs found: 8",
      "[INFO] Applying graph fusion optimizations...",
      "[DEBUG] Fusing Conv2d + BatchNorm2d at layer.0.conv",
      "[DEBUG] Fusing Conv2d + BatchNorm2d at layer.1.conv",
      "[DEBUG] Collapsing BatchNorm into Conv2d...",
      "[INFO] Graph fusion complete. Reduced nodes: 156 -> 132",
      "[INFO] Performing constant folding...",
      "[DEBUG] Folding constant expressions in attention layers",
      "[DEBUG] Propagating constants through reshape operations",
      "[INFO] Constant folding complete. Optimized 24 operations",
      "[INFO] Starting quantization calibration...",
      "[DEBUG] Collecting activation statistics...",
      "[DEBUG] Running calibration with 100 samples",
      "[DEBUG] Calculating optimal scale factors...",
      "[DEBUG] KL Divergence calibration in progress...",
      "[INFO] Quantization calibration complete",
      `[INFO] Final precision: ${job.config.quantization}`,
      "[INFO] Compressing model weights...",
      "[DEBUG] Applying weight quantization...",
      "[DEBUG] Original weight size: 350.2 MB",
      "[DEBUG] Compressed weight size: 87.5 MB",
      "[INFO] Weight compression complete. Reduction: 75%",
      "[INFO] Exporting optimized model...",
      "[DEBUG] Validating model structure...",
      "[DEBUG] Running inference validation...",
      "[INFO] Model validation passed",
      "[INFO] Saving optimized model to ONNX format...",
      "[SUCCESS] Optimization complete!",
      "[INFO] Original latency: 120ms",
      "[INFO] Optimized latency: 45ms",
      "[INFO] Speed improvement: 62.5%",
    ];

    await this.updateJob(jobId, { status: "running" });

    const stepDuration = 2000;
    const logsPerStep = Math.ceil(technicalLogs.length / defaultPipelineSteps.length);

    for (let stepIndex = 0; stepIndex < defaultPipelineSteps.length; stepIndex++) {
      const currentJob = this.jobs.get(jobId);
      if (!currentJob) return;

      const updatedSteps = currentJob.pipelineSteps.map((step, i) => {
        if (i < stepIndex) return { ...step, status: "completed" as const };
        if (i === stepIndex) return { ...step, status: "running" as const };
        return step;
      });

      await this.updateJob(jobId, { pipelineSteps: updatedSteps });

      const startLogIndex = stepIndex * logsPerStep;
      const endLogIndex = Math.min(startLogIndex + logsPerStep, technicalLogs.length);

      for (let logIndex = startLogIndex; logIndex < endLogIndex; logIndex++) {
        await this.delay(stepDuration / logsPerStep);
        
        const job = this.jobs.get(jobId);
        if (!job) return;
        
        const progress = Math.round(((stepIndex * logsPerStep + (logIndex - startLogIndex + 1)) / technicalLogs.length) * 100);
        
        await this.updateJob(jobId, {
          logs: [...job.logs, technicalLogs[logIndex]],
          progress: Math.min(progress, 99),
        });
      }

      const jobAfterStep = this.jobs.get(jobId);
      if (!jobAfterStep) return;

      const finalSteps = jobAfterStep.pipelineSteps.map((step, i) => {
        if (i <= stepIndex) return { ...step, status: "completed" as const, duration: stepDuration };
        return step;
      });

      await this.updateJob(jobId, { pipelineSteps: finalSteps });
    }

    await this.updateJob(jobId, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
      originalLatency: 120,
      optimizedLatency: 45,
      sizeReduction: 75,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const storage = new MemStorage();
