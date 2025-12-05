import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import UploadPage from "@/pages/upload";
import JobsPage from "@/pages/jobs";
import JobDetailPage from "@/pages/job-detail";
import PlaygroundPage from "@/pages/playground";
import DeployPage from "@/pages/deploy";

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
  return [];
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/jobs/:id" component={JobDetailPage} />
      <Route path="/playground" component={PlaygroundPage} />
      <Route path="/deploy" component={DeployPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
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
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-hidden bg-background">
          <Router />
        </main>
      </div>
    </div>
  );
}

function App() {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <AppContent />
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
