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

    // ================== Job Templates ==================
    async createTemplate(data: any, userId: string): Promise<any> {
        const templateData = {
            name: data.name,
            description: data.description || null,
            config: data.config,
            user_id: userId,
            is_public: data.isPublic || false,
            usage_count: 0,
        };

        const { data: template, error } = await supabase
            .from("job_templates")
            .insert(templateData)
            .select()
            .single();

        if (error) throw new Error(`Failed to create template: ${error.message}`);
        return this.mapTemplateFromDb(template);
    }

    async getTemplates(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from("job_templates")
            .select("*")
            .or(`user_id.eq.${userId},is_public.eq.true`)
            .order("created_at", { ascending: false });

        if (error || !data) return [];
        return data.map(t => this.mapTemplateFromDb(t));
    }

    async getTemplate(id: string): Promise<any | undefined> {
        const { data, error } = await supabase
            .from("job_templates")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return undefined;
        return this.mapTemplateFromDb(data);
    }

    async deleteTemplate(id: string, userId: string): Promise<boolean> {
        const { error } = await supabase
            .from("job_templates")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        return !error;
    }

    async incrementTemplateUsage(id: string): Promise<void> {
        await supabase.rpc("increment_template_usage", { template_id: id });
    }

    private mapTemplateFromDb(dbTemplate: any): any {
        return {
            id: dbTemplate.id,
            name: dbTemplate.name,
            description: dbTemplate.description,
            config: dbTemplate.config,
            userId: dbTemplate.user_id,
            isPublic: dbTemplate.is_public,
            usageCount: dbTemplate.usage_count || 0,
            createdAt: dbTemplate.created_at,
            updatedAt: dbTemplate.updated_at,
        };
    }

    // ================== Webhooks ==================
    async createWebhook(data: any, userId: string): Promise<any> {
        const webhookData = {
            name: data.name,
            url: data.url,
            events: data.events,
            secret: data.secret || null,
            is_active: true,
            user_id: userId,
        };

        const { data: webhook, error } = await supabase
            .from("webhooks")
            .insert(webhookData)
            .select()
            .single();

        if (error) throw new Error(`Failed to create webhook: ${error.message}`);
        return this.mapWebhookFromDb(webhook);
    }

    async getWebhooks(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from("webhooks")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error || !data) return [];
        return data.map(w => this.mapWebhookFromDb(w));
    }

    async deleteWebhook(id: string, userId: string): Promise<boolean> {
        const { error } = await supabase
            .from("webhooks")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        return !error;
    }

    async triggerWebhooks(event: string, payload: any, userId: string): Promise<void> {
        const webhooks = await this.getWebhooks(userId);
        const activeWebhooks = webhooks.filter(w => w.isActive && w.events.includes(event));

        for (const webhook of activeWebhooks) {
            try {
                await fetch(webhook.url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
                });
                await supabase
                    .from("webhooks")
                    .update({ last_triggered_at: new Date().toISOString() })
                    .eq("id", webhook.id);
            } catch (err) {
                console.error(`Webhook ${webhook.id} failed:`, err);
            }
        }
    }

    private mapWebhookFromDb(dbWebhook: any): any {
        return {
            id: dbWebhook.id,
            name: dbWebhook.name,
            url: dbWebhook.url,
            events: dbWebhook.events,
            secret: dbWebhook.secret,
            isActive: dbWebhook.is_active,
            userId: dbWebhook.user_id,
            lastTriggeredAt: dbWebhook.last_triggered_at,
            createdAt: dbWebhook.created_at,
        };
    }

    // ================== API Keys ==================
    async createApiKey(data: any, userId: string): Promise<{ key: string; apiKey: any }> {
        const fullKey = `hd_${this.generateRandomString(32)}`;
        const keyPrefix = fullKey.substring(0, 11);
        const keyHash = await this.hashString(fullKey);

        const apiKeyData = {
            name: data.name,
            key_prefix: keyPrefix,
            key_hash: keyHash,
            scopes: data.scopes || ["read", "write"],
            expires_at: data.expiresInDays
                ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
                : null,
            user_id: userId,
        };

        const { data: apiKey, error } = await supabase
            .from("api_keys")
            .insert(apiKeyData)
            .select()
            .single();

        if (error) throw new Error(`Failed to create API key: ${error.message}`);
        return { key: fullKey, apiKey: this.mapApiKeyFromDb(apiKey) };
    }

    async getApiKeys(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from("api_keys")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error || !data) return [];
        return data.map(k => this.mapApiKeyFromDb(k));
    }

    async revokeApiKey(id: string, userId: string): Promise<boolean> {
        const { error } = await supabase
            .from("api_keys")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        return !error;
    }

    async validateApiKey(key: string): Promise<any | null> {
        const keyHash = await this.hashString(key);
        const { data, error } = await supabase
            .from("api_keys")
            .select("*")
            .eq("key_hash", keyHash)
            .single();

        if (error || !data) return null;

        // Update last used
        await supabase
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", data.id);

        return this.mapApiKeyFromDb(data);
    }

    private mapApiKeyFromDb(dbKey: any): any {
        return {
            id: dbKey.id,
            name: dbKey.name,
            keyPrefix: dbKey.key_prefix,
            scopes: dbKey.scopes,
            expiresAt: dbKey.expires_at,
            lastUsedAt: dbKey.last_used_at,
            userId: dbKey.user_id,
            createdAt: dbKey.created_at,
        };
    }

    // ================== Teams ==================
    async createTeam(name: string, description: string | undefined, userId: string): Promise<any> {
        const { data: team, error } = await supabase
            .from("teams")
            .insert({ name, description, owner_id: userId })
            .select()
            .single();

        if (error) throw new Error(`Failed to create team: ${error.message}`);

        // Add owner as member
        await supabase.from("team_members").insert({
            team_id: team.id,
            user_id: userId,
            role: "owner",
        });

        return this.mapTeamFromDb(team);
    }

    async getTeams(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from("team_members")
            .select("team_id, teams(*)")
            .eq("user_id", userId);

        if (error || !data) return [];
        return data.map((m: any) => this.mapTeamFromDb(m.teams));
    }

    async getTeamMembers(teamId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from("team_members")
            .select("*, users(username)")
            .eq("team_id", teamId);

        if (error || !data) return [];
        return data.map((m: any) => ({
            id: m.id,
            teamId: m.team_id,
            userId: m.user_id,
            username: m.users?.username,
            role: m.role,
            joinedAt: m.joined_at,
        }));
    }

    async inviteToTeam(teamId: string, email: string, role: string): Promise<boolean> {
        const user = await this.getUserByEmail(email);
        if (!user) return false;

        const { error } = await supabase.from("team_members").insert({
            team_id: teamId,
            user_id: user.id,
            role: role,
        });

        return !error;
    }

    private mapTeamFromDb(dbTeam: any): any {
        return {
            id: dbTeam.id,
            name: dbTeam.name,
            description: dbTeam.description,
            ownerId: dbTeam.owner_id,
            createdAt: dbTeam.created_at,
        };
    }

    // ================== Comments ==================
    async addComment(jobId: string, userId: string, username: string, content: string): Promise<any> {
        const { data, error } = await supabase
            .from("comments")
            .insert({ job_id: jobId, user_id: userId, username, content })
            .select()
            .single();

        if (error) throw new Error(`Failed to add comment: ${error.message}`);
        return {
            id: data.id,
            jobId: data.job_id,
            userId: data.user_id,
            username: data.username,
            content: data.content,
            createdAt: data.created_at,
        };
    }

    async getComments(jobId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from("comments")
            .select("*")
            .eq("job_id", jobId)
            .order("created_at", { ascending: true });

        if (error || !data) return [];
        return data.map(c => ({
            id: c.id,
            jobId: c.job_id,
            userId: c.user_id,
            username: c.username,
            content: c.content,
            createdAt: c.created_at,
        }));
    }

    // ================== Audit Log ==================
    async logAudit(userId: string, username: string, action: string, resourceType: string, resourceId: string, details?: any): Promise<void> {
        await supabase.from("audit_logs").insert({
            user_id: userId,
            username,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            details,
        });
    }

    async getAuditLogs(userId: string, limit: number = 50): Promise<any[]> {
        const { data, error } = await supabase
            .from("audit_logs")
            .select("*")
            .eq("user_id", userId)
            .order("timestamp", { ascending: false })
            .limit(limit);

        if (error || !data) return [];
        return data.map(log => ({
            id: log.id,
            userId: log.user_id,
            username: log.username,
            action: log.action,
            resourceType: log.resource_type,
            resourceId: log.resource_id,
            details: log.details,
            timestamp: log.timestamp,
        }));
    }

    // ================== Alerts ==================
    async createAlert(data: any, userId: string): Promise<any> {
        const { data: alert, error } = await supabase
            .from("alerts")
            .insert({
                name: data.name,
                condition: data.condition,
                threshold: data.threshold,
                job_id: data.jobId || null,
                is_active: true,
                user_id: userId,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create alert: ${error.message}`);
        return this.mapAlertFromDb(alert);
    }

    async getAlerts(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from("alerts")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error || !data) return [];
        return data.map(a => this.mapAlertFromDb(a));
    }

    async toggleAlert(id: string, userId: string): Promise<boolean> {
        const { data: current } = await supabase
            .from("alerts")
            .select("is_active")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (!current) return false;

        const { error } = await supabase
            .from("alerts")
            .update({ is_active: !current.is_active })
            .eq("id", id);

        return !error;
    }

    private mapAlertFromDb(dbAlert: any): any {
        return {
            id: dbAlert.id,
            name: dbAlert.name,
            condition: dbAlert.condition,
            threshold: dbAlert.threshold,
            jobId: dbAlert.job_id,
            isActive: dbAlert.is_active,
            userId: dbAlert.user_id,
            lastTriggeredAt: dbAlert.last_triggered_at,
            createdAt: dbAlert.created_at,
        };
    }

    // ================== Batch Jobs ==================
    async createBatch(name: string, jobIds: string[], userId: string): Promise<any> {
        const { data, error } = await supabase
            .from("job_batches")
            .insert({
                name,
                job_ids: jobIds,
                status: "pending",
                total_jobs: jobIds.length,
                completed_jobs: 0,
                failed_jobs: 0,
                user_id: userId,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create batch: ${error.message}`);
        return this.mapBatchFromDb(data);
    }

    async getBatches(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from("job_batches")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error || !data) return [];
        return data.map(b => this.mapBatchFromDb(b));
    }

    async updateBatchProgress(batchId: string, completedJobs: number, failedJobs: number): Promise<void> {
        const { data: batch } = await supabase
            .from("job_batches")
            .select("total_jobs")
            .eq("id", batchId)
            .single();

        const totalJobs = batch?.total_jobs || 0;
        const status = (completedJobs + failedJobs >= totalJobs)
            ? (failedJobs > 0 ? "partial" : "completed")
            : "running";

        await supabase
            .from("job_batches")
            .update({
                completed_jobs: completedJobs,
                failed_jobs: failedJobs,
                status,
                completed_at: status !== "running" ? new Date().toISOString() : null,
            })
            .eq("id", batchId);
    }

    private mapBatchFromDb(dbBatch: any): any {
        return {
            id: dbBatch.id,
            name: dbBatch.name,
            jobIds: dbBatch.job_ids,
            status: dbBatch.status,
            totalJobs: dbBatch.total_jobs,
            completedJobs: dbBatch.completed_jobs,
            failedJobs: dbBatch.failed_jobs,
            userId: dbBatch.user_id,
            createdAt: dbBatch.created_at,
            completedAt: dbBatch.completed_at,
        };
    }

    // ================== Utility Methods ==================
    private generateRandomString(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    private async hashString(str: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

export const storage = new SupabaseStorage();

