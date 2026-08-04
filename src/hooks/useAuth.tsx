import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "teacher" | "school" | "admin" | "recruiter";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  // Which user id the current `role` value belongs to. Used so callers keep
  // seeing a loading state while the role for a newly signed-in user is
  // still being fetched, instead of briefly acting on a stale role.
  const [roleUserId, setRoleUserId] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRole = async (userId: string | undefined) => {
      if (!userId) {
        if (active) {
          setRole(null);
          setRoleUserId(null);
        }
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (!active) return;
      const roles = (data ?? []).map((r) => r.role as AppRole);
      setRole(
        roles.includes("admin")
          ? "admin"
          : roles.includes("recruiter")
            ? "recruiter"
            : roles.includes("school")
              ? "school"
              : roles.includes("teacher")
                ? "teacher"
                : null,
      );
      setRoleUserId(userId);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadRole(data.session?.user.id).finally(() => active && setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadRole(nextSession?.user.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const currentUserId = session?.user.id ?? null;
  const roleResolved = roleUserId === currentUserId;

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    role,
    loading: loading || !roleResolved,
    signOut: async () => {
      await supabase.auth.signOut();
      setRole(null);
      setRoleUserId(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export const dashboardPathForRole = (role: AppRole | null) =>
  role === "admin" || role === "recruiter" ? "/admin" : role === "school" ? "/school" : "/teacher";

/** Admins and recruiters share the Operations CRM. */
export const isStaffRole = (role: AppRole | null) => role === "admin" || role === "recruiter";
