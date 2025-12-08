import { Express, Request, Response } from "express";
import { supabase } from "./supabase";
import { insertUserSchema } from "@shared/schema";

// Middleware to verify Supabase session
export async function requireAuth(req: Request, res: Response, next: Function) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: "Invalid token" });
    }

    // Attach user to request
    (req as any).user = { id: user.id, email: user.email };
    next();
}

export function setupAuth(app: Express) {
    // Register endpoint (creates auth user)
    app.post("/api/register", async (req, res) => {
        try {
            const body = insertUserSchema.parse(req.body);

            // Create auth user in Supabase
            const { data, error } = await supabase.auth.signUp({
                email: body.username, // Using username as email for compatibility
                password: body.password,
                options: {
                    data: {
                        username: body.username,
                    },
                },
            });

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            if (!data.user) {
                return res.status(400).json({ error: "Failed to create user" });
            }

            // Return user data (profile is created automatically via trigger)
            res.json({
                id: data.user.id,
                username: body.username,
                password: "", // Never return password
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    });

    // Login endpoint (creates session)
    app.post("/api/login", async (req, res) => {
        try {
            const { username, password } = req.body;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: username,
                password: password,
            });

            if (error) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // Return session and user
            res.json({
                user: {
                    id: data.user.id,
                    username: username,
                    password: "",
                },
                session: data.session,
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
            await supabase.auth.signOut();
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

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        res.json({
            id: user.id,
            username: user.email,
            password: "",
        });
    });
}
