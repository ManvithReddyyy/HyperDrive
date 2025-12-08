import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Zap, Check, Trophy, Rocket } from "lucide-react";

interface Trial {
    id: number;
    strategy: string;
    latency: string;
    latencyValue: number;
    accuracyLoss: string;
    accuracyLossValue: number;
    size: string;
    sizeValue: number;
    recommended: boolean;
}

interface AutopilotLeaderboardProps {
    jobId: string;
}

export function AutopilotLeaderboard({ jobId }: AutopilotLeaderboardProps) {
    const { data: trials, isLoading } = useQuery<Trial[]>({
        queryKey: ["/api/jobs", jobId, "autopilot"],
        queryFn: async () => {
            const res = await fetch(`/api/jobs/${jobId}/autopilot`);
            if (!res.ok) throw new Error("Failed to fetch autopilot data");
            return res.json();
        },
        enabled: !!jobId,
    });

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        );
    }

    if (!trials || trials.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No autopilot trials available</p>
            </div>
        );
    }

    // Sort by recommended first, then by latency
    const sortedTrials = [...trials].sort((a, b) => {
        if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
        return a.latencyValue - b.latencyValue;
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium">Neural Architecture Search Results</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {trials.length} optimization strategies tested
                    </p>
                </div>
                {sortedTrials[0]?.recommended && (
                    <Button size="sm" className="gap-2">
                        <Rocket className="h-3.5 w-3.5" />
                        Promote to Production
                    </Button>
                )}
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
                            <TableHead className="font-medium">Strategy</TableHead>
                            <TableHead className="font-medium">
                                <span className="flex items-center gap-1">
                                    <Zap className="h-3 w-3" /> Latency
                                </span>
                            </TableHead>
                            <TableHead className="font-medium">Accuracy</TableHead>
                            <TableHead className="font-medium">Size</TableHead>
                            <TableHead className="w-20"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTrials.map((trial) => (
                            <TableRow
                                key={trial.id}
                                className={`
                                    transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50
                                    ${trial.recommended ? "bg-green-50 dark:bg-green-950/20 border-l-2 border-l-green-500" : ""}
                                `}
                            >
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {trial.strategy}
                                        {trial.recommended && (
                                            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                                                Recommended
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className={trial.recommended ? "text-green-600 dark:text-green-400 font-semibold" : ""}>
                                        {trial.latency}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className={
                                        trial.accuracyLossValue < 0.5
                                            ? "text-green-600 dark:text-green-400"
                                            : trial.accuracyLossValue > 1
                                                ? "text-red-600 dark:text-red-400"
                                                : ""
                                    }>
                                        {trial.accuracyLoss}
                                    </span>
                                </TableCell>
                                <TableCell>{trial.size}</TableCell>
                                <TableCell>
                                    {trial.recommended && (
                                        <div className="flex justify-center">
                                            <Check className="h-4 w-4 text-green-500" />
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <p className="text-xs text-muted-foreground">
                The recommended strategy balances inference speed with minimal accuracy loss.
                Click "Promote to Production" to deploy this configuration.
            </p>
        </div>
    );
}
