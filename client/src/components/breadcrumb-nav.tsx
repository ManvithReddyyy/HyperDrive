import { ChevronRight } from "lucide-react";

interface BreadcrumbNavProps {
  items: { label: string; href?: string }[];
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-1 text-sm" data-testid="breadcrumb-nav">
      <span className="font-medium text-foreground">HyperDrive</span>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span 
            className={index === items.length - 1 
              ? "text-foreground" 
              : "text-muted-foreground"
            }
          >
            {item.label}
          </span>
        </div>
      ))}
    </nav>
  );
}
