import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, Sparkles, Zap, Target, Scale } from "lucide-react";

interface AutoTuneResult {
    recommended: {
        quantization: string;
        latency: number;
        accuracy: number;
        size: number;
    };
    alternatives: Array<{
        quantization: string;
        latency: number;
        accuracy: number;
        size: number;
    }>;
    trialsRun: number;
}

interface AutoTunerProps {
    jobId?: string;
}

export function AutoTuner({ jobId }: AutoTunerProps) {
    const [targetMetric, setTargetMetric] = useState<string>("latency");
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<AutoTuneResult | null>(null);

    const runAutoTune = async () => {
        setIsRunning(true);
        try {
            const response = await fetch("/api/optimize/auto-tune", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId, targetMetric }),
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error("Error running auto-tune:", error);
        }
        setIsRunning(false);
    };

    const MetricIcon = ({ metric }: { metric: string }) => {
        switch (metric) {
            case "latency":
                return <Zap className="h-4 w-4 text-yellow-500" />;
            case "accuracy":
                return <Target className="h-4 w-4 text-green-500" />;
            case "size":
                return <Scale className="h-4 w-4 text-blue-500" />;
            default:
                return <Sparkles className="h-4 w-4 text-purple-500" />;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    Auto-Tuner
                </CardTitle>
                <CardDescription>
                    Automatically find the optimal quantization settings
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Optimize For</Label>
                        <Select value={targetMetric} onValueChange={setTargetMetric}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select target metric" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="latency">
                                    <span className="flex items-center gap-2">
                                        <Zap className="h-4 w-4" /> Lowest Latency
                                    </span>
                                </SelectItem>
                                <SelectItem value="accuracy">
                                    <span className="flex items-center gap-2">
                                        <Target className="h-4 w-4" /> Highest Accuracy
                                    </span>
                                </SelectItem>
                                <SelectItem value="size">
                                    <span className="flex items-center gap-2">
                                        <Scale className="h-4 w-4" /> Smallest Size
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button onClick={runAutoTune} disabled={isRunning} className="w-full gap-2">
                            {isRunning ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="h-4 w-4" />
                                    Run Auto-Tune
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {result && (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" />
                            <span className="font-semibold">Recommended Configuration</span>
                            <Badge variant="secondary">{result.trialsRun} trials run</Badge>
                        </div>

                        {/* Recommended card */}
                        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border-2 border-primary/30">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-lg">{result.recommended.quantization}</span>
                                <Badge className="bg-primary/20 text-primary border-primary/30">Best Match</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Latency</p>
                                    <p className="text-lg font-bold">{result.recommended.latency}ms</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Accuracy</p>
                                    <p className="text-lg font-bold">{result.recommended.accuracy}%</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Size</p>
                                    <p className="text-lg font-bold">{result.recommended.size}MB</p>
                                </div>
                            </div>
                        </div>

                        {/* Alternatives */}
                        {result.alternatives.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Alternatives:</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {result.alternatives.map((alt, idx) => (
                                        <div key={idx} className="rounded-lg border p-3 bg-card">
                                            <p className="font-medium text-sm">{alt.quantization}</p>
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>{alt.latency}ms</span>
                                                <span>{alt.accuracy}%</span>
                                                <span>{alt.size}MB</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
