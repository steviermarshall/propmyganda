import { useCrmAuth } from "@/hooks/use-crm-auth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import pmgLogo from "@/assets/pmg-logo-clean.png";

export default function StevenDashboard() {
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
          <span className="text-[#d97000] text-xs tracking-[0.3em] uppercase font-bold">Steven's Dashboard</span>
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
              { label: "Pitches", value: "—", target: "10 tgt" },
              { label: "Brand", value: "—", target: "4 tgt" },
              { label: "Event", value: "—", target: "3 tgt" },
              { label: "Pub", value: "—", target: "3 tgt" },
              { label: "Orders", value: "—", target: "Shipped" },
            ].map((kpi) => (
              <div key={kpi.label} className="border border-white/10 bg-[#1a1a1a] p-4 space-y-1">
                <div className="text-4xl font-display text-[#d97000]">{kpi.value}</div>
                <div className="text-[10px] text-white/60 uppercase tracking-widest">{kpi.label}</div>
                {kpi.target && <div className="text-[9px] text-white/30">{kpi.target}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Follow-ups */}
        <section className="border border-white/10 bg-[#1a1a1a] p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">Follow-Ups Due Today</p>
          <p className="text-white/40 text-sm">No follow-ups due. You're clear.</p>
        </section>

        {/* Sponsor Pipeline */}
        <section className="border border-white/10 bg-[#1a1a1a] p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-2">Sponsor Pipeline</p>
          <p className="text-white/20 text-xs">Brand / Event / Publication kanban coming — Lovable builds this.</p>
        </section>

        {/* Store fulfillment */}
        <section className="border border-white/10 bg-[#1a1a1a] p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-2">Store Fulfillment Queue</p>
          <p className="text-white/20 text-xs">Order queue coming — Lovable builds this.</p>
        </section>
      </main>
    </div>
  );
}
