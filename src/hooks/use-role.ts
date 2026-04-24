import type { UserRole } from "@/integrations/supabase/types";
import { useAuth } from "./use-auth";

export function useRole() {
  const { role, loading } = useAuth();

  return {
    role,
    loading,
    isAdmin: role === "admin",
    is: (r: UserRole | UserRole[]) =>
      Array.isArray(r) ? r.includes(role as UserRole) : role === r,
    canAccess: (allowed: UserRole[]) =>
      role !== null && allowed.includes(role),
  };
}
