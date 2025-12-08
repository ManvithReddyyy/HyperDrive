import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Leaf, Zap, Scale, Database, FileCode, Cpu, Calendar, TrendingDown } from "lucide-react";

interface NutritionData {
    modelName: string;
    architecture: string;
    parameters: string;
    license: string;
    trainingData: string;
    co2Emitted: string;
    energyUsed: string;
    tokensProcessed: string;
    quantization: string;
    targetDevice: string;
    optimizationDate: string;
    originalLatency: string;
    optimizedLatency: string;
    sizeReduction: string;
}

interface NutritionLabelProps {
    jobId: string;
}

function NutritionRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-zinc-200 dark:border-zinc-700 last:border-b-0">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
            </span>
            <span className="text-sm font-medium text-right">{value}</span>
        </div>
    );
}

export function NutritionLabel({ jobId }: NutritionLabelProps) {
    const { data, isLoading } = useQuery<NutritionData>({
        queryKey: ["/api/models", jobId, "nutrition"],
        queryFn: async () => {
            const res = await fetch(`/api/models/${jobId}/nutrition`);
            if (!res.ok) throw new Error("Failed to fetch nutrition data");
            return res.json();
        },
        enabled: !!jobId,
    });

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nutrition data not available</p>
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <div className="bg-white dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-100 rounded-lg overflow-hidden max-w-sm">
            {/* Header */}
            <div className="bg-zinc-900 dark:bg-zinc-100 px-4 py-3">
                <h2 className="text-xl font-black text-white dark:text-zinc-900 tracking-tight">
                    AI FACTS
                </h2>
            </div>

            {/* Model Name */}
            <div className="px-4 pt-4 pb-2 border-b-4 border-zinc-900 dark:border-zinc-100">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Model</p>
                <p className="text-lg font-bold truncate">{data.modelName}</p>
            </div>

            {/* Main Stats */}
            <div className="px-4 py-3 border-b border-zinc-300 dark:border-zinc-600">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Parameters</p>
                        <p className="text-xl font-bold">{data.parameters}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Architecture</p>
                        <p className="text-xl font-bold">{data.architecture}</p>
                    </div>
                </div>
            </div>

            {/* Details Section */}
            <div className="px-4 py-2">
                <p className="text-xs font-bold uppercase tracking-wider mb-2 text-zinc-500">
                    Optimization Details
                </p>
                <NutritionRow label="Quantization" value={data.quantization} icon={Scale} />
                <NutritionRow label="Target Device" value={data.targetDevice} icon={Cpu} />
                <NutritionRow label="Original Latency" value={data.originalLatency} icon={Zap} />
                <NutritionRow label="Optimized Latency" value={data.optimizedLatency} icon={Zap} />
                <NutritionRow label="Size Reduction" value={data.sizeReduction} icon={TrendingDown} />
            </div>

            {/* Provenance Section */}
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50">
                <p className="text-xs font-bold uppercase tracking-wider mb-2 text-zinc-500">
                    Provenance & Compliance
                </p>
                <NutritionRow label="License" value={data.license} icon={FileCode} />
                <NutritionRow label="Training Data" value={data.trainingData} icon={Database} />
                <NutritionRow label="Tokens Processed" value={data.tokensProcessed} />
            </div>

            {/* Environmental Impact */}
            <div className="px-4 py-2 border-t border-zinc-300 dark:border-zinc-600">
                <p className="text-xs font-bold uppercase tracking-wider mb-2 text-zinc-500">
                    Environmental Impact
                </p>
                <div className="flex items-center gap-1 mb-2">
                    <Leaf className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Carbon Footprint</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-semibold">{data.co2Emitted}</p>
                        <p className="text-xs text-muted-foreground">CO₂ Emitted</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold">{data.energyUsed}</p>
                        <p className="text-xs text-muted-foreground">Energy Used</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-300 dark:border-zinc-600">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Optimized {formatDate(data.optimizationDate)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                        AI-BOM v1.0
                    </Badge>
                </div>
            </div>
        </div>
    );
}
