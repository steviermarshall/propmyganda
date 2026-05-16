import { useCrmAuth } from "@/hooks/use-crm-auth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import pmgLogo from "@/assets/pmg-logo-clean.png";

export default function StevieDashboard() {
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
          <span className="text-[#F5FF00] text-xs tracking-[0.3em] uppercase font-bold">CEO Dashboard</span>
        </div>
        <button onClick={handleSignOut} className="text-xs text-white/30 hover:text-white/70 transition-colors uppercase tracking-widest">
          Sign Out
        </button>
      </header>

      <main className="px-6 py-8 space-y-8">
        {/* MRR Bar */}
        <section className="border border-white/10 bg-[#1a1a1a] p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">This Month's MRR vs $50K Target</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/40">
              <span>$0</span>
              <span>$50,000</span>
            </div>
            <div className="h-3 bg-white/5 rounded-none">
              <div className="h-full bg-[#F5FF00]" style={{ width: "0%" }} />
            </div>
            <div className="text-2xl font-display text-[#F5FF00]">$0 <span className="text-white/20 text-sm">/ $50,000</span></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: "Distro JV", target: "$12K" },
              { label: "Booking", target: "$11K" },
              { label: "Media Agency", target: "$6.7K" },
              { label: "Sponsorships", target: "$8K" },
            ].map((lane) => (
              <div key={lane.label} className="border border-white/10 bg-black/40 p-3">
                <div className="text-xl font-display text-[#F5FF00]">$0</div>
                <div className="text-[9px] text-white/40 uppercase tracking-widest">{lane.label}</div>
                <div className="text-[9px] text-white/20">tgt {lane.target}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Team KPI Grid */}
        <section className="border border-white/10 bg-[#1a1a1a] p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">Team KPI Grid — This Week</p>
          <div className="space-y-3">
            {[
              { name: "Mike", color: "#00F0FF", metrics: "Bookings / Outreach / Distro / Articles" },
              { name: "Steven", color: "#d97000", metrics: "Pitches / Discovery Calls / Orders" },
              { name: "Jay", color: "#b366ff", metrics: "Shoots / Deliverables / SLA" },
            ].map((person) => (
              <div key={person.name} className="flex items-center justify-between border border-white/5 bg-black/30 px-4 py-3">
                <span className="text-sm font-bold uppercase tracking-widest" style={{ color: person.color }}>
                  {person.name}
                </span>
                <span className="text-[10px] text-white/20">{person.metrics}</span>
                <span className="text-white/20 text-xs">— / —</span>
              </div>
            ))}
          </div>
        </section>

        {/* Inbox */}
        <section className="border border-white/10 bg-[#1a1a1a] p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">Inbox — Needs Your Eyes</p>
          <p className="text-white/40 text-sm">Nothing pending. All clear.</p>
        </section>

        {/* Media Agency Pipeline + Newsletter */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-white/10 bg-[#1a1a1a] p-6">
            <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-2">Media Agency Pipeline</p>
            <p className="text-white/20 text-xs">Pipeline kanban coming — Lovable builds this.</p>
          </div>
          <div className="border border-white/10 bg-[#1a1a1a] p-6">
            <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-2">Newsletter</p>
            <p className="text-white/20 text-xs">Composer + archive coming — Lovable builds this.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
