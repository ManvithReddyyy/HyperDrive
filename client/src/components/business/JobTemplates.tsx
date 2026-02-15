import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, Plus, Trash2, Loader2, Copy } from "lucide-react";
import { quantizationOptions, targetDeviceOptions, strategyOptions } from "@shared/schema";

interface JobTemplate {
    id: string;
    name: string;
    description?: string;
    config: {
        quantization: string;
        targetDevice: string;
        strategy: string;
    };
    isPublic: boolean;
    usageCount: number;
    createdAt: string;
}

interface JobTemplatesProps {
    onSelectTemplate?: (config: JobTemplate["config"]) => void;
}

export function JobTemplates({ onSelectTemplate }: JobTemplatesProps) {
    const [templates, setTemplates] = useState<JobTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const { toast } = useToast();

    // Form state for new template
    const [newTemplate, setNewTemplate] = useState({
        name: "",
        description: "",
        quantization: "INT8 Dynamic" as string,
        targetDevice: "NVIDIA A10" as string,
        strategy: "Balanced" as string,
        isPublic: false,
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const response = await fetch("/api/templates", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error("Error fetching templates:", error);
        }
        setIsLoading(false);
    };

    const createTemplate = async () => {
        if (!newTemplate.name.trim()) {
            toast({ title: "Error", description: "Template name is required", variant: "destructive" });
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch("/api/templates", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
                },
                body: JSON.stringify({
                    name: newTemplate.name,
                    description: newTemplate.description,
                    config: {
                        quantization: newTemplate.quantization,
                        targetDevice: newTemplate.targetDevice,
                        strategy: newTemplate.strategy,
                    },
                    isPublic: newTemplate.isPublic,
                }),
            });

            if (response.ok) {
                toast({ title: "Success", description: "Template created successfully" });
                fetchTemplates();
                setDialogOpen(false);
                setNewTemplate({
                    name: "",
                    description: "",
                    quantization: "INT8 Dynamic",
                    targetDevice: "NVIDIA A10",
                    strategy: "Balanced",
                    isPublic: false,
                });
            } else {
                throw new Error("Failed to create template");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
        }
        setIsCreating(false);
    };

    const deleteTemplate = async (id: string) => {
        try {
            const response = await fetch(`/api/templates/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
                },
            });
            if (response.ok) {
                toast({ title: "Success", description: "Template deleted" });
                fetchTemplates();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
        }
    };

    const useTemplate = (template: JobTemplate) => {
        if (onSelectTemplate) {
            onSelectTemplate(template.config);
            toast({ title: "Template Applied", description: `Applied "${template.name}" configuration` });
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Bookmark className="h-5 w-5 text-primary" />
                        Job Templates
                    </CardTitle>
                    <CardDescription>Save and reuse optimization configurations</CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            New Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Job Template</DialogTitle>
                            <DialogDescription>
                                Save your optimization settings as a reusable template.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Template Name</Label>
                                <Input
                                    id="name"
                                    value={newTemplate.name}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                    placeholder="My Production Config"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (optional)</Label>
                                <Input
                                    id="description"
                                    value={newTemplate.description}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                                    placeholder="Optimized for low-latency inference"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Quantization</Label>
                                <Select
                                    value={newTemplate.quantization}
                                    onValueChange={(v) => setNewTemplate({ ...newTemplate, quantization: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {quantizationOptions.map((q) => (
                                            <SelectItem key={q} value={q}>{q}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Target Device</Label>
                                <Select
                                    value={newTemplate.targetDevice}
                                    onValueChange={(v) => setNewTemplate({ ...newTemplate, targetDevice: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {targetDeviceOptions.map((d) => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Strategy</Label>
                                <Select
                                    value={newTemplate.strategy}
                                    onValueChange={(v) => setNewTemplate({ ...newTemplate, strategy: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {strategyOptions.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="public"
                                    checked={newTemplate.isPublic}
                                    onCheckedChange={(checked) =>
                                        setNewTemplate({ ...newTemplate, isPublic: checked as boolean })
                                    }
                                />
                                <Label htmlFor="public" className="text-sm font-normal">
                                    Make this template public (visible to all users)
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={createTemplate} disabled={isCreating}>
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Template
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No templates yet. Create your first one!
                    </div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{template.name}</span>
                                            {template.isPublic && (
                                                <Badge variant="secondary" className="text-xs">Public</Badge>
                                            )}
                                        </div>
                                        {template.description && (
                                            <p className="text-sm text-muted-foreground">{template.description}</p>
                                        )}
                                        <div className="flex gap-2 mt-1 flex-wrap">
                                            <Badge variant="outline" className="text-xs">{template.config.quantization}</Badge>
                                            <Badge variant="outline" className="text-xs">{template.config.targetDevice}</Badge>
                                            <Badge variant="outline" className="text-xs">{template.config.strategy}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {onSelectTemplate && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => useTemplate(template)}
                                                className="gap-1"
                                            >
                                                <Copy className="h-4 w-4" />
                                                Use
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteTemplate(template.id)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
