import { createContext, ReactNode, useContext } from "react";
import {
    useQuery,
    useMutation,
    useQueryClient,
    UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    error: Error | null;
    loginMutation: UseMutationResult<{ user: User; session: { access_token: string } }, Error, LoginData>;
    logoutMutation: UseMutationResult<void, Error, void>;
    registerMutation: UseMutationResult<{ user: User; session: { access_token: string } }, Error, InsertUser>;
    signInWithOAuth: (provider: "google" | "github" | "twitter") => Promise<void>;
    signInWithMagicLink: (email: string) => Promise<void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

const TOKEN_KEY = "hd_auth_token";

function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

async function apiCall(method: string, url: string, body?: unknown): Promise<Response> {
    const token = getToken();
    const headers: Record<string, string> = body ? { "Content-Type": "application/json" } : {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
    });

    if (!res.ok) {
        let message: string;
        try {
            const json = await res.json();
            message = json.error || json.message || res.statusText;
        } catch {
            message = (await res.text()) || res.statusText;
        }
        throw new Error(message);
    }
    return res;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const {
        data: user,
        error,
        isLoading,
    } = useQuery<User | null, Error>({
        queryKey: ["auth", "user"],
        queryFn: async () => {
            const token = getToken();
            if (!token) return null;
            try {
                const res = await fetch("/api/user", {
                    headers: { "Authorization": `Bearer ${token}` },
                });
                if (res.status === 401) { clearToken(); return null; }
                if (!res.ok) return null;
                return await res.json();
            } catch {
                return null;
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const loginMutation = useMutation({
        mutationFn: async (credentials: LoginData) => {
            const res = await apiCall("POST", "/api/login", credentials);
            return await res.json();
        },
        onSuccess: (data) => {
            setToken(data.session.access_token);
            queryClient.setQueryData(["auth", "user"], data.user);
            toast({ title: "Welcome back!", description: `Logged in as ${data.user.username}` });
        },
        onError: (error: Error) => {
            toast({ title: "Login failed", description: error.message, variant: "destructive" });
        },
    });

    const registerMutation = useMutation({
        mutationFn: async (credentials: InsertUser) => {
            const res = await apiCall("POST", "/api/register", credentials);
            return await res.json();
        },
        onSuccess: (data) => {
            setToken(data.session.access_token);
            queryClient.setQueryData(["auth", "user"], data.user);
            toast({ title: "Account created!", description: `Welcome, ${data.user.fullName || data.user.username}!` });
        },
        onError: (error: Error) => {
            toast({ title: "Registration failed", description: error.message, variant: "destructive" });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            const token = getToken();
            if (token) {
                try {
                    await fetch("/api/logout", {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}` },
                    });
                } catch { /* ignore */ }
            }
            clearToken();
        },
        onSuccess: () => {
            queryClient.setQueryData(["auth", "user"], null);
            toast({ title: "Logged out", description: "You have been logged out successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Logout failed", description: error.message, variant: "destructive" });
        },
    });

    const signInWithOAuth = async (_provider: "google" | "github" | "twitter") => {
        toast({ title: "OAuth not available", description: "Please use email and password login.", variant: "destructive" });
    };

    const signInWithMagicLink = async (_email: string) => {
        toast({ title: "Magic link not available", description: "Please use email and password login.", variant: "destructive" });
    };

    return (
        <AuthContext.Provider
            value={{
                user: user ?? null,
                isLoading,
                error,
                loginMutation,
                logoutMutation,
                registerMutation,
                signInWithOAuth,
                signInWithMagicLink,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
