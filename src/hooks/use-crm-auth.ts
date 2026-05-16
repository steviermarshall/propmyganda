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
      if (data.session) fetchMember(data.session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) fetchMember(s.user.id);
      else {
        setMember(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchMember(userId: string) {
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("auth_user_id", userId)
      .single();
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
  switch (role) {
    case "admin":  return "/admin/stevie";
    case "mike":   return "/admin/mike";
    case "steven": return "/admin/steven";
    case "jay":    return "/admin/jay";
    default:       return "/auth/login";
  }
}
