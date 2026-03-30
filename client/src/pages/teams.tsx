import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Trash2, Loader2, UserPlus, Crown, Mail, Shield } from "lucide-react";

interface Team {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    createdAt: string;
}

interface TeamMember {
    id: string;
    teamId: string;
    userId: string;
    username: string;
    role: "owner" | "admin" | "member" | "viewer";
    joinedAt: string;
}

const ROLE_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    owner: { label: "Owner", variant: "default" },
    admin: { label: "Admin", variant: "secondary" },
    member: { label: "Member", variant: "outline" },
    viewer: { label: "Viewer", variant: "outline" },
};

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const { toast } = useToast();

    const [newTeam, setNewTeam] = useState({ name: "", description: "" });
    const [inviteForm, setInviteForm] = useState({ email: "", role: "member" });

    const LS_TEAMS_KEY = "hd_teams";
    const LS_MEMBERS_KEY = "hd_team_members";

    const loadTeams = (): Team[] => {
        try { return JSON.parse(localStorage.getItem(LS_TEAMS_KEY) || "[]"); } catch { return []; }
    };
    const loadMembers = (): TeamMember[] => {
        try { return JSON.parse(localStorage.getItem(LS_MEMBERS_KEY) || "[]"); } catch { return []; }
    };
    const saveTeams = (t: Team[]) => localStorage.setItem(LS_TEAMS_KEY, JSON.stringify(t));
    const saveMembers = (m: TeamMember[]) => localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(m));

    useEffect(() => {
        const stored = loadTeams();
        setTeams(stored);
        if (stored.length > 0) setSelectedTeam(stored[0]);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (selectedTeam) {
            const all = loadMembers();
            setMembers(all.filter(m => m.teamId === selectedTeam.id));
        }
    }, [selectedTeam]);

    const createTeam = () => {
        if (!newTeam.name.trim()) {
            toast({ title: "Error", description: "Team name is required", variant: "destructive" });
            return;
        }
        setIsCreating(true);
        const team: Team = {
            id: crypto.randomUUID(),
            name: newTeam.name.trim(),
            description: newTeam.description.trim() || undefined,
            ownerId: "demo-user",
            createdAt: new Date().toISOString(),
        };
        const ownerMember: TeamMember = {
            id: crypto.randomUUID(),
            teamId: team.id,
            userId: "demo-user",
            username: "Demo User",
            role: "owner",
            joinedAt: new Date().toISOString(),
        };
        const updatedTeams = [...loadTeams(), team];
        const updatedMembers = [...loadMembers(), ownerMember];
        saveTeams(updatedTeams);
        saveMembers(updatedMembers);
        setTeams(updatedTeams);
        setSelectedTeam(team);
        setMembers([ownerMember]);
        toast({ title: "Success", description: "Team created successfully" });
        setCreateDialogOpen(false);
        setNewTeam({ name: "", description: "" });
        setIsCreating(false);
    };

    const inviteMember = () => {
        if (!inviteForm.email.trim() || !selectedTeam) {
            toast({ title: "Error", description: "Email is required", variant: "destructive" });
            return;
        }
        setIsInviting(true);
        const newMember: TeamMember = {
            id: crypto.randomUUID(),
            teamId: selectedTeam.id,
            userId: inviteForm.email,
            username: inviteForm.email,
            role: inviteForm.role as TeamMember["role"],
            joinedAt: new Date().toISOString(),
        };
        const updatedMembers = [...loadMembers(), newMember];
        saveMembers(updatedMembers);
        setMembers(updatedMembers.filter(m => m.teamId === selectedTeam.id));
        toast({ title: "Success", description: `${inviteForm.email} added to team` });
        setInviteDialogOpen(false);
        setInviteForm({ email: "", role: "member" });
        setIsInviting(false);
    };

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };


    return (
        <div className="h-full overflow-auto p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-semibold flex items-center gap-2">
                            <Users className="h-6 w-6" />
                            Teams
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Collaborate with your team on model optimization
                        </p>
                    </div>
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Create Team
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Team</DialogTitle>
                                <DialogDescription>
                                    Create a team to collaborate with others on model optimization projects.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="team-name">Team Name</Label>
                                    <Input
                                        id="team-name"
                                        value={newTeam.name}
                                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                                        placeholder="My Awesome Team"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="team-description">Description (optional)</Label>
                                    <Input
                                        id="team-description"
                                        value={newTeam.description}
                                        onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                                        placeholder="What does this team work on?"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                                <Button onClick={createTeam} disabled={isCreating}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Team
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : teams.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
                        <p className="text-muted-foreground mb-6">
                            Create your first team to start collaborating with others.
                        </p>
                        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Your First Team
                        </Button>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Teams List */}
                        <Card className="lg:col-span-1">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Your Teams</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-1 p-2">
                                        {teams.map((team) => (
                                            <button
                                                key={team.id}
                                                onClick={() => setSelectedTeam(team)}
                                                className={`w-full text-left p-3 rounded-lg transition-colors ${selectedTeam?.id === team.id
                                                        ? "bg-primary/10 border border-primary/20"
                                                        : "hover:bg-accent"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <Users className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{team.name}</p>
                                                        {team.description && (
                                                            <p className="text-xs text-muted-foreground truncate">{team.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Team Details */}
                        {selectedTeam && (
                            <Card className="lg:col-span-2">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <div>
                                        <CardTitle>{selectedTeam.name}</CardTitle>
                                        <CardDescription>
                                            {selectedTeam.description || "No description"}
                                        </CardDescription>
                                    </div>
                                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" className="gap-2">
                                                <UserPlus className="h-4 w-4" />
                                                Invite Member
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Invite Team Member</DialogTitle>
                                                <DialogDescription>
                                                    Send an invitation to join {selectedTeam.name}.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="invite-email">Email Address</Label>
                                                    <Input
                                                        id="invite-email"
                                                        type="email"
                                                        value={inviteForm.email}
                                                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                                        placeholder="colleague@company.com"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Role</Label>
                                                    <Select
                                                        value={inviteForm.role}
                                                        onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}
                                                    >
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="admin">Admin - Full access</SelectItem>
                                                            <SelectItem value="member">Member - Can edit</SelectItem>
                                                            <SelectItem value="viewer">Viewer - Read only</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                                                <Button onClick={inviteMember} disabled={isInviting}>
                                                    {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Send Invitation
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium text-sm text-muted-foreground">Team Members</h4>
                                            <span className="text-xs text-muted-foreground">{members.length} members</span>
                                        </div>

                                        {members.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No members yet. Invite someone!</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {members.map((member) => (
                                                    <div
                                                        key={member.id}
                                                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarFallback>{getInitials(member.username)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium text-sm flex items-center gap-2">
                                                                    {member.username}
                                                                    {member.role === "owner" && <Crown className="h-3 w-3 text-yellow-500" />}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Joined {formatDate(member.joinedAt)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Badge variant={ROLE_BADGES[member.role]?.variant || "outline"}>
                                                            {ROLE_BADGES[member.role]?.label || member.role}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
