import { Sparkles } from "lucide-react";
import { InsightsDashboard } from "@/components/business/InsightsDashboard";

export default function InsightsPage() {
    return (
        <div className="h-full overflow-auto">
            <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    <h1 className="text-sm font-medium text-foreground">Optimization Insights</h1>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Aggregate statistics and ROI metrics across all optimizations
                </p>
            </div>

            <div className="p-6 max-w-6xl mx-auto">
                <InsightsDashboard />
            </div>
        </div>
    );
}
