import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { toast } from "sonner";

const ACCENT = "#F5FF00";

const COLUMNS = [
  { key: "idea",        label: "Ideas",       hint: "Dump anything here" },
  { key: "todo",        label: "To Do",       hint: "Agreed — needs doing" },
  { key: "in_progress", label: "In Progress", hint: "Being worked on" },
  { key: "done",        label: "Done",        hint: "Shipped" },
] as const;

type Status = (typeof COLUMNS)[number]["key"];
type Priority = "low" | "medium" | "high";

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "#7CFFB2",
  medium: "#00F0FF",
  high: "#FF3D6E",
};

interface Task {
  id: string;
  title: string;
  notes: string | null;
  status: Status;
  priority: Priority;
  area: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export default function RoadmapBoard() {
  const qc = useQueryClient();
  const { member } = useCrmAuth();
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["pmg-tasks"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("pmg_tasks") as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Task[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["pmg-tasks"] });

  const addTask = useMutation({
    mutationFn: async () => {
      const title = newTitle.trim();
      if (!title) throw new Error("Give the item a title");
      const { error } = await (supabase.from("pmg_tasks") as any).insert({
        title,
        notes: newNotes.trim() || null,
        area: newArea.trim() || null,
        priority: newPriority,
        status: "idea",
        created_by: member?.id ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNewTitle(""); setNewNotes(""); setNewArea(""); setNewPriority("medium");
      toast.success("Added to the board");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to add"),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const { error } = await (supabase.from("pmg_tasks") as any)
        .update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e: any) => { toast.error(e?.message ?? "Update failed"); invalidate(); },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("pmg_tasks") as any).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  function move(task: Task, dir: -1 | 1) {
    const idx = COLUMNS.findIndex((c) => c.key === task.status);
    const next = COLUMNS[Math.min(COLUMNS.length - 1, Math.max(0, idx + dir))];
    if (!next || next.key === task.status) return;
    updateTask.mutate({ id: task.id, patch: { status: next.key } });
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const openCount = tasks.length - doneCount;

  return (
    <CrmLayout title="Roadmap Board" accent={ACCENT} onQuickAddClick={() => {
      const el = document.getElementById("roadmap-new-title");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => (el as HTMLInputElement | null)?.focus(), 350);
    }}>
      {/* Summary + capture */}
      <section className="border border-white/10 bg-crm-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase">
            Brainstorm — everything for the website &amp; backend
          </p>
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            <span style={{ color: ACCENT }}>{openCount}</span> open · {doneCount} done
          </p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); addTask.mutate(); }}
          className="space-y-3"
        >
          <input
            id="roadmap-new-title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Type an idea or task, then hit Enter — e.g. “Fix mobile menu overlap”"
            className="w-full bg-black border border-white/10 text-white text-sm px-4 py-3 placeholder:text-white/20 focus:border-white/30 outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <input
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              placeholder="Area (website / backend / content…)"
              className="flex-1 min-w-[180px] bg-black border border-white/10 text-white text-xs px-3 py-2 placeholder:text-white/20 outline-none"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="bg-black border border-white/10 text-white text-xs px-3 py-2 outline-none"
            >
              <option value="low">Priority: Low</option>
              <option value="medium">Priority: Medium</option>
              <option value="high">Priority: High</option>
            </select>
            <button
              type="submit"
              disabled={addTask.isPending}
              className="px-6 py-2 text-[10px] uppercase tracking-widest font-bold text-black disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              {addTask.isPending ? "Adding…" : "Add"}
            </button>
          </div>
          <textarea
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Details, links, thoughts (optional)"
            rows={2}
            className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2 placeholder:text-white/20 outline-none resize-y"
          />
        </form>
      </section>

      {/* Board */}
      {isLoading ? (
        <p className="text-white/40 text-sm">Loading board…</p>
      ) : tasks.length === 0 ? (
        <section className="border border-white/10 bg-crm-surface p-10 text-center">
          <p className="text-white/40 text-sm">The board is empty — add your first item above.</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="border border-white/10 bg-crm-surface p-4 flex flex-col">
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-[10px] tracking-[0.3em] uppercase font-bold" style={{ color: ACCENT }}>
                    {col.label}
                  </p>
                  <span className="text-[10px] text-white/30">{items.length}</span>
                </div>
                <p className="text-[9px] text-white/20 uppercase tracking-widest mb-3">{col.hint}</p>
                <div className="space-y-2 flex-1">
                  {items.length === 0 && (
                    <p className="text-[10px] text-white/20 py-4 text-center">—</p>
                  )}
                  {items.map((t) => {
                    const isOpen = expanded === t.id;
                    return (
                      <div
                        key={t.id}
                        className="border border-white/10 bg-black/40 p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => setExpanded(isOpen ? null : t.id)}
                            className={`flex-1 text-left text-xs leading-snug ${t.status === "done" ? "text-white/40 line-through" : "text-white/90"}`}
                          >
                            {t.title}
                          </button>
                          <span
                            className="shrink-0 mt-0.5 w-2 h-2"
                            style={{ backgroundColor: PRIORITY_COLOR[t.priority] ?? PRIORITY_COLOR.medium }}
                            title={`${t.priority} priority`}
                          />
                        </div>

                        {t.area && (
                          <p className="text-[9px] uppercase tracking-widest text-white/30">{t.area}</p>
                        )}

                        {isOpen && (
                          <div className="space-y-2 pt-1 border-t border-white/5">
                            {t.notes && (
                              <p className="text-[10px] text-white/50 whitespace-pre-wrap">{t.notes}</p>
                            )}
                            <div className="flex flex-wrap gap-1">
                              <select
                                value={t.priority}
                                onChange={(e) =>
                                  updateTask.mutate({ id: t.id, patch: { priority: e.target.value as Priority } })
                                }
                                className="bg-black border border-white/10 text-white/70 text-[9px] uppercase tracking-widest px-2 py-1 outline-none"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Med</option>
                                <option value="high">High</option>
                              </select>
                              <button
                                onClick={() => updateTask.mutate({ id: t.id, patch: { status: "done" } })}
                                disabled={t.status === "done"}
                                className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold text-black disabled:opacity-30"
                                style={{ backgroundColor: ACCENT }}
                              >
                                Done
                              </button>
                              <button
                                onClick={() => deleteTask.mutate(t.id)}
                                className="px-2 py-1 text-[9px] uppercase tracking-widest border border-white/10 text-white/40 hover:text-red-400 hover:border-red-400/40"
                              >
                                Delete
                              </button>
                            </div>
                            <p className="text-[9px] text-white/20">
                              Added {new Date(t.created_at).toLocaleDateString()}
                              {t.completed_at && ` · Finished ${new Date(t.completed_at).toLocaleDateString()}`}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-1">
                          <button
                            onClick={() => move(t, -1)}
                            disabled={t.status === COLUMNS[0].key}
                            className="flex-1 py-1 text-[10px] border border-white/10 text-white/40 disabled:opacity-20 hover:text-white/80"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => move(t, 1)}
                            disabled={t.status === COLUMNS[COLUMNS.length - 1].key}
                            className="flex-1 py-1 text-[10px] border border-white/10 text-white/40 disabled:opacity-20 hover:text-white/80"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CrmLayout>
  );
}
