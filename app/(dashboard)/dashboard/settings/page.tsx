"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [reorderThreshold, setReorderThreshold] = useState(20);
  const [expiryWindowDays, setExpiryWindowDays] = useState(30);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [thresholdsLoaded, setThresholdsLoaded] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) setName(user.displayName);
  }, [user]);

  useEffect(() => {
    getDoc(doc(db, "settings", "global")).then((snap) => {
      if (snap.exists()) {
        setReorderThreshold(snap.data().defaultReorderThreshold ?? 20);
        setExpiryWindowDays(snap.data().expiryWarningWindowDays ?? 30);
      }
      setThresholdsLoaded(true);
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { displayName: name });
      toast.success("Profile updated.");
    } catch {
      toast.error("Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveThresholds(e: React.FormEvent) {
    e.preventDefault();
    setSavingThresholds(true);
    try {
      await setDoc(doc(db, "settings", "global"), {
        defaultReorderThreshold: reorderThreshold,
        expiryWarningWindowDays: expiryWindowDays,
      }, { merge: true });
      toast.success("Alert thresholds updated.");
    } catch {
      toast.error("Could not update thresholds.");
    } finally {
      setSavingThresholds(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser?.email) return;
    setChangingPassword(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPassword);
      toast.success("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      toast.error("Could not change password. Check your current password.");
    } finally {
      setChangingPassword(false);
    }
  }

  if (!user || !thresholdsLoaded) return <FullPageSpinner />;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="text-xl font-bold text-text-primary">Settings</h1>

      <Card>
        <p className="mb-3 text-sm font-semibold text-text-primary">Profile</p>
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={user.email} disabled className="opacity-60" />
          <Button type="submit" loading={savingProfile} className="w-fit">Save</Button>
        </form>
      </Card>

      {user.role === "admin" && (
        <Card>
          <p className="mb-3 text-sm font-semibold text-text-primary">Alert Thresholds</p>
          <form onSubmit={saveThresholds} className="flex flex-col gap-4">
            <Input label="Default Reorder Threshold (applied to new drugs)" type="number" min={0} value={reorderThreshold} onChange={(e) => setReorderThreshold(Number(e.target.value))} />
            <Input label="Expiry Warning Window (days)" type="number" min={1} value={expiryWindowDays} onChange={(e) => setExpiryWindowDays(Number(e.target.value))} />
            <Button type="submit" loading={savingThresholds} className="w-fit">Save</Button>
          </form>
        </Card>
      )}

      <Card>
        <p className="mb-3 text-sm font-semibold text-text-primary">Change Password</p>
        <form onSubmit={changePassword} className="flex flex-col gap-4">
          <Input label="Current Password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <Input label="New Password" type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Button type="submit" loading={changingPassword} className="w-fit">Change Password</Button>
        </form>
      </Card>
    </div>
  );
}
