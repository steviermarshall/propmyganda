import { Navigate } from "react-router-dom";
import { useCrmAuth } from "@/hooks/use-crm-auth";

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function CrmProtectedRoute({ children, allowedRoles }: Props) {
  const { session, crmRole, loading } = useCrmAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth/login" replace />;

  // Fail closed: a required role that is missing or unmatched is denied.
  if (allowedRoles && (!crmRole || !allowedRoles.includes(crmRole as string))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
