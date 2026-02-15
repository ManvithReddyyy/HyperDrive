import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Loader2, User, Zap, FileText, Users, Key, Settings, Webhook } from "lucide-react";

interface AuditLogEntry {
    id: string;
    userId: string;
    username: string;
    action: string;
    resourceType: string;
    resourceId: string;
    details?: Record<string, any>;
    timestamp: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
    "job.create": <FileText className="h-4 w-4 text-green-500" />,
    "job.delete": <FileText className="h-4 w-4 text-red-500" />,
    "job.update": <FileText className="h-4 w-4 text-blue-500" />,
    "template.create": <Zap className="h-4 w-4 text-purple-500" />,
    "template.delete": <Zap className="h-4 w-4 text-red-500" />,
    "team.create": <Users className="h-4 w-4 text-green-500" />,
    "team.invite": <Users className="h-4 w-4 text-blue-500" />,
    "team.remove": <Users className="h-4 w-4 text-red-500" />,
    "settings.update": <Settings className="h-4 w-4 text-gray-500" />,
    "webhook.trigger": <Webhook className="h-4 w-4 text-orange-500" />,
    "apikey.create": <Key className="h-4 w-4 text-green-500" />,
    "apikey.revoke": <Key className="h-4 w-4 text-red-500" />,
};

const ACTION_LABELS: Record<string, string> = {
    "job.create": "Created job",
    "job.delete": "Deleted job",
    "job.update": "Updated job",
    "template.create": "Created template",
    "template.delete": "Deleted template",
    "team.create": "Created team",
    "team.invite": "Invited member",
    "team.remove": "Removed member",
    "settings.update": "Updated settings",
    "webhook.trigger": "Triggered webhook",
    "apikey.create": "Created API key",
    "apikey.revoke": "Revoked API key",
};

export function AuditLog() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const response = await fetch("/api/audit-log?limit=100", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setLogs(data);
            }
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        }
        setIsLoading(false);
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Audit Log
                </CardTitle>
                <CardDescription>Track all activities in your account</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No activity recorded yet.
                    </div>
                ) : (
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-1">
                            {logs.map((log, index) => (
                                <div
                                    key={log.id}
                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    <div className="mt-0.5">
                                        {ACTION_ICONS[log.action] || <User className="h-4 w-4 text-gray-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm">{log.username}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {ACTION_LABELS[log.action] || log.action}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {log.resourceType}
                                            </Badge>
                                        </div>
                                        {log.details && Object.keys(log.details).length > 0 && (
                                            <p className="text-xs text-muted-foreground mt-1 truncate">
                                                {JSON.stringify(log.details)}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatTime(log.timestamp)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
