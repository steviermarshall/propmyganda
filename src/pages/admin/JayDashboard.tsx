import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import KpiCard from "@/components/crm/KpiCard";
import InlineSelect from "@/components/crm/InlineSelect";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { startOfWeek, endOfWeek, todayISO, hoursBetween, daysSince } from "@/lib/crm/dates";
import { logActivity } from "@/lib/crm/activity";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const JAY = "#b366ff";

const FORMATS_BOOKING  = ["1 Mic Performance", "Crazy Story", "Show & Tell", "Long-form YouTube"];
const FORMATS_AGENCY   = ["Music Video", "Creative Content", "Short-form", "Interview"];

const DELIV_STATUSES = [
  { value: "filmed",    label: "Filmed" },
  { value: "editing",   label: "Editing" },
  { value: "reviewed",  label: "Reviewed" },
  { value: "uploaded",  label: "Uploaded" },
  { value: "published", label: "Published" },
];

const PLATFORMS = ["youtube", "instagram", "tiktok", "twitter"];

export default function JayDashboard() {
  const qc = useQueryClient();
  const { member } = useCrmAuth();
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();
  const today = todayISO();
  const [uploadModal, setUploadModal] = useState<any | null>(null);
  const [uploadUrls, setUploadUrls] = useState<Record<string, string>>({});

  const { data: shoots = [] } = useQuery({
    queryKey: ["jay-shoots", weekStart.toISOString()],
    queryFn: async () => {
      const { data } = await (supabase.from("shoots") as any)
        .select("*")
        .gte("shoot_date", weekStart.toISOString().slice(0, 10))
        .lt("shoot_date", weekEnd.toISOString().slice(0, 10))
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

  const { data: uploadQueue = [] } = useQuery({
    queryKey: ["jay-upload-queue"],
    queryFn: async () => {
      const { data } = await (supabase.from("deliverables") as any)
        .select("*, shoot:shoots(artist_name)").eq("status", "reviewed");
      return data ?? [];
    },
  });

  // KPIs
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

  async function updateDelivStatus(id: string, next: string, current: string) {
    const patch: any = { status: next };
    if (next === "filmed" && !deliverables.find((d: any) => d.id === id)?.filmed_at) patch.filmed_at = new Date().toISOString();
    if (["uploaded", "published"].includes(next)) patch.delivered_at = new Date().toISOString();
    qc.setQueryData(["jay-deliverables", shootIds.join(",")], (old: any[] = []) =>
      old.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await (supabase.from("deliverables") as any).update(patch).eq("id", id);
    if (error) { toast.error("Failed"); qc.invalidateQueries({ queryKey: ["jay-deliverables"] }); return; }
    await logActivity(member?.id, "deliverable", id, "status_changed", { from: current, to: next });
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
    toast.success("Marked uploaded");
    setUploadModal(null);
    setUploadUrls({});
  }

  // group shoots by weekday (Wed=3, Thu=4, Fri=5, Sat=6)
  const dayCols = [3, 4, 5, 6];
  const dayLabels = ["Wed", "Thu", "Fri", "Sat"];

  return (
    <CrmLayout title="Jay's Dashboard" accent={JAY} quickAdd="shoot">
      <section>
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">This Week</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Shoots"        value={kpiShoots} target="5 tgt" accent={JAY} />
          <KpiCard label="Deliverables"  value={kpiDeliv}  target="20 tgt" accent={JAY} />
          <KpiCard label="Avg SLA"       value={slaHours}  target="<72h" accent={JAY} />
          <KpiCard label="BTS captured"  value="—"         target="5 tgt" accent={JAY} hint="manual" />
        </div>
      </section>

      {/* Shoot calendar */}
      <section className="border border-white/10 bg-crm-surface p-6">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">Shoot Calendar (Wed–Sat)</p>
        <div className="grid grid-cols-4 gap-3">
          {dayCols.map((dow, i) => {
            const items = shoots.filter((s: any) => new Date(s.shoot_date).getUTCDay() === dow);
            return (
              <div key={dow} className="border border-white/10 bg-black/50 min-h-[160px]">
                <div className="px-3 py-2 border-b border-white/10 text-[10px] uppercase tracking-widest text-white/60">
                  {dayLabels[i]}
                </div>
                <div className="p-2 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-white/20 text-[10px]">—</p>
                  ) : items.map((s: any) => (
                    <div key={s.id} className="border border-white/10 bg-crm-surface p-2">
                      <div className="text-xs font-bold">{s.artist_name}</div>
                      <div className="text-[10px] text-white/40">{s.shoot_window ?? "—"}</div>
                      <div className="text-[10px] text-white/30">{s.location ?? ""}</div>
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
      </section>

      {/* Deliverable Tracker */}
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
                    <p className="text-white/30 text-[10px]">No deliverables yet. Add a shoot via Quick Add to auto-create.</p>
                  ) : (
                    <div className="space-y-1">
                      {items.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between text-xs">
                          <span className="text-white/70">{d.format}</span>
                          <div className="flex items-center gap-3">
                            {d.filmed_at && <span className="text-[10px] text-white/30">filmed {daysSince(d.filmed_at)}d ago</span>}
                            <InlineSelect
                              value={d.status}
                              options={DELIV_STATUSES}
                              onChange={(v) => updateDelivStatus(d.id, v, d.status)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upload queue */}
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
    </CrmLayout>
  );
}
