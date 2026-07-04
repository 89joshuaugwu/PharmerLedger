"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { StaffManagementTable } from "@/components/organisms/StaffManagementTable";
import { authedFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/AuthContext";
import type { AppUser } from "@/types/user";

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<AppUser[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", tempPassword: "", role: "attendant" as "admin" | "attendant" });

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      toast.error("Staff management is admin-only.");
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "users"), orderBy("createdAt", "asc")), (snap) => {
      setStaff(snap.docs.map((d) => ({
        uid: d.id, email: d.data().email, displayName: d.data().displayName,
        role: d.data().role, active: d.data().active,
        createdAt: d.data().createdAt?.toMillis?.() ?? 0,
      })));
    });
    return () => unsub();
  }, []);

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authedFetch("/api/users/create", { method: "POST", body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create staff account.");
      toast.success(`Staff account created. Share the temporary password with ${form.name} out-of-band.`);
      setModalOpen(false);
      setForm({ name: "", email: "", tempPassword: "", role: "attendant" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  if (user?.role !== "admin") return null;
  if (!staff) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Staff</h1>
        <Button onClick={() => setModalOpen(true)}>+ Add Staff</Button>
      </div>
      <StaffManagementTable staff={staff} currentUid={user.uid} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Staff">
        <form onSubmit={handleAddStaff} className="flex flex-col gap-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Temporary Password" required minLength={6} value={form.tempPassword} onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "attendant" })}
            options={[{ value: "attendant", label: "Attendant" }, { value: "admin", label: "Admin" }]} />
          <p className="text-xs text-text-secondary">
            Share the temporary password with {form.name || "the new staff member"} directly (WhatsApp/in person) — not by email.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
