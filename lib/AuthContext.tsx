"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { watchAuthState, fetchAppUser, AccountDeactivatedError } from "./auth";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import type { AppUser } from "@/types/user";
import { FullPageSpinner } from "@/components/ui/Spinner";
import toast from "react-hot-toast";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Guards every /dashboard/* route client-side: resolves the Firebase Auth
 * user, loads the matching /users/{uid} doc, and re-checks `active` on
 * every auth-state change (not just at login) — an admin can deactivate a
 * staff member mid-session and this will sign them out on their next
 * navigation. middleware.ts handles the pre-render redirect; this is the
 * real authorization check.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = watchAuthState(async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        router.replace("/auth/login");
        return;
      }

      const appUser = await fetchAppUser(fbUser.uid);
      if (!appUser || !appUser.active) {
        await signOut(auth);
        document.cookie = "pl_session=; path=/; max-age=0";
        toast.error(
          appUser
            ? new AccountDeactivatedError().message
            : "No staff profile found. Contact your administrator."
        );
        setUser(null);
        setLoading(false);
        router.replace("/auth/login");
        return;
      }

      setUser(appUser);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (loading) return <FullPageSpinner />;

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}
