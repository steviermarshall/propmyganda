import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import KpiCard from "@/components/crm/KpiCard";

const ACCENT = "#FF4D2E";
const STATUSES = ["filmed", "editing", "reviewed", "uploaded", "published"] as const;
type Status = typeof STATUSES[number];

const STATUS_COLOR: Record<Status, string> = {
  filmed:    "#94a3b8",
  editing:   "#f59e0b",
  reviewed:  "#a78bfa",
  uploaded:  "#22d3ee",
  published: "#22c55e",
};

type Range = "7d" | "30d" | "90d" | "all";

export default function DeliverablesReport() {
  const [range, setRange] = useState<Range>("30d");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const { data: members = [] } = useQuery({
    queryKey: ["report-members"],
    queryFn: async () => {
      const { data } = await (supabase.from("team_members") as any)
        .select("id,name,role").order("name");
      return data ?? [];
    },
  });

  const { data: deliverables = [], isLoading } = useQuery({
    queryKey: ["report-deliverables", range],
    queryFn: async () => {
      let q: any = (supabase.from("deliverables") as any)
        .select("id,title,status,priority,assigned_to,due_at,filmed_at,delivered_at,format,shoot_id,updated_at")
        .order("due_at", { ascending: true, nullsFirst: false });
      if (range !== "all") {
        const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        q = q.gte("updated_at", since);
      }
      const { data } = await q;
      return data ?? [];
    },
  });

  const memberMap = useMemo(() => {
    const m = new Map<string, any>();
    members.forEach((x: any) => m.set(x.id, x));
    return m;
  }, [members]);

  const filtered = useMemo(() => deliverables.filter((d: any) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned" ? d.assigned_to : d.assigned_to !== assigneeFilter) return false;
    }
    return true;
  }), [deliverables, statusFilter, assigneeFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const open = filtered.filter((d: any) => !["uploaded", "published"].includes(d.status)).length;
    const overdue = filtered.filter((d: any) => d.due_at && new Date(d.due_at) < new Date() && !["uploaded","published"].includes(d.status)).length;
    const delivered = filtered.filter((d: any) => d.delivered_at).length;
    return { total, open, overdue, delivered };
  }, [filtered]);

  // By status
  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUSES.forEach(s => (counts[s] = 0));
    filtered.forEach((d: any) => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return counts;
  }, [filtered]);

  // By assignee
  const byAssignee = useMemo(() => {
    const rows = new Map<string, { name: string; total: number; open: number; overdue: number; delivered: number; byStatus: Record<string, number> }>();
    filtered.forEach((d: any) => {
      const key = d.assigned_to || "__unassigned";
      const name = d.assigned_to ? (memberMap.get(d.assigned_to)?.name ?? "Unknown") : "Unassigned";
      if (!rows.has(key)) rows.set(key, { name, total: 0, open: 0, overdue: 0, delivered: 0, byStatus: {} });
      const r = rows.get(key)!;
      r.total++;
      if (!["uploaded","published"].includes(d.status)) r.open++;
      if (d.due_at && new Date(d.due_at) < new Date() && !["uploaded","published"].includes(d.status)) r.overdue++;
      if (d.delivered_at) r.delivered++;
      r.byStatus[d.status] = (r.byStatus[d.status] || 0) + 1;
    });
    return Array.from(rows.values()).sort((a, b) => b.total - a.total);
  }, [filtered, memberMap]);

  const maxStatus = Math.max(1, ...Object.values(byStatus));
  const maxAssignee = Math.max(1, ...byAssignee.map(r => r.total));

  function exportCsv() {
    const headers = ["title", "status", "priority", "assignee", "due_at", "filmed_at", "delivered_at", "format"];
    const rows = filtered.map((d: any) => [
      d.title || "",
      d.status,
      d.priority || "",
      d.assigned_to ? (memberMap.get(d.assigned_to)?.name ?? "") : "Unassigned",
      d.due_at || "",
      d.filmed_at || "",
      d.delivered_at || "",
      d.format || "",
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `deliverables-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <CrmLayout title="Deliverables Report" accent={ACCENT}>
      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 border border-white/10">
          {(["7d","30d","90d","all"] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-widest ${range===r ? "bg-white text-black" : "text-white/60 hover:text-white"}`}>
              {r === "all" ? "All time" : `Last ${r}`}
            </button>
          ))}
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-crm-surface border border-white/10 px-3 py-1.5 text-xs">
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
          className="bg-crm-surface border border-white/10 px-3 py-1.5 text-xs">
          <option value="all">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <button onClick={exportCsv}
          className="ml-auto border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-white/5">
          Export CSV
        </button>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total"     value={kpis.total}     accent={ACCENT} />
        <KpiCard label="Open"      value={kpis.open}      accent="#f59e0b" />
        <KpiCard label="Overdue"   value={kpis.overdue}   accent="#ef4444" />
        <KpiCard label="Delivered" value={kpis.delivered} accent="#22c55e" />
      </section>

      {/* By status */}
      <section className="border border-white/10 bg-crm-surface p-5">
        <h2 className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4">By Status</h2>
        <div className="space-y-2">
          {STATUSES.map(s => {
            const v = byStatus[s] || 0;
            const pct = (v / maxStatus) * 100;
            return (
              <div key={s} className="flex items-center gap-3">
                <span className="w-20 text-xs uppercase tracking-wider text-white/60">{s}</span>
                <div className="flex-1 h-5 bg-white/5 relative">
                  <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: STATUS_COLOR[s] }} />
                </div>
                <span className="w-10 text-right text-xs tabular-nums">{v}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* By assignee */}
      <section className="border border-white/10 bg-crm-surface p-5">
        <h2 className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4">By Assignee</h2>
        {byAssignee.length === 0 ? (
          <p className="text-white/30 text-xs">No deliverables in range.</p>
        ) : (
          <div className="space-y-3">
            {byAssignee.map(r => (
              <div key={r.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-white/40">
                    {r.total} total · {r.open} open · {r.overdue > 0 && <span className="text-red-400">{r.overdue} overdue · </span>}{r.delivered} delivered
                  </span>
                </div>
                <div className="flex h-3 bg-white/5 overflow-hidden">
                  {STATUSES.map(s => {
                    const v = r.byStatus[s] || 0;
                    if (!v) return null;
                    return <div key={s} title={`${s}: ${v}`} style={{ width: `${(v / maxAssignee) * 100}%`, backgroundColor: STATUS_COLOR[s] }} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 mt-4 pt-3 border-t border-white/5">
          {STATUSES.map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="w-2 h-2" style={{ backgroundColor: STATUS_COLOR[s] }} />
              <span className="text-[10px] uppercase tracking-wider text-white/40">{s}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Table */}
      <section className="border border-white/10 bg-crm-surface">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-[10px] tracking-[0.3em] uppercase text-white/40">Deliverables ({filtered.length})</h2>
          {isLoading && <span className="text-[10px] text-white/30">Loading…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Assignee</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((d: any) => {
                const overdue = d.due_at && new Date(d.due_at) < new Date() && !["uploaded","published"].includes(d.status);
                return (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-2 truncate max-w-[280px]">{d.title || <span className="text-white/30">{d.format}</span>}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-0.5 text-[10px] uppercase" style={{ backgroundColor: `${STATUS_COLOR[d.status as Status]}20`, color: STATUS_COLOR[d.status as Status] }}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-white/60">{d.priority || "—"}</td>
                    <td className="px-4 py-2">{d.assigned_to ? (memberMap.get(d.assigned_to)?.name ?? "—") : <span className="text-white/30">Unassigned</span>}</td>
                    <td className={`px-4 py-2 ${overdue ? "text-red-400" : "text-white/60"}`}>
                      {d.due_at ? new Date(d.due_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-white/60">{d.delivered_at ? new Date(d.delivered_at).toLocaleDateString() : "—"}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No deliverables match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 200 && (
          <div className="px-5 py-2 text-[10px] text-white/30 border-t border-white/10">Showing first 200 of {filtered.length}. Use filters or Export CSV for the full list.</div>
        )}
      </section>

      <div>
        <Link to="/admin/jay" className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white">← Back to Jay's dashboard</Link>
      </div>
    </CrmLayout>
  );
}
