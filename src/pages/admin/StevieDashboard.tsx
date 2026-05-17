import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import SharedCalendar from "@/components/crm/SharedCalendar";
import KpiCard from "@/components/crm/KpiCard";
import KanbanBoard from "@/components/crm/KanbanBoard";
import StatusDot from "@/components/crm/StatusDot";
import { startOfMonth, endOfMonth, startOfWeek, daysSince } from "@/lib/crm/dates";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { logActivity } from "@/lib/crm/activity";
import { toast } from "sonner";

const STEVIE = "#F5FF00";
const MRR_TARGET = 50000;

const LANES = [
  { key: "distro_jv",   label: "Distro JV",    target: 12000 },
  { key: "booking",     label: "Booking",      target: 11000 },
  { key: "media_agency", label: "Media Agency", target: 6700 },
  { key: "sponsorships", label: "Sponsorships", target: 8000 },
] as const;

const PIPELINE: { key: string; label: string }[] = [
  { key: "inquiry",       label: "Inquiry" },
  { key: "quoted",        label: "Quoted" },
  { key: "booked",        label: "Booked" },
  { key: "in_production", label: "In Production" },
  { key: "delivered",     label: "Delivered" },
  { key: "paid",          label: "Paid" },
];

export default function StevieDashboard() {
  const qc = useQueryClient();
  const { member } = useCrmAuth();

  const monthStart = startOfMonth().toISOString();
  const monthEnd = endOfMonth().toISOString();
  const weekStart = startOfWeek().toISOString();

  // MRR data
  const { data: mrr } = useQuery({
    queryKey: ["mrr", monthStart],
    queryFn: async () => {
      const [royalty, booking, media, sponsor] = await Promise.all([
        (supabase.from("royalty_payments") as any)
          .select("pmg_share").gte("period_month", monthStart).lt("period_month", monthEnd),
        (supabase.from("crm_bookings") as any)
          .select("amount_quoted,status,updated_at").eq("status", "paid")
          .gte("updated_at", monthStart).lt("updated_at", monthEnd),
        (supabase.from("media_agency_projects") as any)
          .select("amount,status,updated_at").eq("status", "paid")
          .gte("updated_at", monthStart).lt("updated_at", monthEnd),
        (supabase.from("sponsor_pipeline") as any)
          .select("closed_amount,stage,updated_at").eq("stage", "closed")
          .gte("updated_at", monthStart).lt("updated_at", monthEnd),
      ]);
      const sum = (rows: any[] | null, col: string) =>
        (rows ?? []).reduce((acc, r) => acc + Number(r[col] ?? 0), 0);
      return {
        distro_jv:    sum(royalty.data, "pmg_share"),
        booking:      sum(booking.data, "amount_quoted"),
        media_agency: sum(media.data, "amount"),
        sponsorships: sum(sponsor.data, "closed_amount"),
      };
    },
  });

  const total = mrr ? Object.values(mrr).reduce((a, b) => a + b, 0) : 0;
  const pct = Math.min(100, Math.round((total / MRR_TARGET) * 100));

  // Team KPIs — live compute from sources (snapshots optional)
  const { data: teamKpis } = useQuery({
    queryKey: ["teamKpis", weekStart],
    queryFn: async () => {
      const [bookings, sponsors, shoots] = await Promise.all([
        (supabase.from("crm_bookings") as any).select("id,status,updated_at").gte("updated_at", weekStart),
        (supabase.from("sponsor_pipeline") as any).select("id,stage,updated_at").gte("updated_at", weekStart),
        (supabase.from("shoots") as any).select("id,shoot_date").gte("shoot_date", weekStart.slice(0, 10)),
      ]);
      const bookedThisWeek = (bookings.data ?? []).filter((r: any) =>
        ["booked", "shot", "delivered", "paid"].includes(r.status)).length;
      const pitchesThisWeek = (sponsors.data ?? []).filter((r: any) =>
        ["pitched", "replied", "discovery_call", "proposal", "closed"].includes(r.stage)).length;
      const shootsThisWeek = (shoots.data ?? []).length;
      return [
        { name: "Mike",   color: "#00F0FF", metric: "Bookings closed",   actual: bookedThisWeek,   target: 3 },
        { name: "Steven", color: "#d97000", metric: "Sponsor pitches",   actual: pitchesThisWeek,  target: 10 },
        { name: "Jay",    color: "#b366ff", metric: "Shoots this week",  actual: shootsThisWeek,   target: 5 },
      ];
    },
  });

  // Media Agency pipeline
  const { data: maProjects = [] } = useQuery({
    queryKey: ["ma-projects"],
    queryFn: async () => {
      const { data } = await (supabase.from("media_agency_projects") as any)
        .select("*").neq("status", "dead").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  // JV signing queue
  const { data: jvQueue = [] } = useQuery({
    queryKey: ["jv-queue"],
    queryFn: async () => {
      const { data } = await (supabase.from("distro_artists") as any)
        .select("*").eq("side", "jv_owned").eq("onboarding_status", "docs_pending");
      return data ?? [];
    },
  });

  // Inbox — articles awaiting review
  const { data: reviewArticles = [] } = useQuery({
    queryKey: ["stevie-review"],
    queryFn: async () => {
      const { data } = await (supabase.from("articles") as any)
        .select("*").eq("status", "stevie_review");
      return data ?? [];
    },
  });

  async function moveMa(item: any, nextStage: string) {
    qc.setQueryData(["ma-projects"], (old: any[] = []) =>
      old.map((r) => (r.id === item.id ? { ...r, status: nextStage } : r)));
    const { error } = await (supabase.from("media_agency_projects") as any)
      .update({ status: nextStage }).eq("id", item.id);
    if (error) { toast.error("Move failed"); qc.invalidateQueries({ queryKey: ["ma-projects"] }); return; }
    await logActivity(member?.id, "media_agency_project", item.id, "status_changed", { from: item.status, to: nextStage });
  }

  async function approveJv(id: string) {
    qc.setQueryData(["jv-queue"], (old: any[] = []) => old.filter((r) => r.id !== id));
    const { error } = await (supabase.from("distro_artists") as any)
      .update({ onboarding_status: "docs_signed" }).eq("id", id);
    if (error) { toast.error("Failed"); qc.invalidateQueries({ queryKey: ["jv-queue"] }); return; }
    await logActivity(member?.id, "distro_artist", id, "status_changed", { to: "docs_signed" });
    toast.success("Approved");
  }

  async function reviewArticle(id: string, action: "approved" | "ai_drafted") {
    qc.setQueryData(["stevie-review"], (old: any[] = []) => old.filter((r) => r.id !== id));
    const { error } = await (supabase.from("articles") as any)
      .update({ status: action, approved_by: action === "approved" ? member?.id : null }).eq("id", id);
    if (error) { toast.error("Failed"); qc.invalidateQueries({ queryKey: ["stevie-review"] }); return; }
    await logActivity(member?.id, "article", id, "status_changed", { to: action });
    toast.success(action === "approved" ? "Approved" : "Rejected");
  }

  return (
    <CrmLayout title="CEO Dashboard" accent={STEVIE} quickAdd="booking">
      {/* Full-view nav */}
      <nav className="flex flex-wrap gap-2 border border-white/10 bg-crm-surface p-3">
        {[
          { to: "/admin/mike",   label: "Mike — Bookings",      color: "#00F0FF" },
          { to: "/admin/steven", label: "Steven — Sponsors",    color: "#d97000" },
          { to: "/admin/jay",    label: "Jay — Production",     color: "#b366ff" },
          { to: "/admin/editor", label: "Editors",              color: "#7CFFB2" },
          { to: "/admin/reports/deliverables", label: "Reports → Deliverables", color: STEVIE },
          { to: "/dashboard/admin",        label: "Site · Overview",     color: "#ffffff" },
          { to: "/dashboard/distribution", label: "Site · Distribution", color: "#ffffff" },
          { to: "/dashboard/marketing",    label: "Site · Marketing",    color: "#ffffff" },
          { to: "/dashboard/sponsorships", label: "Site · Sponsorships", color: "#ffffff" },
        ].map((l) => (
          <a key={l.to} href={l.to}
            className="text-[10px] uppercase tracking-widest font-bold px-3 py-2 border border-white/10 hover:bg-white/5 transition-colors"
            style={{ color: l.color }}>
            {l.label}
          </a>
        ))}
      </nav>

      {/* MRR */}
      <section className="border border-white/10 bg-crm-surface p-6">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">
          This Month's MRR vs ${MRR_TARGET.toLocaleString()} Target
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/40">
            <span>$0</span>
            <span>${MRR_TARGET.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-white/5">
            <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: STEVIE }} />
          </div>
          <div className="text-2xl font-display" style={{ color: STEVIE }}>
            ${total.toLocaleString()} <span className="text-white/20 text-sm">/ ${MRR_TARGET.toLocaleString()}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {LANES.map((lane) => (
            <div key={lane.key} className="border border-white/10 bg-black/40 p-3">
              <div className="text-xl font-display" style={{ color: STEVIE }}>
                ${(mrr?.[lane.key] ?? 0).toLocaleString()}
              </div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest">{lane.label}</div>
              <div className="text-[9px] text-white/20">tgt ${lane.target.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Team KPI grid */}
      <section className="border border-white/10 bg-crm-surface p-6">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">Team KPI Grid — This Week</p>
        <div className="space-y-2">
          {(teamKpis ?? []).map((p) => (
            <div key={p.name} className="flex items-center justify-between border border-white/5 bg-black/30 px-4 py-3">
              <span className="text-sm font-bold uppercase tracking-widest" style={{ color: p.color }}>{p.name}</span>
              <span className="text-[10px] text-white/40">{p.metric}</span>
              <span className="flex items-center gap-2 text-white/70 text-xs font-mono">
                <StatusDot actual={p.actual} target={p.target} />
                {p.actual} / {p.target}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Media Agency Pipeline */}
      <section>
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">Media Agency Pipeline</p>
        <KanbanBoard
          accent={STEVIE}
          columns={PIPELINE}
          items={maProjects.map((p: any) => ({
            id: p.id, stage: p.status, updatedAt: p.updated_at, raw: p,
          }))}
          onMove={(it: any, next) => moveMa(it.raw, next)}
          renderCard={(it: any) => (
            <div className="space-y-1">
              <div className="text-sm font-bold">{it.raw.artist_name}</div>
              <div className="text-[10px] text-white/40">
                {it.raw.tier ?? "—"} · ${Number(it.raw.amount ?? 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-white/30">{daysSince(it.raw.updated_at)}d ago</div>
            </div>
          )}
        />
      </section>

      {/* JV Signing Queue */}
      <section className="border border-white/10 bg-crm-surface p-6">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">UM JV — Awaiting Signature</p>
        {jvQueue.length === 0 ? (
          <p className="text-white/40 text-sm">Nothing pending.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {jvQueue.map((a: any) => (
              <div key={a.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm">{a.artist_name}</div>
                  <div className="text-[10px] text-white/40">{a.pmg_share_percent ?? "—"}% share</div>
                </div>
                <button
                  onClick={() => approveJv(a.id)}
                  className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold bg-electric text-black"
                >
                  Mark Signed
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Inbox */}
      <section className="border border-white/10 bg-crm-surface p-6">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">Inbox — Articles Awaiting You</p>
        {reviewArticles.length === 0 ? (
          <p className="text-white/40 text-sm">Inbox zero.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {reviewArticles.map((a: any) => (
              <div key={a.id} className="py-2 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{a.title}</div>
                  <div className="text-[10px] text-white/40">{daysSince(a.updated_at)}d in review</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => reviewArticle(a.id, "approved")}
                    className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold bg-electric text-black">
                    Approve
                  </button>
                  <button onClick={() => reviewArticle(a.id, "ai_drafted")}
                    className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold border border-white/20 text-white/70">
                    Send Back
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </CrmLayout>
  );
}
