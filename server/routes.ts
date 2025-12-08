import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { createJobSchema, inferenceRequestSchema } from "@shared/schema";
import { z } from "zod";
import { supabase } from "./supabase";
import { addJobConnection, removeJobConnection } from "./broadcast";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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

      // Get user ID from Supabase token
      const authHeader = req.headers.authorization;
      let userId = "00000000-0000-0000-0000-000000000000";

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          userId = user.id;

          // Ensure user exists in public.users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

          if (!existingUser) {
            // Create user profile if it doesn't exist
            await supabase
              .from('users')
              .insert({
                id: userId,
                username: user.email || 'user',
                email: user.email,
              });
          }
        }
      }

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

  // Update user profile
  app.patch("/api/user/profile", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (!user || authError) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      const { displayName } = req.body;

      if (!displayName || typeof displayName !== "string") {
        res.status(400).json({ error: "Display name is required" });
        return;
      }

      // Update username in public.users table
      const { error: updateError } = await supabase
        .from("users")
        .update({ username: displayName.trim() })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating user profile:", updateError);
        res.status(500).json({ error: "Failed to update profile" });
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

  return httpServer;
}
