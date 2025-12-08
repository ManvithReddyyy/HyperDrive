import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Zap, CheckCircle2, Eye, EyeOff, Github } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignupPage() {
  const { user, registerMutation, signInWithOAuth } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  if (user) {
    setLocation("/");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return;
    }

    console.log('Signup values:', { email, username, password: password.length });
    registerMutation.mutate({ username: email, password });
  };

  const handleOAuth = async (provider: "google" | "github" | "twitter") => {
    await signInWithOAuth(provider);
  };

  const error = localError || registerMutation.error?.message;
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

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
          <h1 className="text-lg font-medium text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Join HyperDrive</p>
        </div>

        <Card className="p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
            {/* Left: Email form */}
            <form onSubmit={handleSubmit} className="flex flex-col">
              <p className="text-xs font-medium text-muted-foreground mb-3">Sign up with email</p>
              <div className="flex-1 flex flex-col justify-center space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    disabled={registerMutation.isPending}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Username</label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    disabled={registerMutation.isPending}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      disabled={registerMutation.isPending}
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

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      disabled={registerMutation.isPending}
                      className="pr-16"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {passwordsMatch && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full mt-1" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
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
              <p className="text-xs font-medium text-muted-foreground mb-3">Sign up with</p>
              <div className="flex-1 flex flex-col justify-center space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => handleOAuth("google")}
                  disabled={registerMutation.isPending}
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
                  disabled={registerMutation.isPending}
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => handleOAuth("twitter")}
                  disabled={registerMutation.isPending}
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
            Already have an account?{" "}
            <Link href="/login" className="text-foreground hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
