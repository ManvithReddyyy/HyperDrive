import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Zap, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { VideoBackground } from "@/components/landing/video-background";

export default function LoginPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username: email, password });
  };

  return (
    <div className="landing-theme min-h-screen w-full flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Background Video */}
      <VideoBackground
        src="https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8"
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 mix-blend-screen"
      />

      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0" />



      <div className="w-full max-w-sm relative z-10 transition-all duration-500">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-black font-bold text-lg mb-3 liquid-glass-strong">
            <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-heading italic text-white">Welcome back</h1>
          <p className="text-sm text-white/70 font-body mt-1">Sign in to HyperDrive</p>
        </div>

        <Card className="p-6 liquid-glass bg-transparent rounded-2xl border-none">
          {loginMutation.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{loginMutation.error.message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80 font-body">Username or Email</label>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your username or email"
                disabled={loginMutation.isPending}
                className="bg-black/20 border-white/20 text-white placeholder:text-white/40"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80 font-body">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loginMutation.isPending}
                  className="pr-10 bg-black/20 border-white/20 text-white placeholder:text-white/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="outline" className="w-full mt-2 liquid-glass-strong border-white/20 text-white hover:bg-white/10 hover:text-white" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Card>

        <div className="flex justify-center mt-6">
          <p className="text-center text-sm font-body text-white liquid-glass rounded-full py-2 px-4">
            Don't have an account?{" "}
            <Link href="/signup" className="text-white hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
