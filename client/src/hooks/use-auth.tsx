import { createContext, ReactNode, useContext, useEffect } from "react";
import {
    useQuery,
    useMutation,
    useQueryClient,
    UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { AuthError } from "@supabase/supabase-js";

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    error: Error | null;
    loginMutation: UseMutationResult<User, Error, LoginData>;
    logoutMutation: UseMutationResult<void, Error, void>;
    registerMutation: UseMutationResult<User, Error, InsertUser>;
    signInWithOAuth: (provider: "google" | "github" | "twitter") => Promise<void>;
    signInWithMagicLink: (email: string) => Promise<void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Mock user session so Supabase doesn't try to fetch and crash the app
    const {
        data: user,
        error,
        isLoading,
    } = useQuery<User | null, Error>({
        queryKey: ["auth", "user"],
        queryFn: async () => {
            const storedUser = localStorage.getItem("auth_user");
            if (storedUser) {
                return JSON.parse(storedUser);
            }
            return null;
        },
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    // Listen for auth state changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                // Just invalidate the query to refetch with updated data
                queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
            }
        );

        return () => subscription.unsubscribe();
    }, [queryClient]);

    const loginMutation = useMutation({
        mutationFn: async (credentials: LoginData) => {
            // Mock offline login
            return {
                id: "local_user_1",
                username: credentials.username,
                password: "",
            } as User;
        },
        onSuccess: (user: User) => {
            localStorage.setItem("auth_user", JSON.stringify(user));
            queryClient.setQueryData(["auth", "user"], user);
            toast({
                title: "Welcome back!",
                description: `Logged in as ${user.username}`,
            });
        },
        onError: (error: AuthError) => {
            toast({
                title: "Login failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const registerMutation = useMutation({
        mutationFn: async (credentials: InsertUser) => {
            // Mock offline registration
            return {
                id: "local_user_1",
                username: credentials.username,
                password: "",
            } as User;
        },
        onSuccess: (user: User) => {
            localStorage.setItem("auth_user", JSON.stringify(user));
            queryClient.setQueryData(["auth", "user"], user);
            toast({
                title: "Account created!",
                description: `Welcome, ${user.username}`,
            });
        },
        onError: (error: AuthError) => {
            toast({
                title: "Registration failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            // Mock offline logout
            localStorage.removeItem("auth_user");
        },
        onSuccess: () => {
            queryClient.setQueryData(["auth", "user"], null);
            toast({
                title: "Logged out",
                description: "You have been logged out successfully",
            });
        },
        onError: (error: AuthError) => {
            toast({
                title: "Logout failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const signInWithOAuth = async (provider: "google" | "github" | "twitter") => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/`,
            },
        });

        if (error) {
            toast({
                title: "OAuth failed",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const signInWithMagicLink = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/`,
            },
        });

        if (error) {
            toast({
                title: "Failed to send magic link",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Check your email!",
                description: `We sent a magic link to ${email}`,
            });
        }
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
