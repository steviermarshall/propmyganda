import { useCrmAuth } from "@/hooks/use-crm-auth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import pmgLogo from "@/assets/pmg-logo-clean.png";

export default function MikeDashboard() {
  const { member } = useCrmAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/auth/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={pmgLogo} alt="PMG" className="h-6 w-auto" />
          <span className="text-[#00F0FF] text-xs tracking-[0.3em] uppercase font-bold">Mike's Dashboard</span>
        </div>
        <button onClick={handleSignOut} className="text-xs text-white/30 hover:text-white/70 transition-colors uppercase tracking-widest">
          Sign Out
        </button>
      </header>

      <main className="px-6 py-8 space-y-8">
        {/* KPI Row */}
        <section>
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">This Week</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Booked", value: "—", target: "3 tgt" },
              { label: "Outreach", value: "—", target: "10 tgt" },
              { label: "Distro", value: "—", target: "2 tgt" },
              { label: "Articles", value: "—", target: "1 tgt" },
              { label: "Revenue", value: "—", target: "" },
            ].map((kpi) => (
              <div key={kpi.label} className="border border-white/10 bg-[#1a1a1a] p-4 space-y-1">
                <div className="text-4xl font-display text-[#00F0FF]">{kpi.value}</div>
                <div className="text-[10px] text-white/60 uppercase tracking-widest">{kpi.label}</div>
                {kpi.target && <div className="text-[9px] text-white/30">{kpi.target}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Today */}
        <section className="border border-white/10 bg-[#1a1a1a] p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">Today</p>
          <p className="text-white/40 text-sm">No follow-ups due. You're clear.</p>
        </section>

        {/* Bookings Pipeline placeholder */}
        <section className="border border-white/10 bg-[#1a1a1a] p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-2">Bookings Pipeline</p>
          <p className="text-white/20 text-xs">Kanban coming — Lovable builds this.</p>
        </section>

        {/* Outreach + Distro */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-white/10 bg-[#1a1a1a] p-6">
            <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-2">Artist Outreach</p>
            <p className="text-white/20 text-xs">Prospect list coming — Lovable builds this.</p>
          </div>
          <div className="border border-white/10 bg-[#1a1a1a] p-6">
            <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-2">Distro Onboards</p>
            <p className="text-white/20 text-xs">Onboarding queue coming — Lovable builds this.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
