import { supabase } from "./supabase";
import type {
    Job,
    CreateJob,
    User,
    InsertUser,
    DeploymentCode,
} from "@shared/schema";

export interface IStorage {
    createJob(data: CreateJob, userId: string): Promise<Job>;
    getJob(id: string): Promise<Job | undefined>;
    getAllJobs(userId?: string): Promise<Job[]>;
    updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined>;
    getDeploymentCode(jobId: string): Promise<DeploymentCode | undefined>;
    getUser(id: string): Promise<User | undefined>;
    getUserByUsername(username: string): Promise<User | undefined>;
    getUserByEmail(email: string): Promise<User | undefined>;
    createUser(user: InsertUser & { id: string }): Promise<User>;
}

export class SupabaseStorage implements IStorage {
    async createJob(data: CreateJob, userId: string): Promise<Job> {
        console.log(`Creating job for user ${userId} with data:`, JSON.stringify(data));

        const jobData = {
            user_id: userId,
            file_name: data.fileName,
            status: "pending",
            config: data.config,
            // Initialize tracking fields
            logs: [],
            pipeline_steps: [],
            progress: 0
        };

        const { data: job, error } = await supabase
            .from("jobs")
            .insert(jobData)
            .select()
            .single();

        if (error) {
            console.error("Supabase createJob error:", error);
            throw new Error(`Failed to create job: ${error.message}`);
        }

        return this.mapJobFromDb(job, data.fileSize);
    }

    async getJob(id: string): Promise<Job | undefined> {
        const { data, error } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return undefined;
        return this.mapJobFromDb(data);
    }

    async getAllJobs(userId?: string): Promise<Job[]> {
        let query = supabase
            .from("jobs")
            .select("*")
            .order("created_at", { ascending: false });

        if (userId) {
            query = query.eq("user_id", userId);
        }

        const { data, error } = await query;

        if (error || !data) return [];
        return data.map(job => this.mapJobFromDb(job));
    }

    async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
        const dbUpdates: any = {};

        if (updates.status) dbUpdates.status = updates.status;
        if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
        if (updates.originalLatency !== undefined) dbUpdates.original_latency = updates.originalLatency;
        if (updates.optimizedLatency !== undefined) dbUpdates.optimized_latency = updates.optimizedLatency;
        if (updates.sizeReduction !== undefined) dbUpdates.size_reduction = updates.sizeReduction;
        if (updates.completedAt) dbUpdates.completed_at = updates.completedAt;

        console.log(`Updating job ${id} with:`, dbUpdates);

        const { data, error } = await supabase
            .from("jobs")
            .update(dbUpdates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error(`Failed to update job ${id}:`, error);
            return undefined;
        }

        console.log(`Job ${id} updated successfully, new status: ${data?.status}`);
        return this.mapJobFromDb(data);
    }

    async getDeploymentCode(jobId: string): Promise<DeploymentCode | undefined> {
        const job = await this.getJob(jobId);
        if (!job || job.status !== "completed") return undefined;

        const python = `import onnxruntime as ort
import numpy as np

# Load the optimized ONNX model
model_path = "optimized_model.onnx"
session = ort.InferenceSession(model_path, providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])

# Get model input/output info
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

# Run inference
def predict(input_data: np.ndarray) -> np.ndarray:
    """
    Run inference on the optimized model.
    
    Args:
        input_data: Input tensor as numpy array
        
    Returns:
        Model output as numpy array
    """
    result = session.run([output_name], {input_name: input_data})
    return result[0]

# Example usage
if __name__ == "__main__":
    # Create sample input (adjust shape to match your model)
    sample_input = np.random.randn(1, 3, 224, 224).astype(np.float32)
    output = predict(sample_input)
    print(f"Output shape: {output.shape}")
`;

        const triton = `# Triton Inference Server Configuration
# Save as config.pbtxt in your model repository

name: "${job.fileName.replace('.pt', '').replace('.onnx', '')}"
platform: "onnxruntime_onnx"
max_batch_size: 8

input [
  {
    name: "input"
    data_type: TYPE_FP32
    dims: [3, 224, 224]
  }
]

output [
  {
    name: "output"
    data_type: TYPE_FP32
    dims: [-1]
  }
]

instance_group [
  {
    count: 1
    kind: KIND_GPU
  }
]

dynamic_batching {
  preferred_batch_size: [4, 8]
  max_queue_delay_microseconds: 100
}
`;

        const docker = `FROM nvcr.io/nvidia/tritonserver:23.10-py3

# Copy optimized model
COPY optimized_model.onnx /models/${job.fileName.replace('.pt', '').replace('.onnx', '')}/1/model.onnx
COPY config.pbtxt /models/${job.fileName.replace('.pt', '').replace('.onnx', '')}/config.pbtxt

# Set environment variables
ENV NVIDIA_VISIBLE_DEVICES=all
ENV CUDA_VISIBLE_DEVICES=0

# Expose ports
EXPOSE 8000 8001 8002

# Start Triton server
CMD ["tritonserver", "--model-repository=/models", "--strict-model-config=false"]

# Build: docker build -t hyperdrive-model .
# Run: docker run --gpus all -p 8000:8000 -p 8001:8001 -p 8002:8002 hyperdrive-model
`;

        return { python, triton, docker };
    }

    async getUser(id: string): Promise<User | undefined> {
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return undefined;

        return {
            id: data.id,
            username: data.username,
            password: "",
        };
    }

    async getUserByUsername(username: string): Promise<User | undefined> {
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("username", username)
            .single();

        if (error || !data) return undefined;

        return {
            id: data.id,
            username: data.username,
            password: "",
        };
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (error || !data) return undefined;

        return {
            id: data.id,
            username: data.username,
            password: "",
        };
    }

    async createUser(user: InsertUser & { id: string }): Promise<User> {
        const { data, error } = await supabase
            .from("users")
            .insert({
                id: user.id,
                username: user.username,
                email: user.username,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create user: ${error.message}`);

        return {
            id: data.id,
            username: data.username,
            password: "",
        };
    }

    // WebSocket subscription for real-time job updates (used by routes.ts)
    subscribeToJobUpdates(jobId: string, callback: (job: Job) => void): () => void {
        // Set up Supabase real-time subscription
        const channel = supabase
            .channel(`job-${jobId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'jobs',
                    filter: `id=eq.${jobId}`,
                },
                async (payload) => {
                    if (payload.new) {
                        const job = this.mapJobFromDb(payload.new as any);
                        callback(job);
                    }
                }
            )
            .subscribe();

        // Return unsubscribe function
        return () => {
            supabase.removeChannel(channel);
        };
    }

    // Helper methods for Job Processor
    async addJobLog(jobId: string, log: string): Promise<void> {
        // Get current logs
        const { data: job } = await supabase
            .from("jobs")
            .select("logs")
            .eq("id", jobId)
            .single();

        const logs = job?.logs || [];
        logs.push(log);

        await supabase
            .from("jobs")
            .update({ logs })
            .eq("id", jobId);
    }

    async addPipelineStep(jobId: string, step: any): Promise<void> {
        const { data: job } = await supabase
            .from("jobs")
            .select("pipeline_steps")
            .eq("id", jobId)
            .single();

        const steps = job?.pipeline_steps || [];
        steps.push(step);

        await supabase
            .from("jobs")
            .update({ pipeline_steps: steps })
            .eq("id", jobId);
    }

    async updatePipelineStep(jobId: string, updatedStep: any): Promise<void> {
        const { data: job } = await supabase
            .from("jobs")
            .select("pipeline_steps")
            .eq("id", jobId)
            .single();

        let steps = job?.pipeline_steps || [];
        steps = steps.map((s: any) => s.name === updatedStep.name ? updatedStep : s);

        await supabase
            .from("jobs")
            .update({ pipeline_steps: steps })
            .eq("id", jobId);
    }

    async failJob(jobId: string, errorMessage: string): Promise<void> {
        await this.addJobLog(jobId, `ERROR: ${errorMessage}`);
        await this.updateJob(jobId, { status: "failed" });

        await supabase
            .from("jobs")
            .update({ error_message: errorMessage })
            .eq("id", jobId);
    }

    private mapJobFromDb(dbJob: any, fileSize: number = 0): Job {
        return {
            id: dbJob.id,
            fileName: dbJob.file_name,
            fileSize: fileSize,
            status: dbJob.status,
            config: dbJob.config,
            progress: dbJob.progress || 0,
            logs: dbJob.logs || [],
            pipelineSteps: dbJob.pipeline_steps || [],
            originalLatency: dbJob.original_latency,
            optimizedLatency: dbJob.optimized_latency,
            sizeReduction: dbJob.size_reduction,
            createdAt: dbJob.created_at,
            completedAt: dbJob.completed_at,
        };
    }
}

export const storage = new SupabaseStorage();
