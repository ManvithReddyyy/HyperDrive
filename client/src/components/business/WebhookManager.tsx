import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Webhook, Plus, Trash2, Loader2, ExternalLink, CheckCircle2, XCircle } from "lucide-react";

const WEBHOOK_EVENTS = [
    { value: "job.completed", label: "Job Completed" },
    { value: "job.failed", label: "Job Failed" },
    { value: "batch.completed", label: "Batch Completed" },
    { value: "alert.triggered", label: "Alert Triggered" },
    { value: "drift.detected", label: "Drift Detected" },
];

interface WebhookConfig {
    id: string;
    name: string;
    url: string;
    events: string[];
    isActive: boolean;
    lastTriggeredAt?: string;
    createdAt: string;
}

export function WebhookManager() {
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const { toast } = useToast();

    const [newWebhook, setNewWebhook] = useState({
        name: "",
        url: "",
        events: [] as string[],
        secret: "",
    });

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const fetchWebhooks = async () => {
        try {
            const response = await fetch("/api/webhooks", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setWebhooks(data);
            }
        } catch (error) {
            console.error("Error fetching webhooks:", error);
        }
        setIsLoading(false);
    };

    const createWebhook = async () => {
        if (!newWebhook.name.trim() || !newWebhook.url.trim()) {
            toast({ title: "Error", description: "Name and URL are required", variant: "destructive" });
            return;
        }
        if (newWebhook.events.length === 0) {
            toast({ title: "Error", description: "Select at least one event", variant: "destructive" });
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch("/api/webhooks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
                },
                body: JSON.stringify(newWebhook),
            });

            if (response.ok) {
                toast({ title: "Success", description: "Webhook created successfully" });
                fetchWebhooks();
                setDialogOpen(false);
                setNewWebhook({ name: "", url: "", events: [], secret: "" });
            } else {
                throw new Error("Failed to create webhook");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to create webhook", variant: "destructive" });
        }
        setIsCreating(false);
    };

    const deleteWebhook = async (id: string) => {
        try {
            const response = await fetch(`/api/webhooks/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
                },
            });
            if (response.ok) {
                toast({ title: "Success", description: "Webhook deleted" });
                fetchWebhooks();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete webhook", variant: "destructive" });
        }
    };

    const toggleEvent = (value: string) => {
        setNewWebhook((prev) => ({
            ...prev,
            events: prev.events.includes(value)
                ? prev.events.filter((e) => e !== value)
                : [...prev.events, value],
        }));
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Webhook className="h-5 w-5 text-primary" />
                        Webhooks
                    </CardTitle>
                    <CardDescription>Receive notifications when events occur</CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Webhook
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Webhook</DialogTitle>
                            <DialogDescription>
                                Configure a webhook to receive notifications.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="webhook-name">Name</Label>
                                <Input
                                    id="webhook-name"
                                    value={newWebhook.name}
                                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                                    placeholder="Slack Notifications"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="webhook-url">URL</Label>
                                <Input
                                    id="webhook-url"
                                    value={newWebhook.url}
                                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                                    placeholder="https://hooks.slack.com/services/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="webhook-secret">Secret (optional)</Label>
                                <Input
                                    id="webhook-secret"
                                    type="password"
                                    value={newWebhook.secret}
                                    onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                                    placeholder="Optional signing secret"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Events</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {WEBHOOK_EVENTS.map((event) => (
                                        <div key={event.value} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={event.value}
                                                checked={newWebhook.events.includes(event.value)}
                                                onCheckedChange={() => toggleEvent(event.value)}
                                            />
                                            <Label htmlFor={event.value} className="text-sm font-normal">
                                                {event.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={createWebhook} disabled={isCreating}>
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Webhook
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
                ) : webhooks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No webhooks configured. Add one to receive notifications!
                    </div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                            {webhooks.map((webhook) => (
                                <div
                                    key={webhook.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            {webhook.isActive ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <span className="font-medium">{webhook.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                            <ExternalLink className="h-3 w-3" />
                                            <span className="truncate max-w-[300px]">{webhook.url}</span>
                                        </div>
                                        <div className="flex gap-1 mt-2 flex-wrap">
                                            {webhook.events.map((event) => (
                                                <Badge key={event} variant="secondary" className="text-xs">
                                                    {event}
                                                </Badge>
                                            ))}
                                        </div>
                                        {webhook.lastTriggeredAt && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Last triggered: {formatDate(webhook.lastTriggeredAt)}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteWebhook(webhook.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
