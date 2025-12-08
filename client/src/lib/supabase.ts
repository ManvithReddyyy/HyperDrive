import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://gqvunhfuxlorrqrhhkpn.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxdnVuaGZ1eGxvcnJxcmhoa3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTg3OTQsImV4cCI6MjA4MDQ5NDc5NH0.5vlo_YOEE8-fcaEBeW6BUmlb4xwfhNgQkJJU1HV1b80";

// Client-side Supabase client for authentication
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});
