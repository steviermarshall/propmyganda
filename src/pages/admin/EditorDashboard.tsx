import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import SharedCalendar from "@/components/crm/SharedCalendar";
import KpiCard from "@/components/crm/KpiCard";
import InlineSelect from "@/components/crm/InlineSelect";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { pushToGcal } from "@/lib/crm/gcal";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EDITOR = "#22d3ee";

const STATUSES = [
  { value: "filmed",    label: "Filmed" },
  { value: "editing",   label: "Editing" },
  { value: "reviewed",  label: "Reviewed" },
  { value: "uploaded",  label: "Uploaded" },
  { value: "published", label: "Published" },
];

const PRIORITY_COLOR: Record<string, string> = {
  low: "text-white/40",
  med: "text-yellow-400",
  high: "text-red-400",
};

export default function EditorDashboard() {
  const qc = useQueryClient();
  const { member } = useCrmAuth();
  const [noteModal, setNoteModal] = useState<any | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["editor-queue", member?.id],
    enabled: !!member?.id,
    queryFn: async () => {
      const { data } = await (supabase.from("deliverables") as any)
        .select("*, shoot:shoots(artist_name, shoot_date, location)")
        .eq("assigned_to", member!.id)
        .order("due_at", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });

  const open = items.filter((d: any) => !["uploaded", "published"].includes(d.status));
  const overdue = open.filter((d: any) => d.due_at && new Date(d.due_at) < new Date()).length;
  const completedThisWeek = items.filter((d: any) => {
    if (!d.delivered_at) return false;
    const sevenAgo = Date.now() - 7 * 86400000;
    return new Date(d.delivered_at).getTime() > sevenAgo;
  }).length;

  async function updateStatus(id: string, next: string, current: string) {
    const patch: any = { status: next };
    if (["uploaded", "published"].includes(next)) patch.delivered_at = new Date().toISOString();
    qc.setQueryData(["editor-queue", member?.id], (old: any[] = []) =>
      old.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await (supabase.from("deliverables") as any).update(patch).eq("id", id);
    if (error) { toast.error("Failed"); qc.invalidateQueries({ queryKey: ["editor-queue"] }); return; }
    pushToGcal("deliverable", id);
  }

  async function saveNote() {
    if (!noteModal) return;
    const patch = { last_review_notes: noteDraft, revision_count: (noteModal.revision_count ?? 0) + 1 };
    const { error } = await (supabase.from("deliverables") as any).update(patch).eq("id", noteModal.id);
    if (error) { toast.error("Failed"); return; }
    toast.success("Note saved");
    setNoteModal(null);
    setNoteDraft("");
    qc.invalidateQueries({ queryKey: ["editor-queue"] });
  }

  return (
    <CrmLayout title="Editor Bay" accent={EDITOR}>
      <section>
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">Your Queue</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Open"             value={open.length}           accent={EDITOR} />
          <KpiCard label="Overdue"          value={overdue}               accent={EDITOR} />
          <KpiCard label="Done This Week"   value={completedThisWeek}     accent={EDITOR} />
          <KpiCard label="Avg Revisions"    value={
            items.length ? (items.reduce((a: number, d: any) => a + (d.revision_count ?? 0), 0) / items.length).toFixed(1) : "—"
          } accent={EDITOR} />
        </div>
      </section>

      <SharedCalendar accent={EDITOR} />

      <section className="border border-white/10 bg-crm-surface p-6">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">Assignments</p>
        {open.length === 0 ? (
          <p className="text-white/40 text-sm">Nothing assigned. Enjoy the silence.</p>
        ) : (
          <div className="space-y-2">
            {open.map((d: any) => {
              const dueLabel = d.due_at ? new Date(d.due_at).toLocaleString() : "—";
              const isLate = d.due_at && new Date(d.due_at) < new Date();
              return (
                <div key={d.id} className="border border-white/5 bg-black/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold">
                        {d.shoot?.artist_name ?? "—"} <span className="text-white/40">· {d.format}</span>
                      </div>
                      {d.objective && <div className="text-[11px] text-white/60 mt-1">{d.objective}</div>}
                      <div className="flex items-center gap-4 mt-2 text-[10px] uppercase tracking-widest">
                        <span className={isLate ? "text-red-400" : "text-white/40"}>
                          Due {dueLabel}
                        </span>
                        {d.priority && <span className={PRIORITY_COLOR[d.priority] ?? "text-white/40"}>★ {d.priority}</span>}
                        {d.expected_runtime_seconds && <span className="text-white/40">{Math.round(d.expected_runtime_seconds/60)}min</span>}
                        {d.revision_count > 0 && <span className="text-white/40">rev {d.revision_count}</span>}
                      </div>
                      {d.last_review_notes && (
                        <div className="text-[11px] text-yellow-400/80 mt-2 border-l-2 border-yellow-400/40 pl-2">
                          Note: {d.last_review_notes}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <InlineSelect value={d.status} options={STATUSES}
                        onChange={(v) => updateStatus(d.id, v, d.status)} />
                      <button
                        onClick={() => { setNoteModal(d); setNoteDraft(d.last_review_notes ?? ""); }}
                        className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
                      >Add note</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={!!noteModal} onOpenChange={(v) => !v && setNoteModal(null)}>
        <DialogContent className="bg-crm-surface border-white/10 text-white font-mono max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm" style={{ color: EDITOR }}>
              Review Note — {noteModal?.format}
            </DialogTitle>
          </DialogHeader>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={5}
            placeholder="What did you change / what needs review…"
            className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
          />
          <button onClick={saveNote}
            className="w-full py-2 font-bold text-black uppercase tracking-widest text-xs"
            style={{ backgroundColor: EDITOR }}>
            Save (bumps revision)
          </button>
        </DialogContent>
      </Dialog>
    </CrmLayout>
  );
}
