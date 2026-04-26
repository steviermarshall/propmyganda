import { Link, useLocation, useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import pmgLogo from "@/assets/pmg-logo-clean.png";
import type { UserRole } from "@/integrations/supabase/types";

interface NavItem {
  label: string;
  path: string;
  roles: UserRole[];
  icon: string;
}

const NAV: NavItem[] = [
  { label: "Overview",     path: "/dashboard/admin",        roles: ["admin"],                  icon: "◈" },
  { label: "Distribution", path: "/dashboard/distribution", roles: ["admin", "distribution"],  icon: "◎" },
  { label: "Marketing",    path: "/dashboard/marketing",    roles: ["admin", "marketing"],     icon: "◐" },
  { label: "Sponsorships", path: "/dashboard/sponsorships", roles: ["admin", "sponsorships"],  icon: "◆" },
  { label: "Settings",     path: "/dashboard/settings",     roles: ["admin"],                  icon: "◇" },
];

export default function Sidebar() {
  const { role, isAdmin } = useRole();
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const visible = NAV.filter(
    (n) => isAdmin || (role && n.roles.includes(role))
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <aside className="w-56 shrink-0 border-r border-white/10 bg-black flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <Link to="/">
          <img src={pmgLogo} alt="PMG" className="h-6 w-auto" />
        </Link>
      </div>

      {/* Role badge */}
      <div className="px-6 py-3 border-b border-white/10">
        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-electric">
          {role ?? "—"}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visible.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-electric text-black"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10 space-y-3">
        <p className="text-[11px] text-white/40 truncate">{profile?.email}</p>
        <button
          onClick={handleSignOut}
          className="text-[11px] text-white/40 hover:text-white transition-colors uppercase tracking-wider"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
