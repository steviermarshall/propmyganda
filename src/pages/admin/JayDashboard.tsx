import { useCrmAuth } from "@/hooks/use-crm-auth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import pmgLogo from "@/assets/pmg-logo-clean.png";

export default function JayDashboard() {
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
          <span className="text-[#b366ff] text-xs tracking-[0.3em] uppercase font-bold">Jay's Dashboard</span>
        </div>
        <button onClick={handleSignOut} className="text-xs text-white/30 hover:text-white/70 transition-colors uppercase tracking-widest">
          Sign Out
        </button>
      </header>

      <main className="px-6 py-8 space-y-8">
        {/* KPI Row */}
        <section>
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">This Week</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Shoots", value: "—", target: "5 tgt" },
              { label: "Deliverables", value: "—", target: "20 tgt" },
              { label: "Avg SLA", value: "—h", target: "<72h" },
              { label: "BTS", value: "—", target: "5 tgt" },
            ].map((kpi) => (
              <div key={kpi.label} className="border border-white/10 bg-[#1a1a1a] p-4 space-y-1">
                <div className="text-4xl font-display text-[#b366ff]">{kpi.value}</div>
                <div className="text-[10px] text-white/60 uppercase tracking-widest">{kpi.label}</div>
                {kpi.target && <div className="text-[9px] text-white/30">{kpi.target}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Shoot Calendar */}
        <section className="border border-white/10 bg-[#1a1a1a] p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-2">Shoot Calendar (Wed–Sat)</p>
          <p className="text-white/20 text-xs">Calendar view coming — Lovable builds this.</p>
        </section>

        {/* Deliverable Tracker */}
        <section className="border border-white/10 bg-[#1a1a1a] p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-2">Deliverable Tracker</p>
          <p className="text-white/20 text-xs">Per-shoot deliverable status coming — Lovable builds this.</p>
        </section>

        {/* Upload Queue */}
        <section className="border border-white/10 bg-[#1a1a1a] p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-2">Upload Queue</p>
          <p className="text-white/20 text-xs">Ready-to-publish pieces coming — Lovable builds this.</p>
        </section>
      </main>
    </div>
  );
}
