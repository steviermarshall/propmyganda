import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { CrmRole, Database, UserRole } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  // Public-site auth (profiles)
  profile: Profile | null;
  role: UserRole | null;
  // CRM auth (team_members)
  member: TeamMember | null;
  crmRole: CrmRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single source of auth truth. Mounts one session listener and fetches the
 * profile + team_members rows once, instead of every ProtectedRoute, layout,
 * and dashboard doing its own getSession + fetch + listener.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function hydrate(s: Session | null) {
      if (!s) {
        if (!active) return;
        setProfile(null);
        setMember(null);
        setLoading(false);
        return;
      }
      const [profileData, memberData] = await Promise.all([
        fetchProfile(s.user.id),
        fetchMember(s),
      ]);
      if (!active) return;
      setProfile(profileData);
      setMember(memberData);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      hydrate(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      setLoading(true);
      hydrate(s);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    member,
    crmRole: (member?.role as CrmRole) ?? null,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within <AuthProvider>");
  return ctx;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data ?? null;
}

async function fetchMember(s: Session): Promise<TeamMember | null> {
  let { data } = await supabase
    .from("team_members")
    .select("*")
    .eq("auth_user_id", s.user.id)
    .maybeSingle();

  // Email-match fallback only for a VERIFIED email. Without this guard an
  // unconfirmed signup for e.g. mike@… could auto-claim Mike's CRM role.
  const emailVerified = !!(s.user.email_confirmed_at ?? (s.user as { confirmed_at?: string }).confirmed_at);
  if (!data && s.user.email && emailVerified) {
    const res = await supabase
      .from("team_members")
      .select("*")
      .eq("email", s.user.email)
      .maybeSingle();
    data = res.data;

    // Auto-link auth_user_id so future lookups are fast
    if (data) {
      await (supabase.from("team_members") as unknown as {
        update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<unknown> };
      })
        .update({ auth_user_id: s.user.id })
        .eq("id", (data as { id: string }).id);
    }
  }
  return data ?? null;
}
