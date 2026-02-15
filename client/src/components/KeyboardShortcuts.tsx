import { useEffect, useCallback, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";

interface Shortcut {
    key: string;
    description: string;
    action: () => void;
    modifiers?: ("ctrl" | "alt" | "shift" | "meta")[];
}

export function KeyboardShortcuts() {
    const [helpOpen, setHelpOpen] = useState(false);
    const [, setLocation] = useLocation();

    const shortcuts: Shortcut[] = [
        { key: "?", description: "Show keyboard shortcuts", action: () => setHelpOpen(true), modifiers: ["shift"] },
        { key: "h", description: "Go to Home", action: () => setLocation("/"), modifiers: ["alt"] },
        { key: "j", description: "Go to Jobs", action: () => setLocation("/jobs"), modifiers: ["alt"] },
        { key: "u", description: "Go to Upload", action: () => setLocation("/upload"), modifiers: ["alt"] },
        { key: "i", description: "Go to Insights", action: () => setLocation("/insights"), modifiers: ["alt"] },
        { key: "s", description: "Go to Settings", action: () => setLocation("/settings"), modifiers: ["alt"] },
        { key: "p", description: "Go to Playground", action: () => setLocation("/playground"), modifiers: ["alt"] },
        { key: "n", description: "New Job (focus Upload)", action: () => setLocation("/upload"), modifiers: ["ctrl"] },
        { key: "Escape", description: "Close dialogs", action: () => setHelpOpen(false) },
    ];

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        for (const shortcut of shortcuts) {
            const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase() ||
                (shortcut.key === "?" && e.key === "?" && e.shiftKey);

            const ctrlMatch = shortcut.modifiers?.includes("ctrl") ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
            const altMatch = shortcut.modifiers?.includes("alt") ? e.altKey : !e.altKey;
            const shiftMatch = shortcut.modifiers?.includes("shift") ? e.shiftKey : (shortcut.key === "?" ? true : !e.shiftKey);

            if (keyMatch && ctrlMatch && altMatch && (shortcut.key === "?" || shiftMatch)) {
                e.preventDefault();
                shortcut.action();
                return;
            }
        }
    }, [shortcuts]);

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const formatShortcut = (shortcut: Shortcut) => {
        const parts: string[] = [];
        if (shortcut.modifiers?.includes("ctrl")) parts.push("⌘/Ctrl");
        if (shortcut.modifiers?.includes("alt")) parts.push("Alt");
        if (shortcut.modifiers?.includes("shift")) parts.push("Shift");
        parts.push(shortcut.key.toUpperCase());
        return parts.join(" + ");
    };

    return (
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Keyboard Shortcuts</DialogTitle>
                    <DialogDescription>
                        Navigate faster with these keyboard shortcuts
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                    {shortcuts.filter(s => s.key !== "Escape").map((shortcut, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                            <span className="text-sm">{shortcut.description}</span>
                            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                                {formatShortcut(shortcut)}
                            </kbd>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
