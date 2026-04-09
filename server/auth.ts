import { Express, Request, Response } from "express";
import { randomUUID, createHash, timingSafeEqual } from "crypto";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";

// Simple token store is now persistent via storage.json

function hashPassword(password: string): string {
    return createHash("sha256").update(password + "hyperdrive_salt_2024").digest("hex");
}

function generateToken(): string {
    return randomUUID() + "-" + randomUUID();
}

export async function getUserIdFromToken(token: string): Promise<string | undefined> {
    return storage.getSession(token);
}

// Middleware to verify local session
export async function requireAuth(req: Request, res: Response, next: Function) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const userId = await storage.getSession(token);

    if (!userId) {
        return res.status(401).json({ error: "Invalid or expired session" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
        await storage.deleteSession(token);
        return res.status(401).json({ error: "User not found" });
    }

    (req as any).user = { id: user.id, username: user.username };
    next();
}

export function setupAuth(app: Express) {
    // Register endpoint
    app.post("/api/register", async (req, res) => {
        try {
            const body = insertUserSchema.parse(req.body);

            // Check if user already exists
            const existing = await storage.getUserByUsername(body.username);
            if (existing) {
                return res.status(400).json({ error: "An account with this email already exists" });
            }

            const id = randomUUID();
            const hashedPassword = hashPassword(body.password);
            const normalizedUsername = body.username.trim().toLowerCase();

            const user = await storage.createUser({
                id,
                username: normalizedUsername,
                password: hashedPassword,
                fullName: body.fullName,
                organization: body.organization,
                role: body.role,
            });

            // Auto-login after registration
            const token = generateToken();
            await storage.createSession(token, user.id);

            res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    password: "",
                    fullName: (user as any).fullName,
                    organization: (user as any).organization,
                    role: (user as any).role,
                },
                session: { access_token: token },
            });
        } catch (error: any) {
            if (error.name === "ZodError") {
                return res.status(400).json({ error: error.errors[0]?.message || "Invalid input" });
            }
            res.status(400).json({ error: error.message });
        }
    });

    // Login endpoint
    app.post("/api/login", async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: "Email and password are required" });
            }

            const normalizedUsername = username.trim().toLowerCase();
            const user = await storage.getUserByUsername(normalizedUsername);

            if (!user) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            const hashedInput = hashPassword(password);
            const valid = user.password === hashedInput;

            if (!valid) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            const token = generateToken();
            await storage.createSession(token, user.id);

            res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    password: "",
                    fullName: (user as any).fullName,
                    organization: (user as any).organization,
                    role: (user as any).role,
                },
                session: { access_token: token },
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    });

    // Logout endpoint
    app.post("/api/logout", async (req, res) => {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            await storage.deleteSession(token);
        }
        res.json({ message: "Logged out successfully" });
    });

    // Get current user
    app.get("/api/user", async (req, res) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.substring(7);
        const userId = await storage.getSession(token);

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
            await storage.deleteSession(token);
            return res.status(401).json({ error: "User not found" });
        }

        res.json({
            id: user.id,
            username: user.username,
            password: "",
            fullName: (user as any).fullName,
            organization: (user as any).organization,
            role: (user as any).role,
        });
    });
}
