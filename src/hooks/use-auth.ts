import type { Session, User } from "@supabase/supabase-js";
import type { Database, UserRole } from "@/integrations/supabase/types";
import { useAuthContext } from "./AuthProvider";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
}

/** Public-site auth. Reads from the shared AuthProvider — no per-consumer fetch. */
export function useAuth(): AuthState {
  const { session, user, profile, role, loading } = useAuthContext();
  return { session, user, profile, role, loading };
}
