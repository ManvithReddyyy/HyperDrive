import { Scale } from "lucide-react";
import { ModelComparison } from "@/components/business/ModelComparison";

export default function ComparePage() {
    return (
        <div className="h-full overflow-auto">
            <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    <h1 className="text-sm font-medium text-foreground">Model Comparison</h1>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Compare two optimized models side by side
                </p>
            </div>

            <div className="p-6 max-w-5xl mx-auto">
                <ModelComparison />
            </div>
        </div>
    );
}
