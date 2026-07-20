import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { useCrmAuth, crmRoleToDashboardPath } from "@/hooks/use-crm-auth";

export default function DashboardRoot() {
  const { crmRole, loading: crmLoading } = useCrmAuth();
  const { role, loading: roleLoading } = useRole();

  if (crmLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // CRM team members go to their CRM dashboard
  if (crmRole) return <Navigate to={crmRoleToDashboardPath(crmRole)} replace />;

  // Fall back to old public-site dashboard routing
  switch (role) {
    case "admin":        return <Navigate to="/dashboard/admin" replace />;
    case "distribution": return <Navigate to="/dashboard/distribution" replace />;
    case "marketing":    return <Navigate to="/dashboard/marketing" replace />;
    case "sponsorships": return <Navigate to="/dashboard/sponsorships" replace />;
  }

  // Authenticated but no role assigned. Do NOT redirect to /auth/login — the
  // login page bounces active sessions back here, which would infinite-loop.
  // Show a clear "pending access" screen instead.
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-white text-lg font-bold uppercase tracking-widest">No access yet</h1>
        <p className="text-white/50 text-sm">
          Your account is signed in but hasn't been assigned a role. An admin needs to
          link your account before you can view a dashboard.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-[11px] uppercase tracking-widest text-white/40 hover:text-white border border-white/10 px-4 py-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
