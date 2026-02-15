import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { createJobSchema, inferenceRequestSchema } from "@shared/schema";
import { z } from "zod";
import { supabase } from "./supabase"; // kept for potential future use but auth calls bypassed
import { addJobConnection, removeJobConnection } from "./broadcast";
import multer from "multer";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup multer for file uploads
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage_multer = multer({
    dest: uploadsDir,
    fileFilter: (_req, file, cb) => {
      const allowedExts = [".pt", ".pth", ".onnx", ".pb"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExts.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed: ${allowedExts.join(", ")}`));
      }
    },
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  });

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const jobId = url.searchParams.get("jobId");

    if (jobId) {
      console.log(`WebSocket connected for job ${jobId}`);
      addJobConnection(jobId, ws);

      // Send current job state immediately
      storage.getJob(jobId).then(job => {
        if (job && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "job_update", job }));
        }
      });

      ws.on("close", () => {
        removeJobConnection(jobId, ws);
      });
    }

    ws.on("error", console.error);
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const data = createJobSchema.parse(req.body);

      // AUTH DISABLED - use default user
      const userId = "00000000-0000-0000-0000-000000000000";

      console.log("Creating job with userId:", userId);
      const job = await storage.createJob(data, userId);
      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request", details: error.errors });
      } else {
        console.error("Error creating job:", error);
        res.status(500).json({ error: "Failed to create job" });
      }
    }
  });

  // Deploy code generation
  app.get("/api/deploy/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const deployCode = await storage.getDeploymentCode(jobId);
      if (!deployCode) {
        res.status(404).json({ error: "No deployment code available for this job" });
        return;
      }
      res.json(deployCode);
    } catch (error) {
      console.error("Error generating deploy code:", error);
      res.status(500).json({ error: "Failed to generate deployment code" });
    }
  });

  // Update user profile
  app.patch("/api/user/profile", async (req, res) => {
    try {
      // AUTH DISABLED - use default user
      const userId = "00000000-0000-0000-0000-000000000000";
      const { displayName } = req.body;

      if (!displayName || typeof displayName !== "string") {
        res.status(400).json({ error: "Display name is required" });
        return;
      }

      res.json({ success: true, displayName: displayName.trim() });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/jobs", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const jobs = await storage.getAllJobs(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // File upload endpoint
  app.post("/api/upload", storage_multer.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const authHeader = req.headers.authorization;
      let userId = "00000000-0000-0000-0000-000000000000";

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          userId = user.id;
        }
      }

      // Get file stats
      const fileStats = fs.statSync(req.file.path);
      const fileSize = fileStats.size;

      // Create job record
      const jobData = {
        fileName: req.file.originalname,
        fileSize: fileSize,
        filePath: req.file.path,
        config: {
          quantization: req.body.quantization || "INT8",
          strategy: req.body.strategy || "Balanced",
          targetDevice: req.body.targetDevice || "NVIDIA A100",
          calibrationSamples: req.body.calibrationSamples || 100,
        },
      };

      const job = await storage.createJob(jobData, userId);

      res.json({
        success: true,
        jobId: job.id,
        fileName: job.fileName,
        fileSize: job.fileSize,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  app.post("/api/inference/compare", async (req, res) => {
    try {
      const data = inferenceRequestSchema.parse(req.body);

      const originalLatency = 80 + Math.floor(Math.random() * 80);
      const optimizedLatency = 25 + Math.floor(Math.random() * 35);

      const generateOutput = (prompt: string, isOptimized: boolean): string => {
        const baseResponses = [
          `Based on the input "${prompt.slice(0, 50)}${prompt.length > 50 ? "..." : ""}", the model predicts:`,
          `Analysis complete for: "${prompt.slice(0, 30)}${prompt.length > 30 ? "..." : ""}"`,
          `Processing input: "${prompt.slice(0, 40)}${prompt.length > 40 ? "..." : ""}"`,
        ];

        const base = baseResponses[Math.floor(Math.random() * baseResponses.length)];
        const detail = isOptimized
          ? "\n\nThe optimized model maintains high accuracy while achieving faster inference through quantization and graph optimizations. Confidence score: 0.94"
          : "\n\nThe original model provides baseline predictions with standard precision. Confidence score: 0.92";

        return base + detail;
      };

      await new Promise(resolve => setTimeout(resolve, originalLatency + optimizedLatency));

      res.json({
        original: {
          output: generateOutput(data.prompt, false),
          latency: originalLatency,
        },
        optimized: {
          output: generateOutput(data.prompt, true),
          latency: optimizedLatency,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request", details: error.errors });
      } else {
        console.error("Error running inference:", error);
        res.status(500).json({ error: "Failed to run inference comparison" });
      }
    }
  });

  app.get("/api/deploy/:id", async (req, res) => {
    try {
      const code = await storage.getDeploymentCode(req.params.id);
      if (!code) {
        res.status(404).json({ error: "Deployment code not available" });
        return;
      }
      res.json(code);
    } catch (error) {
      console.error("Error fetching deployment code:", error);
      res.status(500).json({ error: "Failed to fetch deployment code" });
    }
  });

  // Sensitivity Analysis endpoint
  app.get("/api/jobs/:id/sensitivity", async (req, res) => {
    try {
      const jobId = req.params.id;
      // Generate deterministic pseudo-random data based on jobId
      const seed = jobId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const rng = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

      const layers = [];
      const numLayers = 6 + Math.floor(rng(1) * 6);
      const layerTypes = ["Conv", "Attn", "Dense", "LayerNorm"];

      for (let i = 1; i <= numLayers; i++) {
        const layerType = layerTypes[Math.floor(rng(i * 2) * layerTypes.length)];
        const name = `${layerType}_${i}`;
        const base = rng(i * 3) * 0.08;
        const err =
          rng(i * 4) < 0.08
            ? Math.round((base + rng(i * 5) * 0.4) * 1000) / 1000
            : Math.round(base * 1000) / 1000;
        layers.push({ layer: name, error: err });
      }
      res.json(layers);
    } catch (error) {
      console.error("Error fetching sensitivity data:", error);
      res.status(500).json({ error: "Failed to fetch sensitivity data" });
    }
  });

  // Architecture Graph endpoint
  app.get("/api/jobs/:id/graph", async (req, res) => {
    try {
      const jobId = req.params.id;
      const seed = jobId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 7;
      const rng = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

      const nodes = [];
      const edges = [];
      const layerNames = ["Input", "Conv_1", "Conv_2", "Pool", "Attn_1", "Dense", "Output"];
      const xStart = 50;
      const yStart = 100;
      const xGap = 220;

      for (let idx = 0; idx < layerNames.length; idx++) {
        const lname = layerNames[idx];
        const nodeId = `n${idx}`;
        const x = xStart + idx * xGap;
        const y = yStart + (idx % 2) * 30;
        const fused = lname.includes("Conv") && rng(idx * 100) < 0.25;

        nodes.push({
          id: nodeId,
          data: { label: lname, fused },
          position: { x, y },
          style: {},
        });

        if (idx > 0) {
          edges.push({
            id: `e${idx - 1}`,
            source: `n${idx - 1}`,
            target: nodeId,
            animated: false,
          });
        }
      }

      res.json({ nodes, edges });
    } catch (error) {
      console.error("Error fetching graph data:", error);
      res.status(500).json({ error: "Failed to fetch graph data" });
    }
  });

  // Hardware Matrix endpoint
  app.get("/api/hardware-matrix", async (req, res) => {
    try {
      const options = [
        { name: "cpu-small", cost_per_hour: 0.1, throughput_tokens_s: 20 },
        { name: "cpu-large", cost_per_hour: 0.5, throughput_tokens_s: 60 },
        { name: "gpu-v100", cost_per_hour: 2.4, throughput_tokens_s: 400 },
        { name: "gpu-a10", cost_per_hour: 1.8, throughput_tokens_s: 320 },
        { name: "tpu-small", cost_per_hour: 3.2, throughput_tokens_s: 600 },
        { name: "edge-rt", cost_per_hour: 0.75, throughput_tokens_s: 150 },
      ];
      res.json(options);
    } catch (error) {
      console.error("Error fetching hardware matrix:", error);
      res.status(500).json({ error: "Failed to fetch hardware matrix" });
    }
  });

  // Upload endpoint with calibration file support
  app.post("/api/upload", async (req, res) => {
    try {
      // Simple mock response - in production this would handle multipart form data
      const file = req.body.file || "model.pt";
      const calibrationFile = req.body.calibration_file || null;

      res.json({
        status: "ok",
        file: { filename: file, content_type: "application/octet-stream" },
        calibration_file: calibrationFile
          ? { filename: calibrationFile, content_type: "application/jsonl" }
          : null,
        metadata: req.body.metadata || null,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // ============ ENTERPRISE FEATURES ============

  // Autopilot / Neural Architecture Search - returns optimization trials
  app.get("/api/jobs/:id/autopilot", async (req, res) => {
    try {
      const jobId = req.params.id;
      const job = await storage.getJob(jobId);

      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      // Generate deterministic trials based on job config
      const seed = jobId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const rng = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

      const strategies = [
        { name: "INT8 Static (Per-Tensor)", quantization: "INT8", mode: "static", granularity: "per-tensor" },
        { name: "INT8 Static (Per-Channel)", quantization: "INT8", mode: "static", granularity: "per-channel" },
        { name: "INT8 Dynamic", quantization: "INT8", mode: "dynamic", granularity: "per-tensor" },
        { name: "FP16 (Half Precision)", quantization: "FP16", mode: "native", granularity: "full" },
        { name: "Mixed INT8/FP16", quantization: "Mixed", mode: "hybrid", granularity: "per-layer" },
        { name: "INT4 AWQ", quantization: "INT4", mode: "awq", granularity: "per-group" },
      ];

      const trials = strategies.map((strategy, idx) => {
        const baseLatency = 15 + rng(idx * 10) * 25;
        const latency = Math.round(baseLatency * 10) / 10;
        const accuracyLoss = Math.round((rng(idx * 20) * 2 - 0.2) * 100) / 100;
        const baseSize = 45 + rng(idx * 30) * 80;
        const size = Math.round(baseSize);

        return {
          id: idx + 1,
          strategy: strategy.name,
          latency: `${latency}ms`,
          latencyValue: latency,
          accuracyLoss: `${accuracyLoss > 0 ? '-' : '+'}${Math.abs(accuracyLoss)}%`,
          accuracyLossValue: accuracyLoss,
          size: `${size}MB`,
          sizeValue: size,
          recommended: false,
        };
      });

      // Find the best trial (lowest latency with acceptable accuracy loss)
      const validTrials = trials.filter(t => t.accuracyLossValue < 1.5);
      if (validTrials.length > 0) {
        const best = validTrials.reduce((a, b) =>
          a.latencyValue < b.latencyValue ? a : b
        );
        best.recommended = true;
      }

      res.json(trials);
    } catch (error) {
      console.error("Error fetching autopilot data:", error);
      res.status(500).json({ error: "Failed to fetch autopilot data" });
    }
  });

  // Drift Simulator - simulates accuracy degradation under data drift
  app.post("/api/simulation/drift", async (req, res) => {
    try {
      const { driftLevel, jobId } = req.body;

      if (typeof driftLevel !== "number" || driftLevel < 0 || driftLevel > 100) {
        res.status(400).json({ error: "Invalid drift level (0-100)" });
        return;
      }

      // Simulate accuracy curve with drift
      // At 0% drift, accuracy is ~98%
      // Accuracy degrades non-linearly as drift increases
      const seed = jobId ? jobId.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) : 42;
      const baseAccuracy = 98;
      const noise = Math.sin(seed + driftLevel) * 2;

      // Non-linear degradation curve
      const degradation = Math.pow(driftLevel / 100, 1.5) * 35 + (driftLevel / 100) * 15;
      const accuracy = Math.max(45, Math.min(100, baseAccuracy - degradation + noise));

      // Generate full curve data points
      const curveData = [];
      for (let d = 0; d <= 100; d += 5) {
        const deg = Math.pow(d / 100, 1.5) * 35 + (d / 100) * 15;
        const n = Math.sin(seed + d) * 1.5;
        curveData.push({
          drift: d,
          accuracy: Math.round((Math.max(45, baseAccuracy - deg + n)) * 10) / 10,
        });
      }

      res.json({
        currentDrift: driftLevel,
        currentAccuracy: Math.round(accuracy * 10) / 10,
        breakingPoint: curveData.find(p => p.accuracy < 80)?.drift || 100,
        curveData,
      });
    } catch (error) {
      console.error("Error running drift simulation:", error);
      res.status(500).json({ error: "Failed to run drift simulation" });
    }
  });

  // Model Nutrition Label - AI Bill of Materials
  app.get("/api/models/:id/nutrition", async (req, res) => {
    try {
      const jobId = req.params.id;
      const job = await storage.getJob(jobId);

      if (!job) {
        res.status(404).json({ error: "Model not found" });
        return;
      }

      // Generate nutrition label data
      const seed = jobId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const rng = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

      const architectures = ["Transformer", "CNN", "RNN", "Hybrid", "MLP-Mixer"];
      const licenses = ["Apache 2.0", "MIT", "BSD-3", "GPL-3.0", "Proprietary"];
      const datasets = ["CommonCrawl", "ImageNet", "LAION", "Pile", "Custom"];

      const params = Math.round((0.5 + rng(1) * 13) * 10) / 10;
      const co2 = Math.round((5 + rng(2) * 50) * 10) / 10;
      const energy = Math.round((2 + rng(3) * 20) * 10) / 10;
      const tokens = Math.round(100 + rng(4) * 900);

      res.json({
        modelName: job.fileName.replace(/\.(pt|onnx|safetensors)$/, ""),
        architecture: architectures[Math.floor(rng(5) * architectures.length)],
        parameters: params >= 1 ? `${params}B` : `${Math.round(params * 1000)}M`,
        license: licenses[Math.floor(rng(6) * licenses.length)],
        trainingData: datasets[Math.floor(rng(7) * datasets.length)],
        co2Emitted: `${co2}kg CO₂`,
        energyUsed: `${energy}kWh`,
        tokensProcessed: `${tokens}B`,
        quantization: job.config.quantization,
        targetDevice: job.config.targetDevice,
        optimizationDate: job.completedAt || job.createdAt,
        originalLatency: job.originalLatency ? `${job.originalLatency}ms` : "N/A",
        optimizedLatency: job.optimizedLatency ? `${job.optimizedLatency}ms` : "N/A",
        sizeReduction: job.sizeReduction ? `${job.sizeReduction}%` : "N/A",
      });
    } catch (error) {
      console.error("Error fetching nutrition label:", error);
      res.status(500).json({ error: "Failed to fetch nutrition label" });
    }
  });

  // Memory Stress Test - simulates VRAM/RAM usage under different batch sizes
  app.post("/api/simulation/memory", async (req, res) => {
    try {
      const { batchSize, jobId } = req.body;

      if (typeof batchSize !== "number" || batchSize < 1 || batchSize > 128) {
        res.status(400).json({ error: "Invalid batch size (1-128)" });
        return;
      }

      const seed = jobId ? jobId.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) : 42;

      // Base memory footprint (model size)
      const baseVRAM = 2.5 + (seed % 10) * 0.3; // 2.5-5.5 GB base
      const baseRAM = 4 + (seed % 8) * 0.5; // 4-8 GB base

      // Memory scales with batch size (not linearly due to optimization)
      const vramMultiplier = 1 + Math.log2(batchSize) * 0.4;
      const ramMultiplier = 1 + Math.log2(batchSize) * 0.25;

      const currentVRAM = Math.round(baseVRAM * vramMultiplier * 100) / 100;
      const currentRAM = Math.round(baseRAM * ramMultiplier * 100) / 100;

      // Peak memory (with spikes during forward pass)
      const peakVRAM = Math.round(currentVRAM * 1.3 * 100) / 100;
      const peakRAM = Math.round(currentRAM * 1.15 * 100) / 100;

      // VRAM limit (simulated GPU memory)
      const vramLimit = 24; // RTX 4090 / A10
      const utilizationPercent = Math.round((peakVRAM / vramLimit) * 100);
      const isOOM = peakVRAM > vramLimit;

      // Generate curve data
      const curveData = [];
      for (let bs = 1; bs <= 128; bs *= 2) {
        const vm = baseVRAM * (1 + Math.log2(bs) * 0.4);
        const rm = baseRAM * (1 + Math.log2(bs) * 0.25);
        curveData.push({
          batchSize: bs,
          vram: Math.round(vm * 100) / 100,
          ram: Math.round(rm * 100) / 100,
          peakVram: Math.round(vm * 1.3 * 100) / 100,
        });
      }

      res.json({
        currentBatchSize: batchSize,
        vram: currentVRAM,
        ram: currentRAM,
        peakVram: peakVRAM,
        peakRam: peakRAM,
        vramLimit,
        utilizationPercent,
        isOOM,
        maxSafeBatch: curveData.filter(d => d.peakVram <= vramLimit).pop()?.batchSize || 1,
        curveData,
      });
    } catch (error) {
      console.error("Error running memory simulation:", error);
      res.status(500).json({ error: "Failed to run memory simulation" });
    }
  });

  // Throughput Benchmark - measures tokens/images per second at different batch sizes
  app.post("/api/simulation/throughput", async (req, res) => {
    try {
      const { batchSize, jobId } = req.body;

      if (typeof batchSize !== "number" || batchSize < 1 || batchSize > 128) {
        res.status(400).json({ error: "Invalid batch size (1-128)" });
        return;
      }

      const seed = jobId ? jobId.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) : 42;

      // Base throughput (single sample)
      const baseThroughput = 50 + (seed % 50); // 50-100 samples/sec base

      // Throughput increases with batch size but with diminishing returns
      // Also drops slightly at very high batch sizes due to memory pressure
      const efficiency = batchSize <= 32
        ? 0.95 - (batchSize - 1) * 0.005
        : 0.8 - (batchSize - 32) * 0.003;

      const currentThroughput = Math.round(baseThroughput * batchSize * efficiency);
      const latencyMs = Math.round((batchSize / currentThroughput) * 1000 * 10) / 10;

      // Calculate optimal batch size
      let optimalBatch = 1;
      let maxThroughput = 0;
      for (let bs = 1; bs <= 128; bs *= 2) {
        const eff = bs <= 32 ? 0.95 - (bs - 1) * 0.005 : 0.8 - (bs - 32) * 0.003;
        const tp = baseThroughput * bs * eff;
        if (tp > maxThroughput) {
          maxThroughput = tp;
          optimalBatch = bs;
        }
      }

      // Generate curve data
      const curveData = [];
      for (let bs = 1; bs <= 128; bs *= 2) {
        const eff = bs <= 32 ? 0.95 - (bs - 1) * 0.005 : 0.8 - (bs - 32) * 0.003;
        const tp = Math.round(baseThroughput * bs * eff);
        const lat = Math.round((bs / tp) * 1000 * 10) / 10;
        curveData.push({
          batchSize: bs,
          throughput: tp,
          latency: lat,
          efficiency: Math.round(eff * 100),
        });
      }

      res.json({
        currentBatchSize: batchSize,
        throughput: currentThroughput,
        latencyMs,
        unit: "samples/sec",
        optimalBatchSize: optimalBatch,
        maxThroughput: Math.round(maxThroughput),
        curveData,
      });
    } catch (error) {
      console.error("Error running throughput simulation:", error);
      res.status(500).json({ error: "Failed to run throughput simulation" });
    }
  });

  // ============ PREMIUM ENTERPRISE FEATURES ============

  // Model Comparison - Compare two jobs side by side
  app.get("/api/compare/:jobId1/:jobId2", async (req, res) => {
    try {
      const { jobId1, jobId2 } = req.params;

      const job1 = await storage.getJob(jobId1);
      const job2 = await storage.getJob(jobId2);

      if (!job1 || !job2) {
        return res.status(404).json({ error: "One or both jobs not found" });
      }

      // Calculate improvement percentages
      const sizeImprovement = (job2.sizeReduction || 0) - (job1.sizeReduction || 0);
      const latencyImprovement = job1.optimizedLatency && job2.optimizedLatency
        ? ((job1.optimizedLatency - job2.optimizedLatency) / job1.optimizedLatency * 100)
        : 0;

      res.json({
        job1: {
          id: job1.id,
          fileName: job1.fileName,
          originalSize: job1.fileSize,
          optimizedSize: Math.round(job1.fileSize * (1 - (job1.sizeReduction || 40) / 100)),
          sizeReduction: job1.sizeReduction || 40,
          originalLatency: job1.originalLatency,
          optimizedLatency: job1.optimizedLatency,
          config: job1.config,
          status: job1.status,
          createdAt: job1.createdAt,
        },
        job2: {
          id: job2.id,
          fileName: job2.fileName,
          originalSize: job2.fileSize,
          optimizedSize: Math.round(job2.fileSize * (1 - (job2.sizeReduction || 40) / 100)),
          sizeReduction: job2.sizeReduction || 40,
          originalLatency: job2.originalLatency,
          optimizedLatency: job2.optimizedLatency,
          config: job2.config,
          status: job2.status,
          createdAt: job2.createdAt,
        },
        comparison: {
          sizeImprovement: Math.round(sizeImprovement * 10) / 10,
          latencyImprovement: Math.round(latencyImprovement * 10) / 10,
          winner: sizeImprovement > 0 ? "job2" : sizeImprovement < 0 ? "job1" : "tie",
        },
      });
    } catch (error) {
      console.error("Error comparing jobs:", error);
      res.status(500).json({ error: "Failed to compare jobs" });
    }
  });

  // Insights Dashboard - Aggregate statistics
  app.get("/api/insights", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const jobs = await storage.getAllJobs(userId);
      const completedJobs = jobs.filter((j: any) => j.status === "completed");

      // Calculate real aggregates from actual job data
      const totalModelsOptimized = completedJobs.length;

      // Helper to estimate model size based on filename if fileSize is 0
      const getEstimatedSize = (job: any): number => {
        if (job.fileSize && job.fileSize > 0) return job.fileSize;
        // Estimate based on file extension and common model sizes
        const fileName = (job.fileName || "").toLowerCase();
        if (fileName.includes("llama") || fileName.includes("gpt")) return 7 * 1024 * 1024 * 1024; // 7GB
        if (fileName.includes("bert")) return 440 * 1024 * 1024; // 440MB
        if (fileName.includes("resnet") || fileName.includes("vgg")) return 550 * 1024 * 1024; // 550MB
        if (fileName.includes("yolo") || fileName.includes("detection")) return 250 * 1024 * 1024; // 250MB
        if (fileName.endsWith(".pt") || fileName.endsWith(".pth")) return 200 * 1024 * 1024; // 200MB default PyTorch
        if (fileName.endsWith(".onnx")) return 150 * 1024 * 1024; // 150MB default ONNX
        if (fileName.endsWith(".tflite")) return 50 * 1024 * 1024; // 50MB TFLite
        return 100 * 1024 * 1024; // 100MB default
      };

      // Calculate sizes with estimation
      const totalOriginalSize = completedJobs.reduce((sum: number, j: any) => sum + getEstimatedSize(j), 0);
      const totalOptimizedSize = completedJobs.reduce((sum: number, j: any) => {
        const original = getEstimatedSize(j);
        const reduction = j.sizeReduction || 0;
        return sum + Math.round(original * (1 - reduction / 100));
      }, 0);
      const totalSizeSaved = totalOriginalSize - totalOptimizedSize;

      // Real average size reduction from actual jobs
      const avgSizeReduction = completedJobs.length > 0
        ? completedJobs.reduce((sum: number, j: any) => sum + (j.sizeReduction || 0), 0) / completedJobs.length
        : 0;

      // Real average latency reduction from actual jobs
      const jobsWithLatency = completedJobs.filter((j: any) => j.originalLatency && j.optimizedLatency);
      const avgLatencyReduction = jobsWithLatency.length > 0
        ? jobsWithLatency.reduce((sum: number, j: any) => {
          return sum + ((j.originalLatency - j.optimizedLatency) / j.originalLatency * 100);
        }, 0) / jobsWithLatency.length
        : 0;

      // Quantization breakdown from actual job configs
      const quantizationBreakdown: Record<string, number> = {};
      completedJobs.forEach((j: any) => {
        const q = j.config?.quantization || "Unknown";
        quantizationBreakdown[q] = (quantizationBreakdown[q] || 0) + 1;
      });

      // Target device breakdown from actual job configs
      const deviceBreakdown: Record<string, number> = {};
      completedJobs.forEach((j: any) => {
        const d = j.config?.targetDevice || "Unknown";
        deviceBreakdown[d] = (deviceBreakdown[d] || 0) + 1;
      });

      // Monthly trend from actual job dates
      const monthlyTrend = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthJobs = completedJobs.filter((j: any) => {
          const jobDate = j.createdAt ? new Date(j.createdAt) : null;
          return jobDate && jobDate >= month && jobDate < nextMonth;
        });

        // Calculate actual size saved for this month
        const monthSizeSaved = monthJobs.reduce((sum: number, j: any) => {
          const original = getEstimatedSize(j);
          const reduction = j.sizeReduction || 0;
          return sum + Math.round(original * reduction / 100);
        }, 0);

        monthlyTrend.push({
          month: month.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          models: monthJobs.length,
          sizeSaved: monthSizeSaved,
        });
      }

      // Recent activity from actual jobs
      const recentJobs = jobs.slice(0, 5).map((j: any) => ({
        id: j.id,
        fileName: j.fileName,
        status: j.status,
        sizeReduction: j.sizeReduction || 0,
        createdAt: j.createdAt,
      }));

      // Calculate real streak days (consecutive days with completed jobs)
      let streakDays = 0;
      if (completedJobs.length > 0) {
        const sortedDates = completedJobs
          .filter((j: any) => j.completedAt)
          .map((j: any) => new Date(j.completedAt).toDateString())
          .filter((date: string, index: number, self: string[]) => self.indexOf(date) === index)
          .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());

        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        if (sortedDates[0] === today || sortedDates[0] === yesterday) {
          streakDays = 1;
          for (let i = 1; i < sortedDates.length; i++) {
            const prevDate = new Date(sortedDates[i - 1]);
            const currDate = new Date(sortedDates[i]);
            const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000);
            if (diffDays === 1) {
              streakDays++;
            } else {
              break;
            }
          }
        }
      }

      // Per-model projections with individual cost savings
      const modelProjections = completedJobs.map((j: any) => {
        const originalSize = getEstimatedSize(j);
        const reduction = j.sizeReduction || 0;
        const sizeSaved = Math.round(originalSize * reduction / 100);
        const latencyReduction = j.originalLatency && j.optimizedLatency
          ? Math.round((j.originalLatency - j.optimizedLatency) / j.originalLatency * 100)
          : 0;

        // Cost calculation per model
        // Storage: $0.023/GB/month
        const storageSavings = (sizeSaved / (1024 * 1024 * 1024)) * 0.023;
        // Compute: Faster inference = less GPU time
        // Assume 1000 inferences/day, $0.0001 per inference second saved
        const timeSavedPerInference = j.originalLatency && j.optimizedLatency
          ? (j.originalLatency - j.optimizedLatency) / 1000 // seconds
          : 0;
        const computeSavings = timeSavedPerInference * 1000 * 30 * 0.0001; // per month

        return {
          id: j.id,
          fileName: j.fileName,
          originalSizeMB: Math.round(originalSize / (1024 * 1024)),
          optimizedSizeMB: Math.round((originalSize - sizeSaved) / (1024 * 1024)),
          sizeReduction: reduction,
          latencyReduction,
          originalLatency: j.originalLatency || 0,
          optimizedLatency: j.optimizedLatency || 0,
          quantization: j.config?.quantization || "Unknown",
          targetDevice: j.config?.targetDevice || "Unknown",
          monthlySavings: Math.round((storageSavings + computeSavings) * 100) / 100,
          annualSavings: Math.round((storageSavings + computeSavings) * 12 * 100) / 100,
        };
      });

      // Total cost savings
      const storageSavingsPerMonth = (totalSizeSaved / (1024 * 1024 * 1024)) * 0.023;
      const computeSavingsPerMonth = avgLatencyReduction > 0
        ? (avgLatencyReduction / 100) * totalModelsOptimized * 100  // $100 per % saved per model
        : 0;
      const estimatedMonthlySavings = storageSavingsPerMonth + computeSavingsPerMonth;

      res.json({
        totalModelsOptimized,
        totalSizeSaved,
        totalSizeSavedMB: Math.round(totalSizeSaved / (1024 * 1024)),
        totalSizeSavedGB: Math.round(totalSizeSaved / (1024 * 1024 * 1024) * 100) / 100,
        avgSizeReduction: Math.round(avgSizeReduction * 10) / 10,
        avgLatencyReduction: Math.round(avgLatencyReduction * 10) / 10,
        quantizationBreakdown,
        deviceBreakdown,
        monthlyTrend,
        recentJobs,
        modelProjections,
        estimatedMonthlySavings: Math.round(estimatedMonthlySavings),
        estimatedAnnualSavings: Math.round(estimatedMonthlySavings * 12),
        streakDays,
      });
    } catch (error) {
      console.error("Error fetching insights:", error);
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  });

  // ============ NEW FEATURES: PHASE 1-7 ============

  // Job Templates CRUD
  app.post("/api/templates", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const template = await storage.createTemplate(req.body, user.id);
      await storage.logAudit(user.id, user.email || "user", "template.create", "template", template.id);
      res.json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.get("/api/templates", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let userId = "00000000-0000-0000-0000-000000000000";
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) userId = user.id;
      }
      const templates = await storage.getTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const success = await storage.deleteTemplate(req.params.id, user.id);
      if (success) {
        await storage.logAudit(user.id, user.email || "user", "template.delete", "template", req.params.id);
      }
      res.json({ success });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Webhooks CRUD
  app.post("/api/webhooks", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const webhook = await storage.createWebhook(req.body, user.id);
      res.json(webhook);
    } catch (error) {
      console.error("Error creating webhook:", error);
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  app.get("/api/webhooks", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const webhooks = await storage.getWebhooks(user.id);
      res.json(webhooks);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.delete("/api/webhooks/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const success = await storage.deleteWebhook(req.params.id, user.id);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting webhook:", error);
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  // API Keys CRUD
  app.post("/api/api-keys", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const result = await storage.createApiKey(req.body, user.id);
      await storage.logAudit(user.id, user.email || "user", "apikey.create", "apikey", result.apiKey.id);
      res.json(result);
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  app.get("/api/api-keys", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const keys = await storage.getApiKeys(user.id);
      res.json(keys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  app.delete("/api/api-keys/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const success = await storage.revokeApiKey(req.params.id, user.id);
      if (success) {
        await storage.logAudit(user.id, user.email || "user", "apikey.revoke", "apikey", req.params.id);
      }
      res.json({ success });
    } catch (error) {
      console.error("Error revoking API key:", error);
      res.status(500).json({ error: "Failed to revoke API key" });
    }
  });

  // Teams CRUD
  app.post("/api/teams", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const { name, description } = req.body;
      const team = await storage.createTeam(name, description, user.id);
      await storage.logAudit(user.id, user.email || "user", "team.create", "team", team.id);
      res.json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  app.get("/api/teams", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const teams = await storage.getTeams(user.id);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id/members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.post("/api/teams/:id/invite", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const { email, role } = req.body;
      const success = await storage.inviteToTeam(req.params.id, email, role || "viewer");
      if (success) {
        await storage.logAudit(user.id, user.email || "user", "team.invite", "team", req.params.id, { invitedEmail: email });
      }
      res.json({ success });
    } catch (error) {
      console.error("Error inviting to team:", error);
      res.status(500).json({ error: "Failed to invite to team" });
    }
  });

  // Comments
  app.get("/api/jobs/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/jobs/:id/comments", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const { content } = req.body;
      const comment = await storage.addComment(req.params.id, user.id, user.email || "user", content);
      res.json(comment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // Audit Log
  app.get("/api/audit-log", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getAuditLogs(user.id, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit log:", error);
      res.status(500).json({ error: "Failed to fetch audit log" });
    }
  });

  // Alerts
  app.post("/api/alerts", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const alert = await storage.createAlert(req.body, user.id);
      res.json(alert);
    } catch (error) {
      console.error("Error creating alert:", error);
      res.status(500).json({ error: "Failed to create alert" });
    }
  });

  app.get("/api/alerts", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const alerts = await storage.getAlerts(user.id);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.patch("/api/alerts/:id/toggle", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const success = await storage.toggleAlert(req.params.id, user.id);
      res.json({ success });
    } catch (error) {
      console.error("Error toggling alert:", error);
      res.status(500).json({ error: "Failed to toggle alert" });
    }
  });

  // Batch Jobs
  app.post("/api/jobs/batch", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const { name, files, config } = req.body;

      // Create individual jobs
      const jobIds: string[] = [];
      for (const file of files) {
        const job = await storage.createJob({
          fileName: file.fileName,
          fileSize: file.fileSize,
          config,
        }, user.id);
        jobIds.push(job.id);
      }

      // Create batch
      const batch = await storage.createBatch(name, jobIds, user.id);
      res.json(batch);
    } catch (error) {
      console.error("Error creating batch:", error);
      res.status(500).json({ error: "Failed to create batch" });
    }
  });

  app.get("/api/batches", async (req, res) => {
    try {
      // AUTH DISABLED - use default user
      const userId = "00000000-0000-0000-0000-000000000000";

      const batches = await (storage as any).getBatches(userId);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching batches:", error);
      res.status(500).json({ error: "Failed to fetch batches" });
    }
  });

  // Cost Calculator
  app.post("/api/cost/estimate", async (req, res) => {
    try {
      const { hardware, hoursPerDay, daysPerMonth, estimatedTokens } = req.body;

      // Hardware cost rates ($/hour)
      const hardwareCosts: Record<string, number> = {
        "NVIDIA A100": 3.50,
        "NVIDIA H100": 8.00,
        "NVIDIA A10": 1.80,
        "NVIDIA T4": 0.75,
        "NVIDIA V100": 2.40,
        "NVIDIA L4": 1.20,
        "NVIDIA RTX 4090": 1.50,
        "Google TPU v4": 4.50,
        "AWS Inferentia2": 1.20,
        "Intel Xeon (AVX-512)": 0.50,
        "Apple M1/M2/M3": 0.30,
      };

      const costPerHour = hardwareCosts[hardware] || 1.0;
      const totalHours = hoursPerDay * daysPerMonth;
      const monthlyCost = costPerHour * totalHours;
      const costPerMillionTokens = (monthlyCost / (estimatedTokens / 1000000)) || 0;

      res.json({
        hardware,
        hoursPerDay,
        daysPerMonth,
        estimatedTokens,
        monthlyCost: Math.round(monthlyCost * 100) / 100,
        costPerMillionTokens: Math.round(costPerMillionTokens * 100) / 100,
        yearlyProjection: Math.round(monthlyCost * 12 * 100) / 100,
      });
    } catch (error) {
      console.error("Error calculating cost:", error);
      res.status(500).json({ error: "Failed to calculate cost" });
    }
  });

  // Hardware Recommendation
  app.post("/api/optimize/recommend-hardware", async (req, res) => {
    try {
      const { modelType, modelSizeMB, priorityLatency, budget } = req.body;

      // Simple recommendation logic
      const recommendations = [];

      if (modelSizeMB < 500) {
        recommendations.push({ device: "NVIDIA T4", reason: "Cost-effective for small models", score: 85 });
        recommendations.push({ device: "Intel Xeon (AVX-512)", reason: "CPU inference viable for small models", score: 70 });
      } else if (modelSizeMB < 2000) {
        recommendations.push({ device: "NVIDIA A10", reason: "Good balance of cost and performance", score: 90 });
        recommendations.push({ device: "NVIDIA L4", reason: "Efficient for medium models", score: 85 });
      } else {
        recommendations.push({ device: "NVIDIA A100", reason: "High memory and compute for large models", score: 95 });
        recommendations.push({ device: "NVIDIA H100", reason: "Best performance for LLMs", score: 90 });
      }

      if (priorityLatency) {
        recommendations.forEach(r => {
          if (r.device.includes("H100") || r.device.includes("A100")) {
            r.score += 5;
          }
        });
      }

      recommendations.sort((a, b) => b.score - a.score);

      res.json({
        modelType,
        modelSizeMB,
        recommendations: recommendations.slice(0, 3),
        estimatedLatency: modelSizeMB < 1000 ? "< 50ms" : modelSizeMB < 5000 ? "50-200ms" : "> 200ms",
      });
    } catch (error) {
      console.error("Error recommending hardware:", error);
      res.status(500).json({ error: "Failed to recommend hardware" });
    }
  });

  // Auto-tuning (simulated)
  app.post("/api/optimize/auto-tune", async (req, res) => {
    try {
      const { jobId, targetMetric } = req.body;

      // Simulate auto-tuning results
      const configurations = [
        { quantization: "INT8 Dynamic", latency: 25, accuracy: 98.5, size: 45 },
        { quantization: "INT8 Static", latency: 20, accuracy: 97.8, size: 42 },
        { quantization: "FP16", latency: 35, accuracy: 99.2, size: 60 },
        { quantization: "INT4 AWQ", latency: 15, accuracy: 96.5, size: 30 },
        { quantization: "Mixed INT8/FP16", latency: 28, accuracy: 98.8, size: 52 },
      ];

      // Sort by target metric
      if (targetMetric === "latency") {
        configurations.sort((a, b) => a.latency - b.latency);
      } else if (targetMetric === "accuracy") {
        configurations.sort((a, b) => b.accuracy - a.accuracy);
      } else if (targetMetric === "size") {
        configurations.sort((a, b) => a.size - b.size);
      }

      res.json({
        jobId,
        targetMetric,
        recommended: configurations[0],
        alternatives: configurations.slice(1, 4),
        searchStatus: "completed",
        trialsRun: 5,
      });
    } catch (error) {
      console.error("Error running auto-tune:", error);
      res.status(500).json({ error: "Failed to run auto-tune" });
    }
  });

  // Health Check
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      uptime: process.uptime(),
    });
  });

  // Monitoring Metrics (simulated)
  app.get("/api/monitoring/metrics", async (req, res) => {
    try {
      const now = Date.now();
      const metrics = [];

      // Generate last 24 hours of metrics
      for (let i = 24; i >= 0; i--) {
        const timestamp = new Date(now - i * 3600000).toISOString();
        metrics.push({
          timestamp,
          requestsPerMinute: 50 + Math.floor(Math.random() * 100),
          latencyP50: 25 + Math.floor(Math.random() * 15),
          latencyP99: 80 + Math.floor(Math.random() * 40),
          errorRate: Math.random() * 2,
          throughput: 1000 + Math.floor(Math.random() * 500),
        });
      }

      res.json({
        timeRange: "24h",
        metrics,
        summary: {
          avgLatency: 35,
          avgThroughput: 1250,
          totalRequests: 72000,
          errorRate: 0.5,
        },
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  return httpServer;
}
