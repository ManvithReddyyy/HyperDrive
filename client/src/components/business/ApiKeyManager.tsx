import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Key, Plus, Trash2, Loader2, Copy, CheckCircle2, Clock } from "lucide-react";

interface ApiKeyData {
    id: string;
    name: string;
    keyPrefix: string;
    scopes: string[];
    expiresAt?: string;
    lastUsedAt?: string;
    createdAt: string;
}

export function ApiKeyManager() {
    const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);
    const { toast } = useToast();

    const [newKeyForm, setNewKeyForm] = useState({
        name: "",
        expiresInDays: 90,
    });

    useEffect(() => {
        fetchApiKeys();
    }, []);

    const fetchApiKeys = async () => {
        try {
            const response = await fetch("/api/api-keys", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setApiKeys(data);
            }
        } catch (error) {
            console.error("Error fetching API keys:", error);
        }
        setIsLoading(false);
    };

    const createApiKey = async () => {
        if (!newKeyForm.name.trim()) {
            toast({ title: "Error", description: "Key name is required", variant: "destructive" });
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch("/api/api-keys", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
                },
                body: JSON.stringify(newKeyForm),
            });

            if (response.ok) {
                const data = await response.json();
                setNewKey(data.key);
                fetchApiKeys();
                setNewKeyForm({ name: "", expiresInDays: 90 });
            } else {
                throw new Error("Failed to create API key");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to create API key", variant: "destructive" });
        }
        setIsCreating(false);
    };

    const revokeApiKey = async (id: string) => {
        try {
            const response = await fetch(`/api/api-keys/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
                },
            });
            if (response.ok) {
                toast({ title: "Success", description: "API key revoked" });
                fetchApiKeys();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to revoke API key", variant: "destructive" });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "API key copied to clipboard" });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const isExpired = (expiresAt?: string) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        API Keys
                    </CardTitle>
                    <CardDescription>Manage access tokens for API integration</CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setNewKey(null);
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{newKey ? "API Key Created!" : "Create API Key"}</DialogTitle>
                            <DialogDescription>
                                {newKey
                                    ? "Copy this key now. You won't be able to see it again."
                                    : "Create a new API key for programmatic access."}
                            </DialogDescription>
                        </DialogHeader>
                        {newKey ? (
                            <div className="space-y-4 py-4">
                                <div className="bg-muted p-4 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <code className="text-sm font-mono break-all">{newKey}</code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(newKey)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                    ⚠️ Make sure to copy this key now. It will not be shown again.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="key-name">Key Name</Label>
                                    <Input
                                        id="key-name"
                                        value={newKeyForm.name}
                                        onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                                        placeholder="Production API Key"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="expires">Expires In (days)</Label>
                                    <Input
                                        id="expires"
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={newKeyForm.expiresInDays}
                                        onChange={(e) => setNewKeyForm({ ...newKeyForm, expiresInDays: parseInt(e.target.value) || 90 })}
                                    />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            {newKey ? (
                                <Button onClick={() => setDialogOpen(false)}>Done</Button>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={createApiKey} disabled={isCreating}>
                                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Key
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No API keys yet. Create one to get started.
                    </div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                            {apiKeys.map((key) => (
                                <div
                                    key={key.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{key.name}</span>
                                            {isExpired(key.expiresAt) && (
                                                <Badge variant="destructive" className="text-xs">Expired</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <code className="text-sm text-muted-foreground font-mono">
                                                {key.keyPrefix}••••••••
                                            </code>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Created: {formatDate(key.createdAt)}
                                            </span>
                                            {key.lastUsedAt && (
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Last used: {formatDate(key.lastUsedAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => revokeApiKey(key.id)}
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
