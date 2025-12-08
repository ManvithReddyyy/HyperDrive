import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Zap, Eye, EyeOff, Github, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const { user, loginMutation, signInWithOAuth, signInWithMagicLink } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(true);

  if (user) {
    setLocation("/");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (useMagicLink) {
      signInWithMagicLink(email);
    } else {
      loginMutation.mutate({ username: email, password });
    }
  };

  const handleOAuth = async (provider: "google" | "github" | "twitter") => {
    await signInWithOAuth(provider);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videos/background.mp4" type="video/mp4" />
        <source src="/videos/background.webm" type="video/webm" />
      </video>

      {/* Overlay for better readability - lighter in light mode */}
      <div className="absolute inset-0 bg-background/30 dark:bg-background/60 backdrop-blur-sm z-0 transition-colors duration-500" />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-xl relative z-10 transition-all duration-500">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background font-bold text-lg mb-3">
            <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-medium text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to HyperDrive</p>
        </div>

        <Card className="p-6">
          {loginMutation.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{loginMutation.error.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
            {/* Left: Email form */}
            <form onSubmit={handleSubmit} className="flex flex-col">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                {useMagicLink ? "Sign in with email" : "Sign in with password"}
              </p>
              <div className="flex-1 flex flex-col justify-center space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={loginMutation.isPending}
                    required
                  />
                </div>

                {!useMagicLink && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        disabled={loginMutation.isPending}
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {useMagicLink ? "Sending..." : "Signing in..."}
                    </>
                  ) : (
                    <>
                      {useMagicLink && <Mail className="h-4 w-4 mr-2" />}
                      {useMagicLink ? "Send magic link" : "Sign in"}
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setUseMagicLink(!useMagicLink)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {useMagicLink ? "Use password instead" : "Use magic link instead"}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="flex flex-col items-center py-2">
              <div className="w-px flex-1 bg-border" />
              <span className="py-3 text-xs text-muted-foreground">or</span>
              <div className="w-px flex-1 bg-border" />
            </div>

            {/* Right: OAuth */}
            <div className="flex flex-col">
              <p className="text-xs font-medium text-muted-foreground mb-3">Continue with</p>
              <div className="flex-1 flex flex-col justify-center space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => handleOAuth("google")}
                  disabled={loginMutation.isPending}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => handleOAuth("github")}
                  disabled={loginMutation.isPending}
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => handleOAuth("twitter")}
                  disabled={loginMutation.isPending}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.514l-5.106-6.696-5.867 6.696h-3.31l7.73-8.835L2.56 2.25h6.66l4.872 6.434 5.361-6.434zM17.05 19.1h1.82L6.003 4.129H4.08l13.97 14.97z" />
                  </svg>
                  X
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-center mt-6">
          <p className="text-center text-sm text-foreground bg-background/80 dark:bg-background/60 backdrop-blur-sm py-2 px-4 rounded-lg">
            Don't have an account?{" "}
            <Link href="/signup" className="text-foreground hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
