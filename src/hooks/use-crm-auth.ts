import type { Session, User } from "@supabase/supabase-js";
import type { CrmRole, Database } from "@/integrations/supabase/types";
import { useAuthContext } from "./AuthProvider";

type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];

interface CrmAuthState {
  session: Session | null;
  user: User | null;
  member: TeamMember | null;
  crmRole: CrmRole | null;
  loading: boolean;
}

/** CRM auth. Reads from the shared AuthProvider — no per-consumer fetch. */
export function useCrmAuth(): CrmAuthState {
  const { session, user, member, crmRole, loading } = useAuthContext();
  return { session, user, member, crmRole, loading };
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
