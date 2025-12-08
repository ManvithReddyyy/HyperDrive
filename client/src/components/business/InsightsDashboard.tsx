import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    TrendingUp,
    Zap,
    HardDrive,
    Clock,
    DollarSign,
    Flame,
    PieChart,
    Activity,
    CheckCircle,
    XCircle,
    Loader2,
    FileBox
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

interface ModelProjection {
    id: string;
    fileName: string;
    originalSizeMB: number;
    optimizedSizeMB: number;
    sizeReduction: number;
    latencyReduction: number;
    originalLatency: number;
    optimizedLatency: number;
    quantization: string;
    targetDevice: string;
    monthlySavings: number;
    annualSavings: number;
}

interface InsightsData {
    totalModelsOptimized: number;
    totalSizeSaved: number;
    totalSizeSavedMB: number;
    totalSizeSavedGB: number;
    avgSizeReduction: number;
    avgLatencyReduction: number;
    quantizationBreakdown: Record<string, number>;
    deviceBreakdown: Record<string, number>;
    monthlyTrend: { month: string; models: number; sizeSaved: number }[];
    recentJobs: { id: string; fileName: string; status: string; sizeReduction: number; createdAt: string }[];
    modelProjections: ModelProjection[];
    estimatedMonthlySavings: number;
    estimatedAnnualSavings: number;
    streakDays: number;
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function StatCard({
    icon: Icon,
    label,
    value,
    subtext,
    trend,
    color = "text-foreground"
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtext?: string;
    trend?: "up" | "down";
    color?: string;
}) {
    return (
        <Card className="p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
                    {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
                </div>
                <div className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {trend && (
                <div className={`mt-3 flex items-center gap-1 text-xs ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    <TrendingUp className={`h-3 w-3 ${trend === "down" ? "rotate-180" : ""}`} />
                    <span>{trend === "up" ? "Improving" : "Declining"}</span>
                </div>
            )}
        </Card>
    );
}

export function InsightsDashboard() {
    const { data, isLoading } = useQuery<InsightsData>({
        queryKey: ["/api/insights"],
        queryFn: async () => {
            const res = await fetch("/api/insights");
            if (!res.ok) throw new Error("Failed to fetch insights");
            return res.json();
        },
        refetchInterval: 30000,
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Transform data for charts
    const quantizationData = Object.entries(data.quantizationBreakdown).map(([name, value]) => ({
        name,
        value,
    }));

    const deviceData = Object.entries(data.deviceBreakdown).map(([name, value]) => ({
        name: name.length > 15 ? name.slice(0, 12) + "..." : name,
        value,
    }));

    return (
        <div className="space-y-6">
            {/* Hero Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard
                    icon={FileBox}
                    label="Models Optimized"
                    value={data.totalModelsOptimized}
                    subtext="Total all-time"
                    color="text-blue-600"
                />
                <StatCard
                    icon={HardDrive}
                    label="Total Size Saved"
                    value={data.totalSizeSavedGB >= 1 ? `${data.totalSizeSavedGB} GB` : `${data.totalSizeSavedMB} MB`}
                    subtext={formatBytes(data.totalSizeSaved)}
                    color="text-green-600"
                />
                <StatCard
                    icon={Zap}
                    label="Avg Size Reduction"
                    value={`${data.avgSizeReduction}%`}
                    subtext="Across all models"
                    trend="up"
                    color="text-purple-600"
                />
                <StatCard
                    icon={Clock}
                    label="Avg Latency Drop"
                    value={`${data.avgLatencyReduction}%`}
                    subtext="Inference speedup"
                    trend="up"
                    color="text-orange-600"
                />
            </div>

            {/* Financial Impact */}
            <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-green-700 dark:text-green-400">Estimated Cost Savings</span>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-4xl font-bold text-green-600">${data.estimatedMonthlySavings}</p>
                                <p className="text-sm text-muted-foreground">Monthly savings</p>
                            </div>
                            <div>
                                <p className="text-4xl font-bold text-green-600">${data.estimatedAnnualSavings}</p>
                                <p className="text-sm text-muted-foreground">Annual projection</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-2 text-orange-600">
                            <Flame className="h-5 w-5" />
                            <span className="font-bold text-2xl">{data.streakDays}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Day streak</p>
                    </div>
                </div>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-semibold">Monthly Optimization Trend</h4>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#a1a1aa" />
                                <YAxis tick={{ fontSize: 11 }} stroke="#a1a1aa" />
                                <Tooltip
                                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                    formatter={(value: number, name: string) => [value, name === "models" ? "Models" : "Size Saved"]}
                                />
                                <Bar dataKey="models" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Quantization Breakdown */}
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChart className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-semibold">Quantization Usage</h4>
                    </div>
                    <div className="h-56">
                        {quantizationData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={quantizationData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        labelLine={false}
                                    >
                                        {quantizationData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                No data yet
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b bg-zinc-50 dark:bg-zinc-900/50">
                    <h4 className="font-semibold">Recent Activity</h4>
                </div>
                <div className="divide-y">
                    {data.recentJobs.length > 0 ? (
                        data.recentJobs.map((job) => (
                            <div key={job.id} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${job.status === "completed" ? "bg-green-100 dark:bg-green-900/30" :
                                        job.status === "failed" ? "bg-red-100 dark:bg-red-900/30" :
                                            "bg-blue-100 dark:bg-blue-900/30"
                                        }`}>
                                        {job.status === "completed" ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : job.status === "failed" ? (
                                            <XCircle className="h-4 w-4 text-red-600" />
                                        ) : (
                                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">{job.fileName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Unknown date"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {job.sizeReduction && (
                                        <Badge className="bg-green-500">-{job.sizeReduction}%</Badge>
                                    )}
                                    <Badge variant="outline">{job.status}</Badge>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            No recent activity. Start optimizing models!
                        </div>
                    )}
                </div>
            </Card>

            {/* Model Projections - Per-model cost savings */}
            {data.modelProjections && data.modelProjections.length > 0 && (
                <Card className="overflow-hidden">
                    <div className="px-6 py-4 border-b bg-zinc-50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <h4 className="font-semibold">Per-Model Cost Projections</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Individual savings based on size reduction and latency improvements</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-100 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">Model</th>
                                    <th className="px-4 py-3 text-center font-medium">Original</th>
                                    <th className="px-4 py-3 text-center font-medium">Optimized</th>
                                    <th className="px-4 py-3 text-center font-medium">Size ↓</th>
                                    <th className="px-4 py-3 text-center font-medium">Latency ↓</th>
                                    <th className="px-4 py-3 text-right font-medium">Monthly</th>
                                    <th className="px-4 py-3 text-right font-medium">Annual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.modelProjections.map((model) => (
                                    <tr key={model.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <FileBox className="h-4 w-4 text-blue-500" />
                                                <span className="font-medium truncate max-w-[200px]">{model.fileName}</span>
                                            </div>
                                            <div className="flex gap-1 mt-1">
                                                <Badge variant="outline" className="text-[10px]">{model.quantization}</Badge>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-muted-foreground">{model.originalSizeMB} MB</td>
                                        <td className="px-4 py-3 text-center">{model.optimizedSizeMB} MB</td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge className="bg-green-500">{model.sizeReduction}%</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {model.latencyReduction > 0 ? (
                                                <span className="text-green-600">{model.latencyReduction}%</span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-green-600">${model.monthlySavings}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-green-600">${model.annualSavings}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-green-50 dark:bg-green-950/30">
                                <tr>
                                    <td colSpan={5} className="px-4 py-3 font-semibold">Total Projected Savings</td>
                                    <td className="px-4 py-3 text-right font-bold text-green-600">
                                        ${data.modelProjections.reduce((sum, m) => sum + m.monthlySavings, 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-green-600">
                                        ${data.modelProjections.reduce((sum, m) => sum + m.annualSavings, 0).toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
