import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { CrmRole, Database } from "@/integrations/supabase/types";

type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];

interface CrmAuthState {
  session: Session | null;
  user: User | null;
  member: TeamMember | null;
  crmRole: CrmRole | null;
  loading: boolean;
}

export function useCrmAuth(): CrmAuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) fetchMember(data.session);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) fetchMember(s);
      else {
        setMember(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchMember(s: Session) {
    // Try auth_user_id first, fall back to email match
    let { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("auth_user_id", s.user.id)
      .maybeSingle();

    // Email-match fallback only for a VERIFIED email. Without this guard an
    // unconfirmed signup for e.g. mike@… could auto-claim Mike's CRM role.
    const emailVerified = !!(s.user.email_confirmed_at ?? (s.user as any).confirmed_at);
    if (!data && s.user.email && emailVerified) {
      const res = await supabase
        .from("team_members")
        .select("*")
        .eq("email", s.user.email)
        .maybeSingle();
      data = res.data;

      // Auto-link auth_user_id so future lookups are fast
      if (data) {
        await (supabase.from("team_members") as any)
          .update({ auth_user_id: s.user.id })
          .eq("id", (data as { id: string }).id);
      }
    }

    setMember(data ?? null);
    setLoading(false);
  }

  return {
    session,
    user: session?.user ?? null,
    member,
    crmRole: (member?.role as CrmRole) ?? null,
    loading,
  };
}

export function crmRoleToDashboardPath(role: CrmRole | null): string {
  switch (role as string | null) {
    case "admin":  return "/admin/stevie";
    case "mike":   return "/admin/mike";
    case "steven": return "/admin/steven";
    case "jay":    return "/admin/jay";
    case "editor": return "/admin/editor";
    default:       return "/auth/login";
  }
}
