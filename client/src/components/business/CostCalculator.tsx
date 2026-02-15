import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, DollarSign, Clock, Zap } from "lucide-react";

const HARDWARE_OPTIONS = [
    { value: "NVIDIA A100", label: "NVIDIA A100", costPerHour: 3.50 },
    { value: "NVIDIA H100", label: "NVIDIA H100", costPerHour: 8.00 },
    { value: "NVIDIA A10", label: "NVIDIA A10", costPerHour: 1.80 },
    { value: "NVIDIA T4", label: "NVIDIA T4", costPerHour: 0.75 },
    { value: "NVIDIA V100", label: "NVIDIA V100", costPerHour: 2.40 },
    { value: "NVIDIA L4", label: "NVIDIA L4", costPerHour: 1.20 },
    { value: "NVIDIA RTX 4090", label: "NVIDIA RTX 4090", costPerHour: 1.50 },
    { value: "Google TPU v4", label: "Google TPU v4", costPerHour: 4.50 },
    { value: "AWS Inferentia2", label: "AWS Inferentia2", costPerHour: 1.20 },
    { value: "Intel Xeon (AVX-512)", label: "Intel Xeon (AVX-512)", costPerHour: 0.50 },
    { value: "Apple M1/M2/M3", label: "Apple M1/M2/M3", costPerHour: 0.30 },
];

interface CostEstimate {
    monthlyCost: number;
    yearlyProjection: number;
    costPerMillionTokens: number;
}

export function CostCalculator() {
    const [hardware, setHardware] = useState<string>("NVIDIA A10");
    const [hoursPerDay, setHoursPerDay] = useState<number>(8);
    const [daysPerMonth, setDaysPerMonth] = useState<number>(22);
    const [estimatedTokens, setEstimatedTokens] = useState<number>(100000000);
    const [estimate, setEstimate] = useState<CostEstimate | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const calculateCost = async () => {
        setIsCalculating(true);
        try {
            const response = await fetch("/api/cost/estimate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hardware, hoursPerDay, daysPerMonth, estimatedTokens }),
            });
            const data = await response.json();
            setEstimate(data);
        } catch (error) {
            console.error("Error calculating cost:", error);
        }
        setIsCalculating(false);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat("en-US").format(value);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Cost Calculator
                </CardTitle>
                <CardDescription>
                    Estimate your inference costs based on hardware and usage
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="hardware">Target Hardware</Label>
                        <Select value={hardware} onValueChange={setHardware}>
                            <SelectTrigger id="hardware">
                                <SelectValue placeholder="Select hardware" />
                            </SelectTrigger>
                            <SelectContent>
                                {HARDWARE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label} (${option.costPerHour}/hr)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tokens">Estimated Monthly Tokens</Label>
                        <Input
                            id="tokens"
                            type="number"
                            value={estimatedTokens}
                            onChange={(e) => setEstimatedTokens(parseInt(e.target.value) || 0)}
                            placeholder="100000000"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hours">Hours per Day</Label>
                        <Input
                            id="hours"
                            type="number"
                            min={1}
                            max={24}
                            value={hoursPerDay}
                            onChange={(e) => setHoursPerDay(parseInt(e.target.value) || 1)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="days">Days per Month</Label>
                        <Input
                            id="days"
                            type="number"
                            min={1}
                            max={31}
                            value={daysPerMonth}
                            onChange={(e) => setDaysPerMonth(parseInt(e.target.value) || 1)}
                        />
                    </div>
                </div>

                <Button onClick={calculateCost} disabled={isCalculating} className="w-full">
                    {isCalculating ? "Calculating..." : "Calculate Cost"}
                </Button>

                {estimate && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg p-4 text-center">
                            <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            <p className="text-sm text-muted-foreground">Monthly Cost</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(estimate.monthlyCost)}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg p-4 text-center">
                            <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                            <p className="text-sm text-muted-foreground">Yearly Projection</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(estimate.yearlyProjection)}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg p-4 text-center">
                            <Zap className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                            <p className="text-sm text-muted-foreground">Cost per 1M Tokens</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {formatCurrency(estimate.costPerMillionTokens)}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
