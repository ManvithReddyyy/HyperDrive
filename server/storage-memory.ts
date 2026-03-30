import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type {
    Job,
    CreateJob,
    User,
    InsertUser,
    DeploymentCode,
} from "@shared/schema";
import type { IStorage } from "./storage-supabase";

const DATA_FILE = path.join(process.cwd(), "data", "storage.json");

interface StorageData {
    jobs: Record<string, Job>;
    users: Record<string, User>;
    templates: Record<string, any>;
    webhooks: Record<string, any>;
    apiKeys: Record<string, any>;
    teams: Record<string, any>;
    teamMembers: any[];
    comments: any[];
    auditLogs: any[];
    alerts: Record<string, any>;
    batches: Record<string, any>;
}

function emptyData(): StorageData {
    return {
        jobs: {}, users: {}, templates: {}, webhooks: {},
        apiKeys: {}, teams: {}, teamMembers: [], comments: [],
        auditLogs: [], alerts: {}, batches: {},
    };
}

export class MemoryStorage implements IStorage {
    private jobs: Map<string, Job>;
    private users: Map<string, User>;
    private templates: Map<string, any>;
    private webhooks: Map<string, any>;
    private apiKeys: Map<string, any>;
    private teams: Map<string, any>;
    private teamMembers: any[];
    private comments: any[];
    private auditLogs: any[];
    private alerts: Map<string, any>;
    private batches: Map<string, any>;
    private saveTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        // Load persisted data from disk
        const data = this.loadFromDisk();
        this.jobs = new Map(Object.entries(data.jobs));
        this.users = new Map(Object.entries(data.users));
        this.templates = new Map(Object.entries(data.templates));
        this.webhooks = new Map(Object.entries(data.webhooks));
        this.apiKeys = new Map(Object.entries(data.apiKeys));
        this.teams = new Map(Object.entries(data.teams));
        this.teamMembers = data.teamMembers;
        this.comments = data.comments;
        this.auditLogs = data.auditLogs;
        this.alerts = new Map(Object.entries(data.alerts));
        this.batches = new Map(Object.entries(data.batches));

        const jobCount = this.jobs.size;
        if (jobCount > 0) {
            console.log(`[MemoryStorage] Loaded ${jobCount} jobs from disk`);
        } else {
            console.log(`[MemoryStorage] No persisted data found, starting fresh`);
        }
    }

    // ================== Persistence ==================
    private loadFromDisk(): StorageData {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const raw = fs.readFileSync(DATA_FILE, "utf-8");
                return JSON.parse(raw);
            }
        } catch (err) {
            console.error("[MemoryStorage] Error loading data file, starting fresh:", err);
        }
        return emptyData();
    }

    private scheduleSave() {
        // Debounce saves — write at most once every 500ms
        if (this.saveTimer) return;
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            this.saveToDisk();
        }, 500);
    }

    private saveToDisk() {
        try {
            const dir = path.dirname(DATA_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data: StorageData = {
                jobs: Object.fromEntries(this.jobs),
                users: Object.fromEntries(this.users),
                templates: Object.fromEntries(this.templates),
                webhooks: Object.fromEntries(this.webhooks),
                apiKeys: Object.fromEntries(this.apiKeys),
                teams: Object.fromEntries(this.teams),
                teamMembers: this.teamMembers,
                comments: this.comments,
                auditLogs: this.auditLogs,
                alerts: Object.fromEntries(this.alerts),
                batches: Object.fromEntries(this.batches),
            };
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
        } catch (err) {
            console.error("[MemoryStorage] Error saving data:", err);
        }
    }

    // ================== Jobs ==================
    async createJob(data: CreateJob, userId: string): Promise<Job> {
        const id = randomUUID();
        const now = new Date().toISOString();
        const job: Job = {
            id,
            fileName: data.fileName,
            fileSize: data.fileSize || 0,
            status: "pending",
            config: data.config,
            progress: 0,
            logs: [],
            pipelineSteps: [],
            originalLatency: undefined,
            optimizedLatency: undefined,
            sizeReduction: undefined,
            createdAt: now,
            completedAt: undefined,
        };
        this.jobs.set(id, job);
        this.scheduleSave();
        console.log(`[MemoryStorage] Created job ${id} for user ${userId}`);
        return job;
    }

    async getJob(id: string): Promise<Job | undefined> {
        return this.jobs.get(id);
    }

    async getAllJobs(userId?: string): Promise<Job[]> {
        const all = Array.from(this.jobs.values());
        return all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    }

    async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
        const job = this.jobs.get(id);
        if (!job) return undefined;

        const updated = { ...job, ...updates };
        this.jobs.set(id, updated);
        this.scheduleSave();
        console.log(`[MemoryStorage] Updated job ${id}, status: ${updated.status}`);
        return updated;
    }

    async getDeploymentCode(jobId: string): Promise<DeploymentCode | undefined> {
        const job = await this.getJob(jobId);
        if (!job || job.status !== "completed") return undefined;

        const modelBase = job.fileName.replace(/\.(pt|pth|onnx|pb)$/i, '');
        const modelFile = `${modelBase}_optimized.onnx`;
        const quant = job.config.quantization || "INT8 Dynamic";
        const device = job.config.targetDevice || "NVIDIA T4";
        const origLatency = job.originalLatency ?? "N/A";
        const optLatency = job.optimizedLatency ?? "N/A";
        const sizeRed = job.sizeReduction ?? "N/A";

        // Determine provider based on target device
        let provider = "'CPUExecutionProvider'";
        if (device.includes("NVIDIA")) provider = "'CUDAExecutionProvider', 'CPUExecutionProvider'";
        else if (device.includes("AMD")) provider = "'ROCMExecutionProvider', 'CPUExecutionProvider'";
        else if (device.includes("Intel") && device.includes("Arc")) provider = "'DnnlExecutionProvider', 'CPUExecutionProvider'";
        else if (device.includes("Apple")) provider = "'CoreMLExecutionProvider', 'CPUExecutionProvider'";

        // Determine dtype based on quantization
        let dtype = "np.float32";
        let dtypeComment = "";
        if (quant.includes("FP16") || quant.includes("Half")) { dtype = "np.float16"; dtypeComment = "# FP16 half-precision"; }
        else if (quant.includes("BF16")) { dtype = "np.float32"; dtypeComment = "# BF16 cast handled by runtime"; }
        else if (quant.includes("INT8")) { dtype = "np.float32"; dtypeComment = "# INT8 quantized, input still float32"; }

        const python = `#!/usr/bin/env python3
"""
HyperDrive — Auto-Generated Production Inference Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model     : ${job.fileName}
Optimized : ${modelFile}
Strategy  : ${quant} on ${device}
Latency   : ${origLatency}ms → ${optLatency}ms  (${sizeRed}% size reduction)
Generated : ${new Date().toISOString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import time
import logging
import numpy as np
import onnxruntime as ort
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

# ── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("hyperdrive.${modelBase}")

# ── Prometheus Metrics ────────────────────────────────────────────────────────
REQUEST_COUNT = Counter("inference_requests_total", "Total inference requests", ["status"])
LATENCY_HIST  = Histogram("inference_latency_seconds", "Inference latency",
                           buckets=[.005, .01, .025, .05, .1, .25, .5, 1.0])

# ── Model Config ──────────────────────────────────────────────────────────────
MODEL_PATH   = "${modelFile}"
PROVIDERS    = [${provider}]
QUANTIZATION = "${quant}"
DEVICE       = "${device}"

# ── ONNX Session ──────────────────────────────────────────────────────────────
sess_options = ort.SessionOptions()
sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
sess_options.intra_op_num_threads = 4
sess_options.execution_mode = ort.ExecutionMode.ORT_PARALLEL

session = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global session
    log.info(f"Loading model: {MODEL_PATH}")
    session = ort.InferenceSession(MODEL_PATH, sess_options, providers=PROVIDERS)
    log.info(f"Ready  ·  providers={session.get_providers()}")
    log.info(f"Input  → {session.get_inputs()[0].name}  {session.get_inputs()[0].shape}")
    log.info(f"Output → {session.get_outputs()[0].name}  {session.get_outputs()[0].shape}")
    yield
    log.info("Shutting down.")

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="HyperDrive Inference API",
    description="Optimized inference server for **${modelBase}** (${quant})",
    version="1.0.0",
    lifespan=lifespan,
)

class InferenceRequest(BaseModel):
    inputs: list[list[Any]]

class InferenceResponse(BaseModel):
    outputs: list[list[float]]
    latency_ms: float
    model: str
    device: str

@app.get("/health", tags=["ops"])
async def health():
    return {"status": "ok", "model": "${modelBase}", "quantization": QUANTIZATION}

@app.get("/ready", tags=["ops"])
async def ready():
    if session is None:
        raise HTTPException(503, "Model not loaded yet")
    return {"status": "ready"}

@app.get("/metrics", tags=["ops"])
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/predict", response_model=InferenceResponse, tags=["inference"])
async def predict(req: InferenceRequest):
    if session is None:
        raise HTTPException(503, "Model not ready")
    try:
        inp  = session.get_inputs()[0]
        out  = session.get_outputs()[0]
        arr  = np.array(req.inputs, dtype=${dtype})  ${dtypeComment}
        t0   = time.perf_counter()
        res  = session.run([out.name], {inp.name: arr})[0]
        lat  = (time.perf_counter() - t0) * 1000
        LATENCY_HIST.observe(lat / 1000)
        REQUEST_COUNT.labels(status="success").inc()
        log.info(f"predict  batch={arr.shape[0]}  latency={lat:.2f}ms")
        return InferenceResponse(outputs=res.tolist(), latency_ms=round(lat, 3),
                                 model="${modelBase}", device=DEVICE)
    except Exception as exc:
        REQUEST_COUNT.labels(status="error").inc()
        raise HTTPException(500, f"Inference error: {exc}") from exc

@app.get("/benchmark", tags=["inference"])
async def benchmark(runs: int = 50):
    """Quick latency benchmark using random inputs."""
    if session is None:
        raise HTTPException(503, "Model not ready")
    inp   = session.get_inputs()[0]
    shape = [s if isinstance(s, int) else 1 for s in inp.shape]
    dummy = np.random.randn(*shape).astype(${dtype})
    for _ in range(5): session.run(None, {inp.name: dummy})   # warmup
    times = []
    for _ in range(runs):
        t0 = time.perf_counter()
        session.run(None, {inp.name: dummy})
        times.append((time.perf_counter() - t0) * 1000)
    return {
        "model": "${modelBase}", "quantization": QUANTIZATION,
        "runs": runs,
        "mean_ms":  round(float(np.mean(times)), 2),
        "p50_ms":   round(float(np.percentile(times, 50)), 2),
        "p95_ms":   round(float(np.percentile(times, 95)), 2),
        "p99_ms":   round(float(np.percentile(times, 99)), 2),
        "throughput_rps": round(1000 / float(np.mean(times)), 1),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, workers=1, log_level="info")
`;

        // GPU kind for Triton
        let gpuKind = "KIND_GPU";
        if (device.includes("CPU") || device.includes("Intel Xeon") || device.includes("Intel Core")) gpuKind = "KIND_CPU";

        const triton = `# ═══════════════════════════════════════════════════════════
# Triton Inference Server  ·  HyperDrive Auto-Config
# Model   : ${modelBase}  (${quant})
# Device  : ${device}
# Latency : ${origLatency}ms → ${optLatency}ms
# ═══════════════════════════════════════════════════════════

name: "${modelBase}"
platform: "onnxruntime_onnx"
max_batch_size: 16

input [
  {
    name: "input"
    data_type: TYPE_FP32
    dims: [ -1 ]   # Replace with actual input dims, e.g. [ 3, 224, 224 ]
  }
]

output [
  {
    name: "output"
    data_type: TYPE_FP32
    dims: [ -1 ]
  }
]

instance_group [
  {
    count: 2
    kind: ${gpuKind}
  }
]

dynamic_batching {
  preferred_batch_size: [ 4, 8, 16 ]
  max_queue_delay_microseconds: 500
  preserve_ordering: true
}

optimization { graph { level: 2 } }

parameters {
  key: "intra_op_thread_count"
  value: { string_value: "4" }
}

model_warmup [
  {
    name: "warmup"
    batch_size: 1
    inputs { key: "input"  value: { data_type: TYPE_FP32  dims: [1]  zero_data: true } }
  }
]
`;

        const docker = `# ════════════════════════════════════════════════════════
# HyperDrive  ·  Production Dockerfile (Multi-Stage)
# Model   : ${job.fileName} → ${modelFile}
# Config  : ${quant} | ${device}
# Perf    : ${origLatency}ms → ${optLatency}ms  ·  ${sizeRed}% smaller
# ════════════════════════════════════════════════════════

# ── Stage 1: Dependency Builder ──────────────────────────
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \\
        build-essential curl && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN pip install --upgrade pip && \\
    pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ── Stage 2: Production Runtime ──────────────────────────
FROM python:3.11-slim AS runtime

LABEL maintainer="HyperDrive <team@hyperdrive.ai>"
LABEL model="${modelBase}"
LABEL quantization="${quant}"

# Security: non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
WORKDIR /app

COPY --from=builder /wheels /wheels
RUN pip install --no-cache /wheels/*

COPY server.py .
COPY ${modelFile} .

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \\
  CMD curl -f http://localhost:8080/health || exit 1

# ── requirements.txt ─────────────────────────────────────
# onnxruntime-gpu==1.17.3
# fastapi==0.110.0
# uvicorn[standard]==0.29.0
# pydantic==2.6.4
# numpy==1.26.4
# prometheus-client==0.20.0

CMD ["python", "server.py"]
`;

        return { python, triton, docker };
    }



    // ================== Users ==================
    async getUser(id: string): Promise<User | undefined> {
        return this.users.get(id);
    }

    async getUserByUsername(username: string): Promise<User | undefined> {
        return Array.from(this.users.values()).find(u => u.username === username);
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        return Array.from(this.users.values()).find(u => u.username === email);
    }

    async createUser(user: InsertUser & { id: string }): Promise<User> {
        const newUser: User = { id: user.id, username: user.username, password: "" };
        this.users.set(user.id, newUser);
        this.scheduleSave();
        return newUser;
    }

    // ================== Job Processor Helpers ==================
    subscribeToJobUpdates(jobId: string, callback: (job: Job) => void): () => void {
        return () => { };
    }

    async addJobLog(jobId: string, log: string): Promise<void> {
        const job = this.jobs.get(jobId);
        if (!job) return;
        if (!job.logs) job.logs = [];
        job.logs.push(log);
        this.jobs.set(jobId, job);
        this.scheduleSave();
    }

    async addPipelineStep(jobId: string, step: any): Promise<void> {
        const job = this.jobs.get(jobId);
        if (!job) return;
        if (!job.pipelineSteps) job.pipelineSteps = [];
        job.pipelineSteps.push(step);
        this.jobs.set(jobId, job);
        this.scheduleSave();
    }

    async updatePipelineStep(jobId: string, updatedStep: any): Promise<void> {
        const job = this.jobs.get(jobId);
        if (!job || !job.pipelineSteps) return;
        job.pipelineSteps = job.pipelineSteps.map((s: any) => s.name === updatedStep.name ? updatedStep : s);
        this.jobs.set(jobId, job);
        this.scheduleSave();
    }

    async failJob(jobId: string, errorMessage: string): Promise<void> {
        await this.addJobLog(jobId, `ERROR: ${errorMessage}`);
        await this.updateJob(jobId, { status: "failed" });
    }

    // ================== Templates ==================
    async createTemplate(data: any, userId: string): Promise<any> {
        const id = randomUUID();
        const template = {
            id, name: data.name, description: data.description || null,
            config: data.config, userId, isPublic: data.isPublic || false,
            usageCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        this.templates.set(id, template);
        this.scheduleSave();
        return template;
    }

    async getTemplates(userId: string): Promise<any[]> {
        return Array.from(this.templates.values()).filter(t => t.userId === userId || t.isPublic);
    }

    async getTemplate(id: string): Promise<any | undefined> {
        return this.templates.get(id);
    }

    async deleteTemplate(id: string, userId: string): Promise<boolean> {
        const t = this.templates.get(id);
        if (t && t.userId === userId) { this.templates.delete(id); this.scheduleSave(); return true; }
        return false;
    }

    async incrementTemplateUsage(id: string): Promise<void> {
        const t = this.templates.get(id);
        if (t) { t.usageCount++; this.templates.set(id, t); this.scheduleSave(); }
    }

    // ================== Webhooks ==================
    async createWebhook(data: any, userId: string): Promise<any> {
        const id = randomUUID();
        const webhook = {
            id, name: data.name, url: data.url, events: data.events,
            secret: data.secret || null, isActive: true, userId,
            lastTriggeredAt: null, createdAt: new Date().toISOString(),
        };
        this.webhooks.set(id, webhook);
        this.scheduleSave();
        return webhook;
    }

    async getWebhooks(userId: string): Promise<any[]> {
        return Array.from(this.webhooks.values()).filter(w => w.userId === userId);
    }

    async deleteWebhook(id: string, userId: string): Promise<boolean> {
        const w = this.webhooks.get(id);
        if (w && w.userId === userId) { this.webhooks.delete(id); this.scheduleSave(); return true; }
        return false;
    }

    async triggerWebhooks(event: string, payload: any, userId: string): Promise<void> {
        // Silently skip in memory mode
    }

    // ================== API Keys ==================
    async createApiKey(data: any, userId: string): Promise<{ key: string; apiKey: any }> {
        const fullKey = `hd_${this.generateRandomString(32)}`;
        const id = randomUUID();
        const apiKey = {
            id, name: data.name, keyPrefix: fullKey.substring(0, 11),
            scopes: data.scopes || ["read", "write"],
            expiresAt: data.expiresInDays
                ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
                : null,
            lastUsedAt: null, userId, createdAt: new Date().toISOString(),
        };
        this.apiKeys.set(id, { ...apiKey, keyHash: fullKey });
        this.scheduleSave();
        return { key: fullKey, apiKey };
    }

    async getApiKeys(userId: string): Promise<any[]> {
        return Array.from(this.apiKeys.values()).filter(k => k.userId === userId);
    }

    async revokeApiKey(id: string, userId: string): Promise<boolean> {
        const k = this.apiKeys.get(id);
        if (k && k.userId === userId) { this.apiKeys.delete(id); this.scheduleSave(); return true; }
        return false;
    }

    async validateApiKey(key: string): Promise<any | null> {
        return Array.from(this.apiKeys.values()).find(k => k.keyHash === key) || null;
    }

    // ================== Teams ==================
    async createTeam(name: string, description: string | undefined, userId: string): Promise<any> {
        const id = randomUUID();
        const team = { id, name, description, ownerId: userId, createdAt: new Date().toISOString() };
        this.teams.set(id, team);
        this.teamMembers.push({ id: randomUUID(), teamId: id, userId, role: "owner", joinedAt: new Date().toISOString() });
        this.scheduleSave();
        return team;
    }

    async getTeams(userId: string): Promise<any[]> {
        const memberTeamIds = this.teamMembers.filter(m => m.userId === userId).map(m => m.teamId);
        return Array.from(this.teams.values()).filter(t => memberTeamIds.includes(t.id));
    }

    async getTeamMembers(teamId: string): Promise<any[]> {
        return this.teamMembers.filter(m => m.teamId === teamId).map(m => {
            const user = this.users.get(m.userId);
            return { ...m, username: user?.username || "unknown" };
        });
    }

    async inviteToTeam(teamId: string, email: string, role: string): Promise<boolean> {
        const user = await this.getUserByEmail(email);
        if (!user) return false;
        this.teamMembers.push({ id: randomUUID(), teamId, userId: user.id, role, joinedAt: new Date().toISOString() });
        this.scheduleSave();
        return true;
    }

    // ================== Comments ==================
    async addComment(jobId: string, userId: string, username: string, content: string): Promise<any> {
        const comment = { id: randomUUID(), jobId, userId, username, content, createdAt: new Date().toISOString() };
        this.comments.push(comment);
        this.scheduleSave();
        return comment;
    }

    async getComments(jobId: string): Promise<any[]> {
        return this.comments.filter(c => c.jobId === jobId);
    }

    // ================== Audit Log ==================
    async logAudit(userId: string, username: string, action: string, resourceType: string, resourceId: string, details?: any): Promise<void> {
        this.auditLogs.push({ id: randomUUID(), userId, username, action, resourceType, resourceId, details, timestamp: new Date().toISOString() });
        this.scheduleSave();
    }

    async getAuditLogs(userId: string, limit: number = 50): Promise<any[]> {
        return this.auditLogs.filter(l => l.userId === userId).slice(-limit).reverse();
    }

    // ================== Alerts ==================
    async createAlert(data: any, userId: string): Promise<any> {
        const id = randomUUID();
        const alert = {
            id, name: data.name, condition: data.condition, threshold: data.threshold,
            jobId: data.jobId || null, isActive: true, userId,
            lastTriggeredAt: null, createdAt: new Date().toISOString(),
        };
        this.alerts.set(id, alert);
        this.scheduleSave();
        return alert;
    }

    async getAlerts(userId: string): Promise<any[]> {
        return Array.from(this.alerts.values()).filter(a => a.userId === userId);
    }

    async toggleAlert(id: string, userId: string): Promise<boolean> {
        const a = this.alerts.get(id);
        if (!a || a.userId !== userId) return false;
        a.isActive = !a.isActive;
        this.alerts.set(id, a);
        this.scheduleSave();
        return true;
    }

    // ================== Batch Jobs ==================
    async createBatch(name: string, jobIds: string[], userId: string): Promise<any> {
        const id = randomUUID();
        const batch = {
            id, name, jobIds, status: "pending", totalJobs: jobIds.length,
            completedJobs: 0, failedJobs: 0, userId,
            createdAt: new Date().toISOString(), completedAt: null,
        };
        this.batches.set(id, batch);
        this.scheduleSave();
        return batch;
    }

    async getBatches(userId: string): Promise<any[]> {
        return Array.from(this.batches.values()).filter(b => b.userId === userId);
    }

    async updateBatchProgress(batchId: string, completedJobs: number, failedJobs: number): Promise<void> {
        const batch = this.batches.get(batchId);
        if (!batch) return;
        batch.completedJobs = completedJobs;
        batch.failedJobs = failedJobs;
        const done = completedJobs + failedJobs >= batch.totalJobs;
        batch.status = done ? (failedJobs > 0 ? "partial" : "completed") : "running";
        if (done) batch.completedAt = new Date().toISOString();
        this.batches.set(batchId, batch);
        this.scheduleSave();
    }

    // ================== Utility ==================
    private generateRandomString(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

export const storage = new MemoryStorage();
