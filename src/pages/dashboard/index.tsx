import { Navigate } from "react-router-dom";
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
    default:             return <Navigate to="/auth/login" replace />;
  }
}
