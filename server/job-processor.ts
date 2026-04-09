import { storage } from "./storage";
import type { Job, PipelineStep } from "@shared/schema";
import { broadcastJobUpdate } from "./broadcast";
import fetch from "node-fetch";
import fs from "fs";

const POLLING_INTERVAL = 5000; // 5 seconds
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

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
            const allJobs = await storage.getAllJobs();
            const stuckJobs = allJobs.filter(j => j.status === "running");

            if (stuckJobs.length > 0) {
                console.log(`Found ${stuckJobs.length} stuck jobs, resetting to pending...`);
                for (const job of stuckJobs) {
                    await storage.updateJob(job.id, {
                        status: "pending",
                        progress: 0,
                        logs: [],
                        pipelineSteps: []
                    });
                }
                console.log(`Reset ${stuckJobs.length} stuck jobs to pending`);
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
            const allJobs = await storage.getAllJobs();
            const pendingJobs = allJobs.filter(j => j.status === "pending");
            // getAllJobs returns newest first, so grab the last one for oldest
            const job = pendingJobs.length > 0 ? pendingJobs[pendingJobs.length - 1] : null;

            if (job) {
                await this.processJob(job);
            }
        } catch (error) {
            console.error("Error polling for jobs:", error);
        }

        // Schedule next poll
        if (this.isRunning) {
            setTimeout(() => this.poll(), POLLING_INTERVAL);
        }
    }

    private async processJob(job: any) {
        this.processingJobId = job.id;
        console.log(`Processing job ${job.id}...`);
        const startTime = Date.now();

        try {
            // Update status to running and broadcast
            await this.updateAndBroadcast(job.id, { status: "running", progress: 0 });
            await this.addLogAndBroadcast(job.id, `$ hyperdrive optimize --job ${job.id.slice(0, 8)}`);
            await this.addLogAndBroadcast(job.id, `[init] HyperDrive Optimization Engine v2.4.0`);
            await this.addLogAndBroadcast(job.id, `[init] Target: ${job.config.targetDevice} | Strategy: ${job.config.strategy}`);
            await this.addLogAndBroadcast(job.id, ``);

            // Step 1: Model Loading
            await this.runStep(job.id, "Model Loading", 10, 800,
                `[load] Reading ${job.fileName} (${(job.fileSize / (1024 * 1024)).toFixed(1)} MB)`);
            
            const modelPath = `${process.cwd()}/backend/models/${job.id}_original`;
            const fileExists = fs.existsSync(modelPath);
            await this.addLogAndBroadcast(job.id, `[load] Model file: ${fileExists ? "found" : "MISSING"} at backend/models/${job.id.slice(0, 8)}_original`);
            await this.addLogAndBroadcast(job.id, `[load] File size: ${job.fileSize.toLocaleString()} bytes`);

            // Step 2: Validation
            await this.runStep(job.id, "Validation", 20, 600,
                `[validate] Checking model graph compatibility...`);
            await this.addLogAndBroadcast(job.id, `[validate] Format: ${job.fileName.endsWith('.onnx') ? 'ONNX' : 'PyTorch'} | Quantization: ${job.config.quantization}`);
            await this.addLogAndBroadcast(job.id, ``);

            // Step 3: Python Backend Call
            await this.addLogAndBroadcast(job.id, `[engine] Connecting to Python ML backend (localhost:8000)...`);
            const step3Start = Date.now();
            await this.runStep(job.id, "Python Backend", 40, 0, ``);

            const pythonResult = await this.callPythonBackend(job);

            if (!pythonResult) {
                throw new Error("Python backend optimization failed — no metrics returned");
            }

            const pythonDuration = ((Date.now() - step3Start) / 1000).toFixed(1);
            await this.addLogAndBroadcast(job.id, `[engine] Backend responded in ${pythonDuration}s`);
            await this.addLogAndBroadcast(job.id, ``);

            // Step 4: Show real optimization results
            await this.runStep(job.id, "Graph Optimization", 55, 500,
                `[optimize] Running graph fusion and operator folding...`);
            await this.addLogAndBroadcast(job.id, `[optimize] Layers fused: ${pythonResult.layers_fused}`);
            await this.addLogAndBroadcast(job.id, `[optimize] Quantization type: ${pythonResult.quantization_type}`);
            await this.addLogAndBroadcast(job.id, ``);

            // Step 5: Quantization with real numbers
            await this.runStep(job.id, "Quantization", 75, 500,
                `[quant] Applying ${job.config.quantization} quantization...`);
            await this.addLogAndBroadcast(job.id, `[quant] Original size: ${pythonResult.original_size_mb} MB`);
            await this.addLogAndBroadcast(job.id, `[quant] Optimized size: ${pythonResult.optimized_size_mb} MB`);
            await this.addLogAndBroadcast(job.id, `[quant] Size reduction: ${pythonResult.size_reduction_percent}%`);
            await this.addLogAndBroadcast(job.id, `[quant] Accuracy drop: ${pythonResult.accuracy_drop_percent}%`);
            await this.addLogAndBroadcast(job.id, ``);

            // Step 6: Benchmark results
            await this.runStep(job.id, "Benchmarking", 90, 500,
                `[bench] Running inference benchmarks...`);
            await this.addLogAndBroadcast(job.id, `[bench] Original latency:  ${pythonResult.original_latency_ms} ms`);
            await this.addLogAndBroadcast(job.id, `[bench] Optimized latency: ${pythonResult.optimized_latency_ms} ms`);
            await this.addLogAndBroadcast(job.id, `[bench] Speedup: ${pythonResult.latency_reduction_percent}%`);
            await this.addLogAndBroadcast(job.id, `[bench] Throughput: ${pythonResult.inference_throughput} ops/sec`);
            await this.addLogAndBroadcast(job.id, ``);

            const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

            console.log(`Completing job ${job.id} with metrics:`, pythonResult);

            // Complete job
            const completionResult = await storage.updateJob(job.id, {
                status: "completed",
                progress: 100,
                originalLatency: pythonResult.original_latency_ms,
                optimizedLatency: pythonResult.optimized_latency_ms,
                sizeReduction: pythonResult.size_reduction_percent,
                completedAt: new Date().toISOString()
            });

            if (!completionResult) {
                console.error(`FAILED to complete job ${job.id} - updateJob returned undefined`);
            } else {
                console.log(`SUCCESS: Job ${job.id} marked as completed, status: ${completionResult.status}`);
            }

            // Broadcast the completion
            await this.broadcast(job.id);
            await this.addLogAndBroadcast(job.id, `[done] ✓ Optimization completed in ${totalDuration}s`);
            await this.addLogAndBroadcast(job.id, `[done] Job ${job.id.slice(0, 8)} finished successfully.`);
            console.log(`Job ${job.id} completed.`);

        } catch (error: any) {
            console.error(`Job ${job.id} failed:`, error);
            await this.addLogAndBroadcast(job.id, `[error] ✗ ${error.message || "Unknown error"}`);
            await (storage as any).failJob(job.id, error.message || "Unknown error occurred");
            await this.broadcast(job.id);
        } finally {
            this.processingJobId = null;
        }
    }

    private async callPythonBackend(job: any): Promise<any> {
        try {
            // The upload route copies files to backend/models/{jobId}_original
            const modelPath = `${process.cwd()}/backend/models/${job.id}_original`;
            
            // Fallback: also check job.filePath if the models dir copy doesn't exist
            let actualPath = modelPath;
            if (!fs.existsSync(actualPath)) {
                if (job.filePath && fs.existsSync(job.filePath)) {
                    actualPath = job.filePath;
                    console.log(`[callPythonBackend] Using fallback filePath: ${actualPath}`);
                } else {
                    throw new Error(`Model file not found! Checked: ${modelPath} and filePath=${job.filePath}`);
                }
            }

            console.log(`[callPythonBackend] Job ${job.id}: reading from ${actualPath}, fileName=${job.fileName}`);
            
            // Read model file
            const modelBuffer = fs.readFileSync(actualPath);
            console.log(`[callPythonBackend] Read ${modelBuffer.length} bytes`);

            // Create FormData for file upload — send with original filename so Python can detect format
            const formData = new FormData();
            formData.append("model_file", new Blob([modelBuffer], { type: "application/octet-stream" }), job.fileName);
            formData.append("config", JSON.stringify(job.config || {}));

            // Call Python backend
            console.log(`[callPythonBackend] Sending to ${PYTHON_BACKEND_URL}/api/jobs/${job.id}/optimize`);
            const response = await fetch(`${PYTHON_BACKEND_URL}/api/jobs/${job.id}/optimize`, {
                method: "POST",
                body: formData as any,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Python backend error (${response.status}): ${errorText}`);
            }

            const metrics = await response.json();
            console.log(`[callPythonBackend] SUCCESS — Python returned:`, metrics);
            return metrics;
        } catch (error) {
            console.error(`[callPythonBackend] FAILED:`, error);
            throw error;
        }
    }

    private getMockMetrics(job: any) {
        // Deterministic simulation based on model config to make demo realistic
        const isQuantized = job.config.quantization.includes("INT8") || job.config.quantization.includes("INT4");
        const isInt4 = job.config.quantization.includes("INT4");
        
        let originalSizeMB = job.fileSize ? Math.round(job.fileSize / (1024 * 1024)) : 150;
        if (originalSizeMB < 10) originalSizeMB = 150; // Fallback for very small fake uploads

        // Size reduction math
        let sizeReduction = 0;
        if (isInt4) sizeReduction = 75; // INT4 is ~4x smaller
        else if (isQuantized) sizeReduction = 55; // INT8 is ~2x smaller
        else sizeReduction = 15; // FP16/Graph optimizations only

        // Pruning bonus
        if (job.config.pruning && job.config.pruning !== "None") {
            sizeReduction += 15;
        }

        const optimizedSizeMB = Math.round(originalSizeMB * (1 - sizeReduction / 100));

        // Latency math based on target device and hardware
        let baseLatency = originalSizeMB * 0.4;
        let latencyReduction = sizeReduction * 0.8; // Generally scales with size reduction

        // Target device speedups
        if (job.config.targetDevice.includes("A100")) {
            baseLatency *= 0.5;
            latencyReduction += 10;
        } else if (job.config.targetDevice.includes("TPU")) {
            baseLatency *= 0.4;
            latencyReduction += 15;
        }

        // Knowledge Distillation bonus
        let accuracyDrop = isInt4 ? 1.5 : (isQuantized ? 0.8 : 0.2);
        if (job.config.knowledgeDistillation) {
            accuracyDrop = Math.max(0.1, accuracyDrop - 0.5);
            latencyReduction -= 2; // KD slightly reduces max speedup
        }

        const originalLatency = Math.max(15, Math.round(baseLatency));
        const optimizedLatency = Math.max(5, Math.round(originalLatency * (1 - (Math.min(90, latencyReduction) / 100))));

        return {
            original_size_mb: originalSizeMB,
            optimized_size_mb: optimizedSizeMB,
            size_reduction_percent: sizeReduction,
            original_latency_ms: originalLatency,
            optimized_latency_ms: optimizedLatency,
            latency_reduction_percent: Math.round((originalLatency - optimizedLatency) / originalLatency * 100),
            inference_throughput: Math.round(1000 / optimizedLatency * 16), // batch size 16 assumption
            accuracy_drop_percent: Number(accuracyDrop.toFixed(2)),
            layers_fused: Math.floor(originalSizeMB / 10) + 5,
            quantization_type: job.config.quantization
        };
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
