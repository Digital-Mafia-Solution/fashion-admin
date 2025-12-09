import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  User as UserIcon,
  Bell,
  Lock,
  Server,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Badge } from "../components/ui/badge";
import { SmartPhoneInput } from "../components/ui/phone-input";
import { ForcePasswordChange } from "../components/ForcePasswordChange";

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url: string | null;
  email: string;
  role: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mustChange, setMustChange] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    phone: "",
    avatar_url: null,
    email: "",
    role: "",
  });

  const [notifications, setNotifications] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [lowStockAlert, setLowStockAlert] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
      }

      if (data) {
        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          avatar_url: data.avatar_url || null,
          email: user.email || "",
          role: data.role || "staff",
        });
      }
      setMustChange(data.must_change_password);
      setLoading(false);
    }
    loadProfile();
  }, [navigate]);

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      setSaving(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      if (!user) throw new Error("No user logged in");

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));

      await supabase.from("profiles").upsert({
        id: user.id,
        avatar_url: publicUrl,
        email: user.email,
      });

      toast.success("Profile picture updated!");
    } catch (error: unknown) {
      let msg = "Error uploading image";
      if (error instanceof Error) msg = error.message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async () => {
    setSaving(true);
    try {
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        full_name: `${profile.first_name} ${profile.last_name}`,
        phone: profile.phone,
        email: user.email,
      });

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: unknown) {
      console.error(error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Password changed successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  };

  const handleSystemSave = () => {
    setSaving(true);
    setTimeout(() => {
      toast.success("System configuration saved");
      setSaving(false);
    }, 800);
  };

  if (loading)
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <ForcePasswordChange
        open={mustChange}
        onSuccess={() => setMustChange(false)}
      />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and system preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          <TabsTrigger value="system">System Config</TabsTrigger>
        </TabsList>

        {/* TAB 1: PERSONAL PROFILE */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                Click the image to upload a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative group cursor-pointer shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                  onChange={handleAvatarUpload}
                  disabled={saving}
                />
                <Avatar className="w-24 h-24 border-2 border-border group-hover:border-primary transition-colors">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                    <UserIcon className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <Upload className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <p className="font-medium">Upload a new photo</p>
                <p className="text-sm text-muted-foreground">
                  JPG, GIF or PNG. Max 2MB.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your contact details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={profile.first_name}
                    onChange={(e) =>
                      setProfile({ ...profile, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={profile.last_name}
                    onChange={(e) =>
                      setProfile({ ...profile, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile.email} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center h-10">
                    <Badge
                      variant={
                        profile.role === "admin" ? "default" : "secondary"
                      }
                      className="text-sm uppercase"
                    >
                      {profile.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <SmartPhoneInput
                  value={profile.phone}
                  onChange={(val) => setProfile({ ...profile, phone: val })}
                  placeholder="+27 72 123 4567"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t bg-muted/20 px-6 py-4">
              <Button onClick={handleProfileUpdate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Change Password</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={!newPassword || !confirmPassword || saving}
                  className="mt-2"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SYSTEM CONFIGURATION */}
        <TabsContent value="system" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>
                Configure how you receive system alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive daily summaries of sales.
                  </p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Stock Warnings</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when inventory drops below 5 units.
                  </p>
                </div>
                <Switch
                  checked={lowStockAlert}
                  onCheckedChange={setLowStockAlert}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Security & Operations</CardTitle>
              </div>
              <CardDescription>
                Global controls for the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-destructive">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Pause all customer orders on the marketplace.
                  </p>
                </div>
                <Switch
                  checked={maintenance}
                  onCheckedChange={setMaintenance}
                  disabled={!isAdmin}
                  aria-label="Maintenance Mode"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>API Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Connection to Supabase.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                  <Server className="w-4 h-4" /> Operational
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t bg-muted/20 px-6 py-4">
              <Button onClick={handleSystemSave} disabled={saving || !isAdmin}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save System Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
