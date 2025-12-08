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

    // Fetch current user session
    const {
        data: user,
        error,
        isLoading,
    } = useQuery<User | null, Error>({
        queryKey: ["auth", "user"],
        queryFn: async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session) return null;

            // Try to get display name from public.users table
            const { data: userProfile } = await supabase
                .from("users")
                .select("username")
                .eq("id", session.user.id)
                .single();

            return {
                id: session.user.id,
                username: userProfile?.username || session.user.email || "",
                email: session.user.email || "",
                password: "",
            };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
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
            const { data, error } = await supabase.auth.signInWithPassword({
                email: credentials.username,
                password: credentials.password,
            });

            if (error) throw error;
            if (!data.user) throw new Error("Login failed");

            return {
                id: data.user.id,
                username: data.user.email || credentials.username,
                password: "",
            };
        },
        onSuccess: (user: User) => {
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
            const { data, error } = await supabase.auth.signUp({
                email: credentials.username,
                password: credentials.password,
                options: {
                    data: {
                        username: credentials.username,
                    },
                },
            });

            if (error) throw error;
            if (!data.user) throw new Error("Registration failed");

            return {
                id: data.user.id,
                username: data.user.email || credentials.username,
                password: "",
            };
        },
        onSuccess: (user: User) => {
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
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
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
