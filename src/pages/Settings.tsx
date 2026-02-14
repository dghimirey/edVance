import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Lock, School, Sun, Moon } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { user, profile, role, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // School settings (admin only)
  const [schoolName, setSchoolName] = useState("");
  const [schoolLoading, setSchoolLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setDob(profile.date_of_birth || "");
    }
  }, [profile]);

  useEffect(() => {
    if (role === "admin") {
      supabase.from("school_settings").select("school_name").limit(1).single().then(({ data }) => {
        if (data) setSchoolName(data.school_name);
      });
    }
  }, [role]);

  const updateProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      phone,
      address,
      date_of_birth: dob || null,
    }).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else { toast.success("Profile updated"); refreshProfile(); }
    setProfileLoading(false);
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); setConfirmPassword(""); }
    setPasswordLoading(false);
  };

  const updateSchoolName = async () => {
    setSchoolLoading(true);
    const { error } = await supabase.from("school_settings").update({ school_name: schoolName }).neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) toast.error(error.message);
    else toast.success("School name updated");
    setSchoolLoading(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+977 9863566571" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <Button onClick={updateProfile} disabled={profileLoading}>
            {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Change Password</CardTitle>
          <CardDescription>Set a new password for your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button onClick={updatePassword} disabled={passwordLoading}>
            {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
          </Button>
        </CardContent>
      </Card>

      {/* School Name (Admin only) */}
      {role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><School className="h-4 w-4" />School Settings</CardTitle>
            <CardDescription>Manage your school information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>School Name</Label>
              <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
            </div>
            <Button onClick={updateSchoolName} disabled={schoolLoading}>
              {schoolLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save School Name"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Appearance
          </CardTitle>
          <CardDescription>Toggle between light and dark mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Dark Mode</Label>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
