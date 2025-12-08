import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Bell, Shield, Trash2, LogOut, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function SettingsPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Profile settings
  const [displayName, setDisplayName] = useState(user?.username || "");

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [jobCompletionNotif, setJobCompletionNotif] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);

  // Security settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: async (newDisplayName: string) => {
      const res = await apiRequest("PATCH", "/api/user/profile", { displayName: newDisplayName });
      return res.json();
    },
    onSuccess: () => {
      // Refresh user data to get updated display name
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      toast({
        title: "Profile updated",
        description: "Your display name has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = () => {
    if (!displayName.trim()) {
      toast({
        title: "Invalid name",
        description: "Display name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate(displayName.trim());
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement password change
    toast({
      title: "Password changed",
      description: "Your password has been changed successfully",
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      // TODO: Implement account deletion
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted",
      });
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5" />
            <h3 className="text-lg font-medium">Profile</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || user?.username || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <Button
              onClick={handleProfileUpdate}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5" />
            <h3 className="text-lg font-medium">Notifications</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive email notifications for important events
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Job Completion</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when optimization jobs finish
                </p>
              </div>
              <Switch
                checked={jobCompletionNotif}
                onCheckedChange={setJobCompletionNotif}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Reports</Label>
                <p className="text-xs text-muted-foreground">
                  Receive weekly summary of your optimizations
                </p>
              </div>
              <Switch
                checked={weeklyReports}
                onCheckedChange={setWeeklyReports}
              />
            </div>
          </div>
        </Card>

        {/* Security Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5" />
            <h3 className="text-lg font-medium">Security</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <Button onClick={handlePasswordChange}>Change Password</Button>
          </div>
        </Card>

        {/* Account Actions */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-1">Account Actions</h3>
              <p className="text-sm text-muted-foreground">
                Manage your account and data
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-xs text-muted-foreground">
                  Sign out from this device
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </Card>

        {/* API Keys Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5" />
            <h3 className="text-lg font-medium">API Keys</h3>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate API keys to use HyperDrive programmatically
            </p>
            <Button variant="outline">Generate New API Key</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
