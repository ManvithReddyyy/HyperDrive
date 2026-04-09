import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Leaf, DollarSign, Zap, Cloud, TreePine, Battery, Server, Droplets, Clock, Car } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job } from "@shared/schema";

export default function ImpactCalculatorPage() {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [trafficScale, setTrafficScale] = useState<number[]>([10000000]); // Default 10M requests

    const { data: jobs, isLoading } = useQuery<Job[]>({
        queryKey: ["/api/jobs"],
        queryFn: async () => {
            const res = await fetch("/api/jobs");
            if (!res.ok) throw new Error("Failed to fetch jobs");
            return res.json();
        },
    });

    const completedJobs = jobs?.filter(j => j.status === "completed") || [];

    useEffect(() => {
        if (completedJobs.length > 0 && !selectedJobId) {
            setSelectedJobId(completedJobs[0].id);
        }
    }, [completedJobs, selectedJobId]);

    const activeJob = completedJobs.find(j => j.id === selectedJobId);

    // Default fallbacks if job exists but metrics missing
    const origLat = activeJob?.originalLatency || 45.0; 
    const optLat = activeJob?.optimizedLatency || 12.0;

    const requests = trafficScale[0];

    const calculatePillars = (latencyMs: number) => {
        // Total compute hours per month
        const computeHours = (requests * latencyMs) / 3600000;
        
        // NVIDIA A10G draws ~0.25 kW under load on average
        const kwh = computeHours * 0.25;
        
        // EPA Average: 0.385 kg CO2 per kWh
        const co2Kg = kwh * 0.385;
        
        // Average Cloud Cost per Hour ($1.25)
        const cost = computeHours * 1.25;

        // Equivalents
        const smartphoneCharges = Math.round(kwh / 0.008); 
        const treesRequired = co2Kg / 21; // 1 tree handles ~21kg a year
        
        // Water used for datacenter cooling (avg 1.8 liters per kWh)
        const waterLiters = kwh * 1.8;
        
        return { computeHours, kwh, co2Kg, cost, smartphoneCharges, treesRequired, waterLiters };
    };

    const origStats = calculatePillars(origLat);
    const optStats = calculatePillars(optLat);
    
    const latDiffMs = origLat - optLat;
    const humanHoursSaved = (requests * latDiffMs) / 3600000;
    const milesDrivenSaved = (origStats.co2Kg - optStats.co2Kg) / 0.4;
    const waterSaved = origStats.waterLiters - optStats.waterLiters;

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const formatNumber = (val: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(val);

    return (
        <div className="h-full overflow-auto">
            <div className="px-6 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-500" />
                    <h1 className="text-sm font-medium text-foreground">AI Impact Calculator</h1>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Extrapolate your model's micro-benchmarks into massive enterprise-scale impact.
                </p>
            </div>

            <div className="p-6 max-w-6xl mx-auto space-y-8">
                {/* Controls Section */}
                <Card className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-sm font-semibold flex items-center gap-2">
                                <Server className="h-4 w-4 text-muted-foreground" />
                                1. Source Model
                            </label>
                            {isLoading ? <Skeleton className="h-10 w-full" /> : (
                                <Select value={selectedJobId || ""} onValueChange={setSelectedJobId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an optimized model..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {completedJobs.map((job) => (
                                            <SelectItem key={job.id} value={job.id}>
                                                <div className="flex items-center justify-between w-full pr-4">
                                                    <span>{job.fileName}</span>
                                                    <Badge variant="outline" className="ml-2 text-[10px]">{job.config?.quantization || "Unknown"}</Badge>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {activeJob && (
                                <div className="flex gap-4 text-xs font-mono bg-muted/50 p-2 rounded-md border border-border">
                                    <span className="text-muted-foreground">Original: <span className="text-foreground pl-1">{origLat}ms</span></span>
                                    <span className="text-muted-foreground">Optimized: <span className="text-green-500 font-bold pl-1">{optLat}ms</span></span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <label className="text-sm font-semibold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-muted-foreground" />
                                2. Enterprise Traffic Scale
                            </label>
                            
                            <div className="space-y-4 pt-2">
                                <Slider 
                                    min={100000} 
                                    max={100000000} 
                                    step={100000} 
                                    value={trafficScale} 
                                    onValueChange={setTrafficScale}
                                    className="cursor-pointer"
                                />
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs font-medium text-muted-foreground">100k</span>
                                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold shadow-sm border border-primary/20">
                                        {formatNumber(requests / 1000000)} Million Inferences / Mo
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">100M</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Impact Dashboard */}
                {activeJob ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        
                        {/* Financial Impact */}
                        <Card className="p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <DollarSign className="w-24 h-24" />
                            </div>
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6 text-blue-500">
                                <DollarSign className="h-5 w-5" /> Cloud Bill Slashed
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Original Hosting Cost</span>
                                    <span className="font-mono text-lg">{formatCurrency(origStats.cost)}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-blue-500/30 pb-2">
                                    <span className="text-sm font-medium text-foreground">Optimized Cost</span>
                                    <span className="font-mono text-2xl font-bold text-blue-500">{formatCurrency(optStats.cost)}</span>
                                </div>
                            </div>
                            <div className="mt-6 bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 rounded-md text-sm font-medium border border-blue-500/20">
                                You save {formatCurrency(origStats.cost - optStats.cost)} per month.
                            </div>
                        </Card>

                        {/* CO2 Impact */}
                        <Card className="p-6 relative overflow-hidden group border-green-500/20">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Cloud className="w-24 h-24" />
                            </div>
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6 text-green-600 dark:text-green-500">
                                <Cloud className="h-5 w-5" /> Carbon Footprint
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Original CO2</span>
                                    <span className="font-mono text-lg">{formatNumber(origStats.co2Kg)} kg</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-green-500/30 pb-2">
                                    <span className="text-sm font-medium text-foreground">Optimized CO2</span>
                                    <span className="font-mono text-2xl font-bold text-green-500">{formatNumber(optStats.co2Kg)} kg</span>
                                </div>
                            </div>
                            <div className="mt-6 flex items-start gap-3 bg-green-500/10 p-3 rounded-md border border-green-500/20">
                                <TreePine className="h-8 w-8 text-green-600 shrink-0" />
                                <div className="text-xs font-medium text-green-700 dark:text-green-400">
                                    Equivalent to the C02 absorbed by <span className="font-bold text-sm tracking-tight">{formatNumber(origStats.treesRequired - optStats.treesRequired)}</span> mature trees over an entire year!
                                </div>
                            </div>
                        </Card>

                        {/* Energy Draw */}
                        <Card className="p-6 relative overflow-hidden group border-orange-500/20">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Zap className="w-24 h-24" />
                            </div>
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6 text-orange-500">
                                <Zap className="h-5 w-5" /> Energy Consumed
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Original Draw</span>
                                    <span className="font-mono text-lg">{formatNumber(origStats.kwh)} kWh</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-orange-500/30 pb-2">
                                    <span className="text-sm font-medium text-foreground">Optimized Draw</span>
                                    <span className="font-mono text-2xl font-bold text-orange-500">{formatNumber(optStats.kwh)} kWh</span>
                                </div>
                            </div>
                            <div className="mt-6 flex items-start gap-3 bg-orange-500/10 p-3 rounded-md border border-orange-500/20">
                                <Battery className="h-8 w-8 text-orange-500 shrink-0" />
                                <div className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                    Saved energy could fully charge <span className="font-bold text-sm tracking-tight">{formatNumber(origStats.smartphoneCharges - optStats.smartphoneCharges)}</span> smartphones from 0 to 100%.
                                </div>
                            </div>
                        </Card>

                        {/* Extrapolation 1: Wait Time */}
                        <Card className="p-6 relative overflow-hidden group border-indigo-500/20">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Clock className="w-24 h-24" />
                            </div>
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6 text-indigo-500">
                                <Clock className="h-5 w-5" /> Human Time UX
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Across {formatNumber(requests / 1000000)} Million requests, slicing {formatNumber(latDiffMs)}ms off the response time eliminates a massive amount of accumulated human waiting.
                            </p>
                            <div className="mt-auto pt-4 border-t border-indigo-500/20 flex flex-col justify-center items-center">
                                <span className="text-3xl font-black text-indigo-500">{formatNumber(humanHoursSaved)}</span>
                                <span className="text-xs uppercase tracking-wider font-semibold text-indigo-500/70 mt-1">Hours of Loading Spinners Prevented</span>
                            </div>
                        </Card>

                        {/* Extrapolation 2: Water Conservation */}
                        <Card className="p-6 relative overflow-hidden group border-cyan-500/20">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Droplets className="w-24 h-24" />
                            </div>
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6 text-cyan-500">
                                <Droplets className="h-5 w-5" /> Water Conservation
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Datacenters consume an average of 1.8 liters of fresh water per 1 kWh of compute energy for cooling systems.
                            </p>
                            <div className="mt-auto pt-4 border-t border-cyan-500/20 flex items-center justify-between">
                                <div className="text-xs font-medium text-cyan-600/70 dark:text-cyan-400 max-w-[120px]">
                                    Provides drinking water for <span className="font-bold text-sm">{formatNumber(waterSaved / 3.7)}</span> people daily.
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-2xl font-black text-cyan-500">{formatNumber(waterSaved)}</span>
                                    <span className="text-[10px] uppercase font-bold text-cyan-500/70">Liters Saved</span>
                                </div>
                            </div>
                        </Card>

                        {/* Extrapolation 3: Gas Mileage Equivalent */}
                        <Card className="p-6 relative overflow-hidden group border-red-500/20">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Car className="w-24 h-24" />
                            </div>
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6 text-red-500">
                                <Car className="h-5 w-5" /> Emissions Equivalent
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                An average passenger vehicle emits roughly 400 grams of CO2 per mile driven. The compute you saved equals...
                            </p>
                            <div className="mt-auto pt-4 border-t border-red-500/20 flex flex-col justify-center items-center">
                                <span className="text-3xl font-black text-red-500">{formatNumber(milesDrivenSaved)}</span>
                                <span className="text-xs uppercase tracking-wider font-semibold text-red-500/70 mt-1">Miles Driven by Gas Car</span>
                            </div>
                        </Card>

                    </div>
                ) : (
                    <Card className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground border-dashed">
                        <Leaf className="w-16 h-16 opacity-20 mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-1">Awaiting Model Profile</h3>
                        <p className="max-w-sm">Select an optimized model from the dropdown above to visualize its corporate impact scale.</p>
                    </Card>
                )}

            </div>
        </div>
    );
}

