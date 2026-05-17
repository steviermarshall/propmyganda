import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import SharedCalendar from "@/components/crm/SharedCalendar";
import BookingSheet from "@/components/BookingSheet";
import KpiCard from "@/components/crm/KpiCard";
import KanbanBoard from "@/components/crm/KanbanBoard";
import InlineSelect from "@/components/crm/InlineSelect";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { startOfWeek, addDaysISO, todayISO, daysSince } from "@/lib/crm/dates";
import { logActivity } from "@/lib/crm/activity";
import { pushToGcal } from "@/lib/crm/gcal";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DistroIntakeWizard from "@/components/crm/DistroIntakeWizard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MIKE = "#00F0FF";

const BOOKING_COLS = [
  { key: "inquiry",   label: "Inquiry" },
  { key: "quoted",    label: "Quoted" },
  { key: "booked",    label: "Booked" },
  { key: "shot",      label: "Shot" },
  { key: "delivered", label: "Delivered" },
  { key: "paid",      label: "Paid" },
  { key: "dead",      label: "Dead" },
];

const PROSPECT_STATUSES = [
  { value: "cold",            label: "Cold" },
  { value: "pitched",         label: "Pitched" },
  { value: "replied",         label: "Replied" },
  { value: "discovery_call",  label: "Discovery" },
  { value: "closed",          label: "Closed" },
  { value: "dead",            label: "Dead" },
];

const PROSPECT_FOLLOWUP: Record<string, number | null> = {
  pitched: 3, replied: 2, discovery_call: 7,
  cold: null, closed: null, dead: null,
};

const DISTRO_STATUSES = [
  { value: "intake",        label: "Intake" },
  { value: "docs_pending",  label: "Docs Pending" },
  { value: "docs_signed",   label: "Docs Signed" },
  { value: "live",          label: "Live" },
  { value: "churned",       label: "Churned" },
];

export default function MikeDashboard() {
  const qc = useQueryClient();
  const { member } = useCrmAuth();
  const weekStart = startOfWeek().toISOString();
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [manageArtist, setManageArtist] = useState<any | null>(null);

  // KPIs
  const { data: kpis } = useQuery({
    queryKey: ["mike-kpis", weekStart],
    queryFn: async () => {
      const [bookings, prospects, distro, articles, paid] = await Promise.all([
        (supabase.from("crm_bookings") as any).select("status,updated_at,amount_quoted").gte("updated_at", weekStart),
        (supabase.from("activity_log") as any).select("id,entity_type,action,payload,created_at")
          .eq("entity_type", "artist_prospect").gte("created_at", weekStart),
        (supabase.from("distro_artists") as any).select("onboarding_status,onboarded_at").gte("onboarded_at", weekStart),
        (supabase.from("articles") as any).select("status,created_at").gte("created_at", weekStart),
        (supabase.from("crm_bookings") as any).select("amount_quoted,status,updated_at").eq("status", "paid").gte("updated_at", weekStart),
      ]);
      const bookingsClosed = (bookings.data ?? []).filter((b: any) =>
        ["paid", "delivered"].includes(b.status)).length;
      const outreach = (prospects.data ?? []).filter((a: any) =>
        a.action === "status_changed" && (a.payload as any)?.to === "pitched").length;
      const onboarded = (distro.data ?? []).filter((d: any) => d.onboarding_status === "live").length;
      const articlesWritten = (articles.data ?? []).filter((a: any) => a.status !== "ai_drafted").length;
      const revenue = (paid.data ?? []).reduce((acc: number, r: any) => acc + Number(r.amount_quoted ?? 0), 0);
      return { bookingsClosed, outreach, onboarded, articlesWritten, revenue };
    },
  });

  // Today
  const today = todayISO();
  const { data: todayList = [] } = useQuery({
    queryKey: ["mike-today", today, member?.id],
    enabled: !!member,
    queryFn: async () => {
      const [pros, spons] = await Promise.all([
        (supabase.from("artist_prospects") as any).select("id,name,outreach_status,last_contact_date,next_followup_date")
          .eq("assigned_to", member!.id).eq("next_followup_date", today),
        (supabase.from("sponsor_pipeline") as any).select("id,brand_name,stage,last_contact_date,next_followup_date")
          .eq("assigned_to", member!.id).eq("next_followup_date", today),
      ]);
      return [
        ...(pros.data ?? []).map((r: any) => ({ ...r, kind: "prospect", display: r.name, sub: r.outreach_status })),
        ...(spons.data ?? []).map((r: any) => ({ ...r, kind: "sponsor",  display: r.brand_name, sub: r.stage })),
      ];
    },
  });

  // Bookings kanban
  const { data: bookings = [] } = useQuery({
    queryKey: ["mike-bookings"],
    queryFn: async () => {
      const { data } = await (supabase.from("crm_bookings") as any)
        .select("*").order("updated_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  // Prospects
  const { data: prospects = [] } = useQuery({
    queryKey: ["mike-prospects"],
    queryFn: async () => {
      const { data } = await (supabase.from("artist_prospects") as any)
        .select("*").order("fit_score", { ascending: false, nullsFirst: false }).limit(100);
      return data ?? [];
    },
  });

  // Distro
  const { data: distroArtists = [] } = useQuery({
    queryKey: ["mike-distro"],
    queryFn: async () => {
      const { data } = await (supabase.from("distro_artists") as any)
        .select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const distroIds = distroArtists.map((d: any) => d.id);

  const { data: streaming = [] } = useQuery({
    queryKey: ["mike-streaming", distroIds.join(",")],
    enabled: distroIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("streaming_metrics") as any)
        .select("*").in("distro_artist_id", distroIds);
      return data ?? [];
    },
  });


  async function moveBooking(item: any, next: string) {
    qc.setQueryData(["mike-bookings"], (old: any[] = []) =>
      old.map((r) => (r.id === item.id ? { ...r, status: next } : r)));
    const { error } = await (supabase.from("crm_bookings") as any).update({ status: next }).eq("id", item.id);
    if (error) { toast.error("Move failed"); qc.invalidateQueries({ queryKey: ["mike-bookings"] }); return; }
    await logActivity(member?.id, "crm_booking", item.id, "status_changed", { from: item.status, to: next });
    if (["booked", "shot", "delivered", "paid"].includes(next)) {
      pushToGcal("crm_booking", item.id);
    }
  }

  async function updateProspectStatus(id: string, next: string, current: string) {
    const days = PROSPECT_FOLLOWUP[next];
    const patch: any = { outreach_status: next, last_contact_date: todayISO() };
    if (days !== null) patch.next_followup_date = addDaysISO(days);
    qc.setQueryData(["mike-prospects"], (old: any[] = []) =>
      old.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await (supabase.from("artist_prospects") as any).update(patch).eq("id", id);
    if (error) { toast.error("Update failed"); qc.invalidateQueries({ queryKey: ["mike-prospects"] }); return; }
    await logActivity(member?.id, "artist_prospect", id, "status_changed", { from: current, to: next });
  }

  async function updateDistroStatus(id: string, next: string) {
    qc.setQueryData(["mike-distro"], (old: any[] = []) =>
      old.map((r) => (r.id === id ? { ...r, onboarding_status: next } : r)));
    const { error } = await (supabase.from("distro_artists") as any).update({ onboarding_status: next }).eq("id", id);
    if (error) { toast.error("Update failed"); qc.invalidateQueries({ queryKey: ["mike-distro"] }); return; }
    await logActivity(member?.id, "distro_artist", id, "status_changed", { to: next });
  }

  async function tapTodayItem(it: any) {
    // bump follow-up by 3 days, set last_contact_date = today
    const patch = { last_contact_date: todayISO(), next_followup_date: addDaysISO(3) };
    const table = it.kind === "prospect" ? "artist_prospects" : "sponsor_pipeline";
    qc.setQueryData(["mike-today", today, member?.id], (old: any[] = []) =>
      old.filter((r) => r.id !== it.id));
    const { error } = await (supabase.from(table) as any).update(patch).eq("id", it.id);
    if (error) { toast.error("Failed"); qc.invalidateQueries({ queryKey: ["mike-today"] }); return; }
    await logActivity(member?.id, it.kind === "prospect" ? "artist_prospect" : "sponsor_pipeline", it.id, "contacted", patch);
    toast.success("Marked contacted");
  }

  const [jvDistroOpen, setJvDistroOpen] = useState<null | "jv" | "distro">(null);

  return (
    <CrmLayout title="Mike's Dashboard" accent={MIKE} quickAdd="booking">
      <SharedCalendar accent={MIKE} />

      <section className="flex flex-wrap gap-2">
        <button
          onClick={() => setJvDistroOpen("jv")}
          className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-black"
          style={{ backgroundColor: MIKE }}
        >
          + JV Opportunity
        </button>
        <button
          onClick={() => setJvDistroOpen("distro")}
          className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold border border-white/20 text-white hover:border-white/60"
        >
          + Distro Opportunity
        </button>
      </section>

      <BookingSheet
        open={jvDistroOpen !== null}
        onOpenChange={(v) => !v && setJvDistroOpen(null)}
        initialService={jvDistroOpen ?? undefined}
        servicesAllowed={["jv", "distro"]}
      />

      {/* KPIs */}
      <section>
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">This Week</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Bookings closed" value={kpis?.bookingsClosed ?? "—"} target="3 tgt" accent={MIKE} />
          <KpiCard label="Cold outreach"   value={kpis?.outreach ?? "—"}       target="10 tgt" accent={MIKE} />
          <KpiCard label="Distro onboarded" value={kpis?.onboarded ?? "—"}     target="2 tgt"  accent={MIKE} />
          <KpiCard label="Articles"        value={kpis?.articlesWritten ?? "—"} target="1 tgt" accent={MIKE} />
          <KpiCard label="Revenue"         value={`$${(kpis?.revenue ?? 0).toLocaleString()}`} accent={MIKE} />
        </div>
      </section>

      {/* Today */}
      <section className="border border-white/10 bg-crm-surface p-6">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">Today — Follow-ups</p>
        {todayList.length === 0 ? (
          <p className="text-white/40 text-sm">Nothing due. You're clear.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {todayList.map((it: any) => (
              <div key={`${it.kind}-${it.id}`} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm">{it.display}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest">
                    {it.kind} · {it.sub} · {daysSince(it.last_contact_date)}d since last
                  </div>
                </div>
                <button onClick={() => tapTodayItem(it)}
                  className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold bg-mike text-black">
                  Contacted
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bookings Pipeline */}
      <section>
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">Bookings Pipeline</p>
        <KanbanBoard
          accent={MIKE}
          columns={BOOKING_COLS}
          items={bookings.map((b: any) => ({ id: b.id, stage: b.status, updatedAt: b.updated_at, raw: b }))}
          onMove={(it: any, next) => moveBooking(it.raw, next)}
          renderCard={(it: any) => (
            <div className="space-y-1">
              <div className="text-sm font-bold">{it.raw.artist_name}</div>
              <div className="text-[10px] text-white/40">
                Pkg {it.raw.package ?? "—"} · ${Number(it.raw.amount_quoted ?? 0).toLocaleString()}
              </div>
              {it.raw.shoot_date && (
                <div className="text-[10px] text-white/30">📅 {it.raw.shoot_date}</div>
              )}
            </div>
          )}
        />
      </section>

      {/* Outreach table */}
      <section className="border border-white/10 bg-crm-surface">
        <div className="px-6 py-3 border-b border-white/10">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase">Artist Outreach (top by fit)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/10">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">IG</th>
                <th className="text-left px-4 py-2">Listeners</th>
                <th className="text-left px-4 py-2">Fit</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Next Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {prospects.map((p: any) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2 text-white/50">{p.ig_handle ?? "—"}</td>
                  <td className="px-4 py-2 text-white/50">
                    {p.spotify_monthly_listeners ? p.spotify_monthly_listeners.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2 font-display text-base" style={{ color: MIKE }}>
                    {p.fit_score ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <InlineSelect
                      value={p.outreach_status}
                      options={PROSPECT_STATUSES}
                      onChange={(v) => updateProspectStatus(p.id, v, p.outreach_status)}
                    />
                  </td>
                  <td className="px-4 py-2 text-white/50">{p.next_followup_date ?? "—"}</td>
                </tr>
              ))}
              {prospects.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-white/30">No prospects yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Distro onboarding */}
      <section className="border border-white/10 bg-crm-surface p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase">Distro Onboarding</p>
          <button
            onClick={() => setIntakeOpen(true)}
            className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-black"
            style={{ backgroundColor: MIKE }}
          >
            + New Intake
          </button>
        </div>
        <Tabs defaultValue="jv">
          <TabsList className="bg-black border border-white/10">
            <TabsTrigger value="jv">JV Owned</TabsTrigger>
            <TabsTrigger value="pure">Pure Service</TabsTrigger>
          </TabsList>
          {(["jv", "pure"] as const).map((side) => (
            <TabsContent key={side} value={side} className="mt-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/10">
                    <tr>
                      <th className="text-left px-2 py-2">Artist</th>
                      <th className="text-left px-2 py-2">Status</th>
                      <th className="text-left px-2 py-2">Streaming</th>
                      <th className="text-left px-2 py-2">PMG %</th>
                      <th className="text-left px-2 py-2">Contract</th>
                      <th className="text-left px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {distroArtists
                      .filter((d: any) => (side === "jv" ? d.side === "jv_owned" : d.side === "pure_service"))
                      .map((d: any) => {
                        const links = streaming.filter((s: any) => s.distro_artist_id === d.id);
                        return (
                          <tr key={d.id}>
                            <td className="px-2 py-2">{d.artist_name}</td>
                            <td className="px-2 py-2">
                              <InlineSelect
                                value={d.onboarding_status}
                                options={DISTRO_STATUSES}
                                onChange={(v) => updateDistroStatus(d.id, v)}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1 flex-wrap">
                                {links.length === 0 ? <span className="text-white/30">—</span> : links.map((l: any) => (
                                  <a key={l.id} href={l.url} target="_blank" rel="noreferrer"
                                    className="px-2 py-0.5 text-[9px] uppercase tracking-widest border border-white/15 hover:border-current"
                                    style={{ color: PLATFORM_COLORS[l.platform] ?? "#888" }}
                                  >
                                    {l.platform}
                                  </a>
                                ))}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-white/50">{d.pmg_share_percent ?? "—"}</td>
                            <td className="px-2 py-2 text-white/50">
                              {d.contract_url ? (
                                <a href={d.contract_url} className="underline" target="_blank" rel="noreferrer">view</a>
                              ) : "—"}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button
                                onClick={() => setManageArtist(d)}
                                className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <DistroIntakeWizard
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        accent={MIKE}
      />

      <ManageDistroArtistModal
        artist={manageArtist}
        onClose={() => setManageArtist(null)}
        accent={MIKE}
      />
    </CrmLayout>
  );
}

const PLATFORM_COLORS: Record<string, string> = {
  spotify: "#1DB954",
  apple: "#FA243C",
  youtube: "#FF0000",
  chartmetric: "#00F0FF",
};

function ManageDistroArtistModal({
  artist, onClose, accent,
}: {
  artist: any;
  onClose: () => void;
  accent: string;
}) {
  const { data: members = [] } = useQuery({
    queryKey: ["distro-members", artist?.id],
    enabled: !!artist?.id,
    queryFn: async () => {
      const { data } = await (supabase.from("distro_artist_members") as any)
        .select("*").eq("distro_artist_id", artist.id).order("is_primary", { ascending: false });
      return data ?? [];
    },
  });
  const { data: links = [] } = useQuery({
    queryKey: ["distro-streaming", artist?.id],
    enabled: !!artist?.id,
    queryFn: async () => {
      const { data } = await (supabase.from("streaming_metrics") as any)
        .select("*").eq("distro_artist_id", artist.id);
      return data ?? [];
    },
  });

  return (
    <Dialog open={!!artist} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-crm-surface border-white/10 text-white font-mono max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm" style={{ color: accent }}>
            {artist?.artist_name}
          </DialogTitle>
        </DialogHeader>

        {artist?.description && (
          <p className="text-xs text-white/60 italic">"{artist.description}"</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="Side" value={artist?.side} />
          <Stat label="Status" value={artist?.onboarding_status} />
          <Stat label="DSP Title" value={artist?.dsp_title_approved ? "Approved" : (artist?.dsp_title_custom ?? "—")} />
          <Stat label="PMG %" value={artist?.pmg_share_percent ?? "—"} />
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Members ({members.length})</div>
          {members.length === 0 ? (
            <p className="text-white/40 text-xs">No members on record.</p>
          ) : (
            <div className="space-y-1">
              {members.map((m: any) => (
                <div key={m.id} className="border border-white/10 bg-black/30 p-2 text-xs">
                  <div className="flex justify-between">
                    <div>
                      <span className="font-bold">{[m.first_name, m.last_name].filter(Boolean).join(" ") || "—"}</span>
                      {m.stage_name && <span className="text-white/40"> "{m.stage_name}"</span>}
                      {m.is_primary && <span className="ml-2 text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-current" style={{ color: accent }}>Primary</span>}
                    </div>
                    <span className="text-white/40 uppercase tracking-widest text-[10px]">{m.role}</span>
                  </div>
                  <div className="text-white/50 text-[11px] mt-1">
                    {(m.pro_affiliation === "other" ? m.pro_other : m.pro_affiliation) || "no PRO"}
                    {m.ipi_number ? ` · IPI ${m.ipi_number}` : ""}
                  </div>
                  {(m.distro_email || m.agreements_email) && (
                    <div className="text-white/40 text-[11px]">
                      {m.distro_email && <>📧 {m.distro_email} </>}
                      {m.agreements_email && <>· 📄 {m.agreements_email}</>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Streaming</div>
          {links.length === 0 ? (
            <p className="text-white/40 text-xs">No links.</p>
          ) : (
            <div className="space-y-1">
              {links.map((l: any) => (
                <div key={l.id} className="flex justify-between items-center text-xs">
                  <a href={l.url} target="_blank" rel="noreferrer"
                    className="underline truncate" style={{ color: PLATFORM_COLORS[l.platform] ?? "#888" }}>
                    {l.platform} ↗
                  </a>
                  <span className="text-white/40">
                    {l.monthly_listeners ? `${l.monthly_listeners.toLocaleString()} listeners` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-white/10 bg-black/30 p-2">
      <div className="text-[9px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="text-white/80 mt-1">{value ?? "—"}</div>
    </div>
  );
}
