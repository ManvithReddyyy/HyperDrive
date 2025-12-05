import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { createJobSchema, inferenceRequestSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const jobConnections = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const jobId = url.searchParams.get("jobId");

    if (jobId) {
      if (!jobConnections.has(jobId)) {
        jobConnections.set(jobId, new Set());
      }
      jobConnections.get(jobId)!.add(ws);

      const unsubscribe = (storage as any).subscribeToJobUpdates(jobId, (job: any) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "job_update", job }));
        }
      });

      ws.on("close", () => {
        jobConnections.get(jobId)?.delete(ws);
        unsubscribe();
      });

      storage.getJob(jobId).then(job => {
        if (job && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "job_update", job }));
        }
      });
    }

    ws.on("error", console.error);
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const data = createJobSchema.parse(req.body);
      const job = await storage.createJob(data);
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

  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getAllJobs();
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

  return httpServer;
}
