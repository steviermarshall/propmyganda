import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import SharedCalendar from "@/components/crm/SharedCalendar";
import KpiCard from "@/components/crm/KpiCard";
import InlineSelect from "@/components/crm/InlineSelect";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { startOfWeek, endOfWeek, todayISO, hoursBetween, daysSince } from "@/lib/crm/dates";
import { logActivity } from "@/lib/crm/activity";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { pushToGcal, pullGcal, getGcalSettings } from "@/lib/crm/gcal";
import { useEffect } from "react";
import { addDays, format, startOfWeek as dfStartOfWeek } from "date-fns";

const JAY = "#b366ff";

const DELIV_STATUSES = [
  { value: "filmed",    label: "Filmed" },
  { value: "editing",   label: "Editing" },
  { value: "reviewed",  label: "Reviewed" },
  { value: "uploaded",  label: "Uploaded" },
  { value: "published", label: "Published" },
];

const PRIORITIES = [
  { value: "low",  label: "Low" },
  { value: "med",  label: "Med" },
  { value: "high", label: "High" },
];

const PRIORITY_COLOR: Record<string, string> = {
  low: "text-white/40",
  med: "text-yellow-400",
  high: "text-red-400",
};

const PLATFORMS = ["youtube", "instagram", "tiktok", "twitter"];

type Tab = "calendar" | "shoots" | "deliverables" | "editors" | "uploads";

export default function JayDashboard() {
  const qc = useQueryClient();
  const { member } = useCrmAuth();
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();

  const [tab, setTab] = useState<Tab>("calendar");
  const [uploadModal, setUploadModal] = useState<any | null>(null);
  const [uploadUrls, setUploadUrls] = useState<Record<string, string>>({});
  const [assignModal, setAssignModal] = useState<any | null>(null);

  // Calendar tab: which week to display (default = this week, Monday start)
  const [viewWeek, setViewWeek] = useState<Date>(dfStartOfWeek(new Date(), { weekStartsOn: 1 }));
  const viewWeekEnd = useMemo(() => addDays(viewWeek, 7), [viewWeek]);

  // ---- queries
  const { data: shoots = [] } = useQuery({
    queryKey: ["jay-shoots", viewWeek.toISOString()],
    queryFn: async () => {
      const { data } = await (supabase.from("shoots") as any)
        .select("*")
        .gte("shoot_date", viewWeek.toISOString().slice(0, 10))
        .lt("shoot_date", viewWeekEnd.toISOString().slice(0, 10))
        .order("shoot_date", { ascending: true });
      return data ?? [];
    },
  });

  const shootIds = shoots.map((s: any) => s.id);

  const { data: deliverables = [] } = useQuery({
    queryKey: ["jay-deliverables", shootIds.join(",")],
    enabled: shootIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("deliverables") as any)
        .select("*").in("shoot_id", shootIds);
      return data ?? [];
    },
  });

  const { data: allOpenDeliv = [] } = useQuery({
    queryKey: ["jay-all-open-deliverables"],
    queryFn: async () => {
      const { data } = await (supabase.from("deliverables") as any)
        .select("*, shoot:shoots(artist_name, shoot_date)")
        .in("status", ["filmed", "editing", "reviewed"]);
      return data ?? [];
    },
  });

  // Sync errors map (entity_id -> last_error) for inline chips
  const { data: syncErrors = {} } = useQuery({
    queryKey: ["jay-sync-errors"],
    queryFn: async () => {
      const { data } = await (supabase.from("calendar_sync") as any)
        .select("entity_id, last_error").eq("entity_type", "deliverable").not("last_error", "is", null);
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { if (r.last_error) map[r.entity_id] = r.last_error; });
      return map;
    },
    refetchInterval: 60_000,
  });

  const { data: uploadQueue = [] } = useQuery({
    queryKey: ["jay-upload-queue"],
    queryFn: async () => {
      const { data } = await (supabase.from("deliverables") as any)
        .select("*, shoot:shoots(artist_name)").eq("status", "reviewed");
      return data ?? [];
    },
  });

  const { data: editors = [] } = useQuery({
    queryKey: ["jay-editors"],
    queryFn: async () => {
      const { data } = await (supabase.from("team_members") as any)
        .select("id, name, email, role")
        .in("role", ["editor", "jay"]);
      return data ?? [];
    },
  });

  const editorById = useMemo(() => {
    const m: Record<string, any> = {};
    editors.forEach((e: any) => { m[e.id] = e; });
    return m;
  }, [editors]);

  // ---- KPIs
  const kpiShoots = shoots.length;
  const kpiDeliv = deliverables.filter((d: any) =>
    ["uploaded", "published"].includes(d.status)).length;
  const slaHours = (() => {
    const finished = deliverables.filter((d: any) => d.delivered_at && d.filmed_at);
    if (!finished.length) return "—";
    const total = finished.reduce((acc: number, d: any) =>
      acc + (hoursBetween(d.filmed_at, d.delivered_at) ?? 0), 0);
    return `${Math.round(total / finished.length)}h`;
  })();
  const overdueCount = allOpenDeliv.filter((d: any) =>
    d.due_at && new Date(d.due_at) < new Date()
  ).length;

  // ---- mutations
  async function updateDelivStatus(id: string, next: string, current: string) {
    const patch: any = { status: next };
    if (next === "filmed" && !deliverables.find((d: any) => d.id === id)?.filmed_at) patch.filmed_at = new Date().toISOString();
    if (["uploaded", "published"].includes(next)) patch.delivered_at = new Date().toISOString();
    qc.setQueryData(["jay-deliverables", shootIds.join(",")], (old: any[] = []) =>
      old.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await (supabase.from("deliverables") as any).update(patch).eq("id", id);
    if (error) { toast.error("Failed"); qc.invalidateQueries({ queryKey: ["jay-deliverables"] }); return; }
    await logActivity(member?.id, "deliverable", id, "status_changed", { from: current, to: next });
    qc.invalidateQueries({ queryKey: ["jay-all-open-deliverables"] });
    pushToGcal("deliverable", id);
  }

  async function confirmUpload() {
    if (!uploadModal) return;
    const patch = {
      status: "uploaded",
      upload_urls: uploadUrls,
      delivered_at: new Date().toISOString(),
    };
    qc.setQueryData(["jay-upload-queue"], (old: any[] = []) => old.filter((r) => r.id !== uploadModal.id));
    const { error } = await (supabase.from("deliverables") as any).update(patch).eq("id", uploadModal.id);
    if (error) { toast.error("Failed"); qc.invalidateQueries({ queryKey: ["jay-upload-queue"] }); return; }
    await logActivity(member?.id, "deliverable", uploadModal.id, "status_changed", patch);
    pushToGcal("deliverable", uploadModal.id);
    toast.success("Marked uploaded");
    setUploadModal(null);
    setUploadUrls({});
  }

  async function saveAssignment(form: any) {
    if (!assignModal) return;
    const patch: any = {
      assigned_to: form.assigned_to || null,
      objective: form.objective || null,
      notes: form.notes || null,
      priority: form.priority || null,
      expected_runtime_seconds: form.expected_runtime_minutes ? Math.round(Number(form.expected_runtime_minutes) * 60) : null,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
    };
    const { error } = await (supabase.from("deliverables") as any).update(patch).eq("id", assignModal.id);
    if (error) { toast.error(error.message); return; }
    await logActivity(member?.id, "deliverable", assignModal.id, "assigned", patch);
    toast.success("Assigned");
    pushToGcal("deliverable", assignModal.id);
    setAssignModal(null);
    qc.invalidateQueries({ queryKey: ["jay-deliverables"] });
    qc.invalidateQueries({ queryKey: ["jay-all-open-deliverables"] });
  }

  // ---- calendar layout
  // Show all 7 days of the selected week (Mon → Sun).
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(viewWeek, i)),
    [viewWeek],
  );

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "calendar",     label: "Calendar" },
    { id: "shoots",       label: "Shoots", count: shoots.length },
    { id: "deliverables", label: "Deliverables", count: allOpenDeliv.length },
    { id: "editors",      label: "Editor Workload" },
    { id: "uploads",      label: "Upload Queue", count: uploadQueue.length },
  ];

  return (
    <CrmLayout title="Jay's Dashboard" accent={JAY} quickAdd="shoot">
      <SharedCalendar accent={JAY} />
      <section>
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">This Week</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Shoots"        value={kpiShoots} target="5 tgt" accent={JAY} />
          <KpiCard label="Delivered"     value={kpiDeliv}  target="20 tgt" accent={JAY} />
          <KpiCard label="Avg SLA"       value={slaHours}  target="<72h" accent={JAY} />
          <KpiCard label="Overdue"       value={overdueCount}  accent={JAY} />
        </div>
      </section>

      <GcalSyncBar accent={JAY} onSynced={() => {
        qc.invalidateQueries({ queryKey: ["jay-shoots"] });
        qc.invalidateQueries({ queryKey: ["jay-deliverables"] });
        qc.invalidateQueries({ queryKey: ["jay-all-open-deliverables"] });
      }} />

      {/* Tab bar */}
      <div className="border-b border-white/10 flex gap-1 overflow-x-auto items-center">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[10px] uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? "border-current text-white"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
            style={tab === t.id ? { color: JAY, borderColor: JAY } : {}}
          >
            {t.label}{t.count != null ? ` · ${t.count}` : ""}
          </button>
        ))}
        <a
          href="/admin/reports/deliverables"
          className="ml-auto px-3 py-2 text-[10px] uppercase tracking-widest text-white/40 hover:text-white whitespace-nowrap"
        >
          Reports →
        </a>
      </div>

      {tab === "calendar" && (
        <section className="border border-white/10 bg-crm-surface p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase">
              Shoot Week — {format(viewWeek, "MMM d")} → {format(addDays(viewWeek, 6), "MMM d")}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewWeek((w) => addDays(w, -7))}
                className="px-2 py-1 text-[10px] uppercase tracking-widest text-white/60 hover:text-white border border-white/10"
              >
                ← Prev
              </button>
              <button
                onClick={() => setViewWeek(dfStartOfWeek(new Date(), { weekStartsOn: 1 }))}
                className="px-2 py-1 text-[10px] uppercase tracking-widest text-white/60 hover:text-white border border-white/10"
              >
                This Week
              </button>
              <button
                onClick={() => setViewWeek((w) => addDays(w, 7))}
                className="px-2 py-1 text-[10px] uppercase tracking-widest text-white/60 hover:text-white border border-white/10"
              >
                Next →
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((d) => {
              const iso = d.toISOString().slice(0, 10);
              const items = shoots.filter((s: any) => s.shoot_date === iso);
              const isToday = iso === new Date().toISOString().slice(0, 10);
              return (
                <div key={iso} className="border border-white/10 bg-black/50 min-h-[200px]">
                  <div className={`px-2 py-2 border-b border-white/10 text-[10px] uppercase tracking-widest ${isToday ? "text-white" : "text-white/60"}`} style={isToday ? { backgroundColor: `${JAY}33`, color: JAY } : {}}>
                    {format(d, "EEE d")}
                  </div>
                  <div className="p-2 space-y-2">
                    {items.length === 0 ? (
                      <p className="text-white/20 text-[10px]">—</p>
                    ) : items.map((s: any) => (
                      <div key={s.id} className="border border-white/10 bg-crm-surface p-2">
                        <div className="text-xs font-bold truncate">{s.artist_name}</div>
                        <div className="text-[10px] text-white/40">{s.shoot_window ?? "—"}</div>
                        <div className="text-[10px] text-white/30 truncate">{s.location ?? ""}</div>
                        <div className="text-[10px] mt-1 uppercase tracking-widest" style={{ color: JAY }}>
                          {s.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-white/30 mt-4">
            Color = editor. Drag in Google Calendar — pull syncs back every refresh.
          </p>
        </section>
      )}

      {tab === "shoots" && (
        <section className="border border-white/10 bg-crm-surface p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">All Shoots This Week</p>
          {shoots.length === 0 ? (
            <p className="text-white/40 text-sm">No shoots. Hit + to add.</p>
          ) : (
            <div className="space-y-2">
              {shoots.map((s: any) => (
                <div key={s.id} className="border border-white/5 bg-black/30 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">{s.artist_name}</div>
                    <div className="text-[10px] text-white/40">
                      {s.shoot_date} · {s.shoot_window ?? "—"} · {s.location ?? ""}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: JAY }}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "deliverables" && (
        <section className="border border-white/10 bg-crm-surface p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">Deliverable Tracker</p>
          {shoots.length === 0 ? (
            <p className="text-white/40 text-sm">No shoots this week.</p>
          ) : (
            <div className="space-y-4">
              {shoots.map((s: any) => {
                const items = deliverables.filter((d: any) => d.shoot_id === s.id);
                return (
                  <div key={s.id} className="border border-white/5 bg-black/30 p-3">
                    <div className="text-sm font-bold mb-2">
                      {s.artist_name} <span className="text-white/30 text-[10px] uppercase tracking-widest">· {s.shoot_date}</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-white/30 text-[10px]">No deliverables yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map((d: any) => {
                          const editor = d.assigned_to ? editorById[d.assigned_to] : null;
                          const dueLate = d.due_at && new Date(d.due_at) < new Date() && !["uploaded","published"].includes(d.status);
                          return (
                            <div key={d.id} className="flex items-start justify-between text-xs gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-white/80">{d.format}</div>
                                <div className="flex items-center gap-3 mt-1 text-[10px] flex-wrap">
                                  {editor ? (
                                    <span className="text-white/60">→ {editor.name ?? editor.email}</span>
                                  ) : (
                                    <span className="text-white/30">unassigned</span>
                                  )}
                                  {d.priority && <span className={PRIORITY_COLOR[d.priority]}>★ {d.priority}</span>}
                                  {d.due_at && (
                                    <span className={dueLate ? "text-red-400" : "text-white/40"}>
                                      due {new Date(d.due_at).toLocaleDateString()}
                                    </span>
                                  )}
                                  {d.filmed_at && <span className="text-white/30">filmed {daysSince(d.filmed_at)}d ago</span>}
                                  {d.revision_count > 0 && <span className="text-white/30">rev {d.revision_count}</span>}
                                  {syncErrors[d.id] && (
                                    <span className="text-amber-400" title={syncErrors[d.id]}>⚠ gcal</span>
                                  )}
                                </div>
                                {d.objective && <div className="text-[10px] text-white/50 mt-1 italic">"{d.objective}"</div>}
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <InlineSelect value={d.status} options={DELIV_STATUSES}
                                  onChange={(v) => updateDelivStatus(d.id, v, d.status)} />
                                <button
                                  onClick={() => setAssignModal(d)}
                                  className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
                                >
                                  {editor ? "Reassign" : "Assign"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "editors" && (
        <section className="border border-white/10 bg-crm-surface p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">Editor Workload</p>
          {editors.length === 0 ? (
            <p className="text-white/40 text-sm">No editors yet. Add a team_member with role='editor'.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {editors.map((e: any) => {
                const load = allOpenDeliv.filter((d: any) => d.assigned_to === e.id);
                const late = load.filter((d: any) => d.due_at && new Date(d.due_at) < new Date()).length;
                return (
                  <div key={e.id} className="border border-white/10 bg-black/40 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-bold">{e.name ?? e.email}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-widest">{e.role}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{ color: JAY }}>{load.length}</div>
                        <div className="text-[10px] text-white/40">open{late > 0 ? ` · ${late} late` : ""}</div>
                      </div>
                    </div>
                    {load.length === 0 ? (
                      <p className="text-[10px] text-white/30">Idle.</p>
                    ) : (
                      <div className="space-y-1">
                        {load.slice(0, 5).map((d: any) => (
                          <div key={d.id} className="text-[10px] flex justify-between text-white/60">
                            <span className="truncate">{d.shoot?.artist_name} · {d.format}</span>
                            {d.due_at && (
                              <span className={new Date(d.due_at) < new Date() ? "text-red-400" : "text-white/40"}>
                                {new Date(d.due_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ))}
                        {load.length > 5 && <div className="text-[10px] text-white/30">+ {load.length - 5} more</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "uploads" && (
        <section className="border border-white/10 bg-crm-surface p-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">Upload Queue — {uploadQueue.length} ready</p>
          {uploadQueue.length === 0 ? (
            <p className="text-white/40 text-sm">Nothing reviewed yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {uploadQueue.map((d: any) => (
                <div key={d.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm">{d.format}</div>
                    <div className="text-[10px] text-white/40">{d.shoot?.artist_name ?? "—"}</div>
                  </div>
                  <button
                    onClick={() => { setUploadModal(d); setUploadUrls({}); }}
                    className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-black"
                    style={{ backgroundColor: JAY }}
                  >
                    Mark Uploaded
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Upload URLs modal */}
      <Dialog open={!!uploadModal} onOpenChange={(v) => !v && setUploadModal(null)}>
        <DialogContent className="bg-crm-surface border-white/10 text-white font-mono max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm" style={{ color: JAY }}>
              Upload URLs — {uploadModal?.format}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {PLATFORMS.map((p) => (
              <div key={p}>
                <label className="text-[10px] uppercase tracking-widest text-white/40">{p}</label>
                <input
                  value={uploadUrls[p] ?? ""}
                  onChange={(e) => setUploadUrls({ ...uploadUrls, [p]: e.target.value })}
                  placeholder="https://…"
                  className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full mt-1"
                />
              </div>
            ))}
            <button onClick={confirmUpload}
              className="w-full py-2 font-bold text-black uppercase tracking-widest text-xs"
              style={{ backgroundColor: JAY }}>
              Save URLs
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Editor modal */}
      <AssignEditorModal
        deliverable={assignModal}
        editors={editors}
        accent={JAY}
        onClose={() => setAssignModal(null)}
        onSave={saveAssignment}
      />
    </CrmLayout>
  );
}

function AssignEditorModal({
  deliverable, editors, accent, onClose, onSave,
}: {
  deliverable: any;
  editors: any[];
  accent: string;
  onClose: () => void;
  onSave: (form: any) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, string>>({});

  // hydrate when opened
  useMemo(() => {
    if (deliverable) {
      setForm({
        assigned_to: deliverable.assigned_to ?? "",
        objective: deliverable.objective ?? "",
        notes: deliverable.notes ?? "",
        priority: deliverable.priority ?? "med",
        expected_runtime_minutes: deliverable.expected_runtime_seconds
          ? String(Math.round(deliverable.expected_runtime_seconds / 60))
          : "",
        due_at: deliverable.due_at ? new Date(deliverable.due_at).toISOString().slice(0, 16) : "",
      });
    }
  }, [deliverable?.id]);

  return (
    <Dialog open={!!deliverable} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-crm-surface border-white/10 text-white font-mono max-w-lg">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm" style={{ color: accent }}>
            Assign Editor — {deliverable?.format}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); onSave(form); }}
          className="space-y-3"
        >
          <Field label="Editor">
            <select
              value={form.assigned_to ?? ""}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
            >
              <option value="">— Unassigned —</option>
              {editors.map((e: any) => (
                <option key={e.id} value={e.id}>{e.name ?? e.email} ({e.role})</option>
              ))}
            </select>
          </Field>
          <Field label="Objective">
            <input
              value={form.objective ?? ""}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              placeholder="e.g. Tight 60s reel emphasising chorus"
              className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Priority">
              <select
                value={form.priority ?? "med"}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
              >
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Expected (min)">
              <input
                type="number"
                value={form.expected_runtime_minutes ?? ""}
                onChange={(e) => setForm({ ...form, expected_runtime_minutes: e.target.value })}
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
              />
            </Field>
            <Field label="Due">
              <input
                type="datetime-local"
                value={form.due_at ?? ""}
                onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Anything the editor needs to know"
              className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
            />
          </Field>
          <button
            type="submit"
            className="w-full py-2 font-bold text-black uppercase tracking-widest text-xs"
            style={{ backgroundColor: accent }}
          >
            Save
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-widest text-white/40">{label}</label>
      {children}
    </div>
  );
}

function GcalSyncBar({ accent, onSynced }: { accent: string; onSynced: () => void }) {
  const [status, setStatus] = useState<{ calendar_id: string; last_pull_at: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getGcalSettings().then(setStatus);
    const tick = setInterval(() => getGcalSettings().then(setStatus), 60_000);
    return () => clearInterval(tick);
  }, []);

  async function syncNow() {
    setBusy(true);
    try {
      const r = await pullGcal();
      toast.success(`Synced · ${r.updated} updated, ${r.skipped} skipped`);
      setStatus(await getGcalSettings());
      onSynced();
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  const last = status?.last_pull_at ? new Date(status.last_pull_at) : null;
  const ago = last ? Math.round((Date.now() - last.getTime()) / 60000) : null;

  return (
    <div className="flex items-center justify-between border border-white/10 bg-black/40 px-4 py-2">
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-white/60">Google Calendar</span>
        <span className="text-white/30">·</span>
        <span className="text-white/40">{status?.calendar_id ?? "primary"}</span>
        <span className="text-white/30">·</span>
        <span className="text-white/40">
          {ago == null ? "never synced" : ago < 1 ? "just now" : `${ago}m ago`}
        </span>
      </div>
      <button
        onClick={syncNow}
        disabled={busy}
        className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-black disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {busy ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}
