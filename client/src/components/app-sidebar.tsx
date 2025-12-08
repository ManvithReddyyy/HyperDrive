import { Link, useLocation } from "wouter";
import { Plus, History, FlaskConical, Rocket, BarChart3, Database, Zap, Scale, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "New Optimization",
    url: "/upload",
    icon: Plus,
  },
  {
    title: "Job History",
    url: "/jobs",
    icon: History,
  },
  {
    title: "Model Registry",
    url: "/registry",
    icon: Database,
  },
  {
    title: "Compare",
    url: "/compare",
    icon: Scale,
  },
  {
    title: "Insights",
    url: "/insights",
    icon: Sparkles,
  },
  {
    title: "Playground",
    url: "/playground",
    icon: FlaskConical,
  },
  {
    title: "Analysis",
    url: "/analysis",
    icon: BarChart3,
  },
  {
    title: "Deployment",
    url: "/deploy",
    icon: Rocket,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground hover:[&>svg]:rotate-180">
              <Zap className="h-5 w-5 text-background transition-transform duration-300" />
            </div>
            <span className="text-sm font-medium text-foreground">HyperDrive</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url ||
                  (item.url === "/jobs" && location.startsWith("/jobs/"));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-3">
        <p className="text-xs text-muted-foreground">
          AI Model Optimization
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}

