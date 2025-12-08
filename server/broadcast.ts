import { WebSocket } from "ws";
import type { Job } from "@shared/schema";

// Store WebSocket connections per job
const jobConnections = new Map<string, Set<WebSocket>>();

// Get connections for a job
export function getJobConnections(jobId: string): Set<WebSocket> | undefined {
    return jobConnections.get(jobId);
}

// Add a connection for a job
export function addJobConnection(jobId: string, ws: WebSocket) {
    if (!jobConnections.has(jobId)) {
        jobConnections.set(jobId, new Set());
    }
    jobConnections.get(jobId)!.add(ws);
}

// Remove a connection for a job
export function removeJobConnection(jobId: string, ws: WebSocket) {
    jobConnections.get(jobId)?.delete(ws);
    if (jobConnections.get(jobId)?.size === 0) {
        jobConnections.delete(jobId);
    }
}

// Broadcast job updates to all connected clients for a job
export function broadcastJobUpdate(job: Job) {
    const connections = jobConnections.get(job.id);
    if (connections) {
        const message = JSON.stringify({ type: "job_update", job });
        console.log(`Broadcasting update for job ${job.id} to ${connections.size} clients`);
        connections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        });
    }
}
