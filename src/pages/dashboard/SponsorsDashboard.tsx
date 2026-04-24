import { useEffect, useState } from "react";
import DashLayout from "@/components/dashboard/DashLayout";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["sponsorship_leads"]["Row"];

const STAGES = ["new", "contacted", "proposal", "negotiating", "closed_won", "closed_lost"] as const;

const STAGE_STYLE: Record<string, string> = {
  new:          "border-white/20 text-white/60",
  contacted:    "border-blue-500/40 text-blue-400",
  proposal:     "border-yellow-500/40 text-yellow-400",
  negotiating:  "border-orange-500/40 text-orange-400",
  closed_won:   "border-green-500/40 text-green-400",
  closed_lost:  "border-red-500/40 text-red-400",
};

function fmt$$(n: number | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function SponsorsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("sponsorship_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setLeads((data ?? []) as Lead[]);
        setLoading(false);
      });
  }, []);

  async function moveStage(id: string, stage: Lead["stage"]) {
    await supabase.from("sponsorship_leads").update({ stage }).eq("id", id);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
  }

  const visible = filter === "all" ? leads : leads.filter((l) => l.stage === filter);
  const pipeline = leads.reduce((s, l) => s + (l.value_estimate ?? 0), 0);
  const won = leads.filter((l) => l.stage === "closed_won").reduce((s, l) => s + (l.value_estimate ?? 0), 0);

  return (
    <DashLayout title="Sponsorships">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-white/10 bg-white/[0.02] p-4">
            <p className="text-2xl font-display">{leads.length}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Total Leads</p>
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-4">
            <p className="text-2xl font-display">{leads.filter((l) => l.stage === "new").length}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">New</p>
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-4">
            <p className="text-2xl font-display text-electric">{fmt$$(pipeline)}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Pipeline Value</p>
          </div>
          <div className="border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-2xl font-display text-green-400">{fmt$$(won)}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Closed Won</p>
          </div>
        </div>

        {/* Stage filter */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {["all", ...STAGES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-wider whitespace-nowrap border transition-colors ${
                filter === s ? "border-electric text-electric bg-electric/5" : "border-white/10 text-white/40 hover:border-white/30 hover:text-white"
              }`}
            >
              {s.replace("_", " ")}
              <span className="ml-1.5 opacity-60">
                {s === "all" ? leads.length : leads.filter((l) => l.stage === s).length}
              </span>
            </button>
          ))}
        </div>

        {/* Leads list */}
        {loading && <div className="text-white/40 text-sm">Loading…</div>}

        {!loading && visible.length === 0 && (
          <p className="text-white/40 text-sm">No leads in this stage.</p>
        )}

        <div className="space-y-3">
          {visible.map((lead) => (
            <div key={lead.id} className="border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-sm uppercase tracking-wide">{lead.company_name}</p>
                  <p className="text-white/50 text-xs mt-0.5">{lead.contact_name} · {lead.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-1 border uppercase tracking-wider ${STAGE_STYLE[lead.stage]}`}>
                    {lead.stage.replace("_", " ")}
                  </span>
                  {lead.value_estimate && (
                    <p className="text-xs text-electric mt-1">{fmt$$(lead.value_estimate)}</p>
                  )}
                </div>
              </div>
              {lead.campaign_type && (
                <p className="text-white/40 text-xs">{lead.campaign_type} · {lead.budget_range ?? "Budget TBD"}</p>
              )}
              {lead.message && (
                <p className="text-white/60 text-sm border-l-2 border-white/10 pl-3 italic line-clamp-2">{lead.message}</p>
              )}
              {/* Stage advance */}
              <div className="flex gap-2 pt-1 flex-wrap">
                {STAGES.filter((s) => s !== lead.stage && s !== "closed_lost").map((s) => (
                  <button
                    key={s}
                    onClick={() => moveStage(lead.id, s)}
                    className={`text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${STAGE_STYLE[s]} hover:opacity-80`}
                  >
                    → {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashLayout>
  );
}
