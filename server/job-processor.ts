import { storage } from "./storage";
import { supabase } from "./supabase";
import type { Job, PipelineStep } from "@shared/schema";
import { broadcastJobUpdate } from "./broadcast";

const POLLING_INTERVAL = 5000; // 5 seconds

export class JobProcessor {
    private isRunning = false;
    private processingJobId: string | null = null;

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("Job Processor starting...");

        // Recover any jobs that were left in "running" state from previous server instances
        await this.recoverStuckJobs();

        console.log("Job Processor started - POLLING ENABLED");
        this.poll();
    }

    private async recoverStuckJobs() {
        try {
            // Find all jobs stuck in "running" status
            const { data: stuckJobs, error } = await supabase
                .from("jobs")
                .select("id")
                .eq("status", "running");

            if (error) {
                console.error("Error finding stuck jobs:", error);
                return;
            }

            if (stuckJobs && stuckJobs.length > 0) {
                console.log(`Found ${stuckJobs.length} stuck jobs, resetting to pending...`);

                // Reset them to pending so they can be re-processed
                const { error: updateError } = await supabase
                    .from("jobs")
                    .update({
                        status: "pending",
                        progress: 0,
                        logs: [],
                        pipeline_steps: []
                    })
                    .eq("status", "running");

                if (updateError) {
                    console.error("Error resetting stuck jobs:", updateError);
                } else {
                    console.log(`Reset ${stuckJobs.length} stuck jobs to pending`);
                }
            } else {
                console.log("No stuck jobs found");
            }
        } catch (error) {
            console.error("Error in recoverStuckJobs:", error);
        }
    }

    stop() {
        this.isRunning = false;
        console.log("Job Processor stopped");
    }

    private async poll() {
        if (!this.isRunning) return;

        try {
            // Find the oldest pending job
            const { data: job, error } = await supabase
                .from("jobs")
                .select("*")
                .eq("status", "pending")
                .order("created_at", { ascending: true })
                .limit(1)
                .single();

            if (job && !error) {
                await this.processJob(job);
            }
        } catch (error) {
            // Ignore "no rows found" errors
            if ((error as any)?.code !== "PGRST116") {
                console.error("Error polling for jobs:", error);
            }
        }

        // Schedule next poll
        if (this.isRunning) {
            setTimeout(() => this.poll(), POLLING_INTERVAL);
        }
    }

    private async processJob(job: any) {
        this.processingJobId = job.id;
        console.log(`Processing job ${job.id}...`);

        try {
            // Update status to running and broadcast
            await this.updateAndBroadcast(job.id, { status: "running", progress: 0 });
            await this.addLogAndBroadcast(job.id, "Job started. Initializing optimization pipeline...");

            // Simulate pipeline steps
            await this.runStep(job.id, "Model Loading", 10, 2000, "Loading model architecture and weights...");
            await this.runStep(job.id, "Validation", 20, 1500, "Validating model graph compatibility...");

            await this.addLogAndBroadcast(job.id, `Configuration: ${job.config.quantization} | ${job.config.targetDevice} | ${job.config.strategy}`);

            await this.runStep(job.id, "Graph Optimization", 40, 3000, "Fusing layers and optimizing operations...");
            await this.runStep(job.id, "Quantization", 70, 4000, `Applying ${job.config.quantization} quantization...`);
            await this.runStep(job.id, "Benchmarking", 90, 2500, "Running performance benchmarks on target device...");

            // Calculate results
            const originalLatency = Math.floor(Math.random() * 50) + 50; // 50-100ms
            const speedup = 1.5 + Math.random(); // 1.5x - 2.5x speedup
            const optimizedLatency = Math.round(originalLatency / speedup);
            const sizeReduction = Math.floor(Math.random() * 40) + 30; // 30-70% reduction

            console.log(`Completing job ${job.id} with latency ${originalLatency}ms -> ${optimizedLatency}ms`);

            // Complete job - update status FIRST
            const completionResult = await storage.updateJob(job.id, {
                status: "completed",
                progress: 100,
                originalLatency,
                optimizedLatency,
                sizeReduction,
                completedAt: new Date().toISOString()
            });

            if (!completionResult) {
                console.error(`FAILED to complete job ${job.id} - updateJob returned undefined`);
            } else {
                console.log(`SUCCESS: Job ${job.id} marked as completed, status: ${completionResult.status}`);
            }

            // Broadcast the completion
            await this.broadcast(job.id);

            await this.addLogAndBroadcast(job.id, "Optimization completed successfully.");
            console.log(`Job ${job.id} completed.`);

        } catch (error: any) {
            console.error(`Job ${job.id} failed:`, error);
            await (storage as any).failJob(job.id, error.message || "Unknown error occurred");
            await this.broadcast(job.id);
        } finally {
            this.processingJobId = null;
        }
    }

    private async runStep(jobId: string, name: string, progress: number, duration: number, log: string) {
        const startTime = Date.now();

        // Add step as running
        const step: PipelineStep = {
            id: Math.floor(Math.random() * 1000000),
            name,
            status: "running",
        };
        await (storage as any).addPipelineStep(jobId, step);
        await this.addLogAndBroadcast(jobId, log);

        // Simulate work
        await new Promise(resolve => setTimeout(resolve, duration));

        // Update step to completed
        const endTime = Date.now();
        step.status = "completed";
        step.duration = endTime - startTime;

        await (storage as any).updatePipelineStep(jobId, step);
        await this.updateAndBroadcast(jobId, { progress });
    }

    // Helper to update job and broadcast
    private async updateAndBroadcast(jobId: string, updates: Partial<Job>) {
        await storage.updateJob(jobId, updates);
        await this.broadcast(jobId);
    }

    // Helper to add log and broadcast
    private async addLogAndBroadcast(jobId: string, log: string) {
        await (storage as any).addJobLog(jobId, log);
        await this.broadcast(jobId);
    }

    // Fetch and broadcast current job state
    private async broadcast(jobId: string) {
        const job = await storage.getJob(jobId);
        if (job) {
            broadcastJobUpdate(job);
        }
    }
}

export const jobProcessor = new JobProcessor();
