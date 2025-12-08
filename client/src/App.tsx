import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import UploadPage from "@/pages/upload";
import JobsPage from "@/pages/jobs";
import JobDetailPage from "@/pages/job-detail";
import PlaygroundPage from "@/pages/playground";
import AnalysisPage from "@/pages/analysis";
import DeployPage from "@/pages/deploy";
import SettingsPage from "@/pages/settings";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import RegistryPage from "@/pages/registry";
import ComparePage from "@/pages/compare";
import InsightsPage from "@/pages/insights";
import { Loader2 } from "lucide-react";

function getBreadcrumbs(path: string): { label: string }[] {
  if (path === "/" || path === "") return [];
  if (path === "/upload") return [{ label: "New Optimization" }];
  if (path === "/jobs") return [{ label: "Jobs" }];
  if (path.startsWith("/jobs/")) {
    const id = path.split("/")[2];
    return [{ label: "Jobs" }, { label: `#${id?.slice(0, 8) || ""}` }];
  }
  if (path === "/playground") return [{ label: "Playground" }];
  if (path === "/deploy") return [{ label: "Deployment" }];
  if (path === "/compare") return [{ label: "Compare" }];
  if (path === "/insights") return [{ label: "Insights" }];
  return [];
}

function ProtectedRouter() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/jobs/:id" component={JobDetailPage} />
      <Route path="/registry" component={RegistryPage} />
      <Route path="/playground" component={PlaygroundPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/analysis" component={AnalysisPage} />
      <Route path="/deploy" component={DeployPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/insights" component={InsightsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainLayout() {
  const [location, setLocation] = useLocation();
  const breadcrumbs = getBreadcrumbs(location);

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-3">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <BreadcrumbNav items={breadcrumbs} />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/settings")}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden bg-background">
          <ProtectedRouter />
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Auth pages - no sidebar
  if (location === "/login" || location === "/signup") {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
      </Switch>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <LoginPage />;
  }

  // Logged in - show main layout with sidebar
  return (
    <SidebarProvider style={{ "--sidebar-width": "15rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}>
      <MainLayout />
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
