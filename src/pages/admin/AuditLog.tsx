import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";

const AUDIT = "#FFB800";
const PAGE_SIZE = 50;

const ENTITY_TYPES = [
  { value: "", label: "All entities" },
  { value: "crm_booking",          label: "CRM Booking" },
  { value: "artist_prospect",      label: "Artist Prospect" },
  { value: "distro_artist",        label: "Distro Artist" },
  { value: "royalty_payment",      label: "Royalty Payment" },
  { value: "sponsor_pipeline",     label: "Sponsor Pipeline" },
  { value: "sponsor_brand",        label: "Sponsor Brand" },
  { value: "sponsor_contact",      label: "Sponsor Contact" },
  { value: "sponsor_deal",         label: "Sponsor Deal" },
  { value: "store_order",          label: "Store Order" },
  { value: "shoot",                label: "Shoot" },
  { value: "deliverable",          label: "Deliverable" },
  { value: "media_agency_project", label: "Media Agency" },
  { value: "article",              label: "Article" },
  { value: "newsletter_send",      label: "Newsletter" },
  { value: "booking",              label: "Public Booking" },
];

const ACTIONS = [
  { value: "",               label: "All actions" },
  { value: "created",        label: "Created" },
  { value: "updated",        label: "Updated" },
  { value: "status_changed", label: "Status Changed" },
  { value: "deleted",        label: "Deleted" },
  { value: "contacted",      label: "Contacted" },
  { value: "pitched",        label: "Pitched" },
  { value: "assigned",       label: "Assigned" },
  { value: "closed",         label: "Closed" },
];

const ACTION_COLOR: Record<string, string> = {
  created:        "text-emerald-400 border-emerald-400/30",
  updated:        "text-sky-400 border-sky-400/30",
  status_changed: "text-yellow-400 border-yellow-400/30",
  deleted:        "text-red-400 border-red-400/30",
  contacted:      "text-fuchsia-400 border-fuchsia-400/30",
  pitched:        "text-orange-400 border-orange-400/30",
  assigned:       "text-indigo-400 border-indigo-400/30",
  closed:         "text-lime-400 border-lime-400/30",
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Human-readable one-liner from a trigger payload. */
function summarize(row: any): string {
  const p = row.payload ?? {};
  if (row.action === "status_changed" && (p.from || p.to)) {
    return `${p.field ?? "status"}: ${p.from ?? "—"} → ${p.to ?? "—"}`;
  }
  if (row.action === "updated" && p.changes) {
    const keys = Object.keys(p.changes);
    return `changed ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ` +${keys.length - 4} more` : ""}`;
  }
  if (row.action === "created" || row.action === "deleted") {
    const name =
      p.name ?? p.artist_name ?? p.brand_name ?? p.title ?? p.client_name ?? p.format;
    return name ? String(name) : "";
  }
  const keys = Object.keys(p);
  return keys.length ? `${keys.slice(0, 4).join(", ")}` : "";
}

export default function AuditLog() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [memberId, setMemberId] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["audit-members"],
    queryFn: async () => {
      const { data } = await (supabase.from("team_members") as any)
        .select("id,name,role").order("name");
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", entityType, action, memberId, page],
    queryFn: async () => {
      let q = (supabase.from("activity_log") as any)
        .select("*, team_members(name,role)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (entityType) q = q.eq("entity_type", entityType);
      if (action) q = q.eq("action", action);
      if (memberId === "system") q = q.is("team_member_id", null);
      else if (memberId) q = q.eq("team_member_id", memberId);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectCls =
    "bg-black border border-white/10 text-white text-xs px-3 py-2 uppercase tracking-widest";

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(0); };
  }

  return (
    <CrmLayout title="Audit Log" accent={AUDIT}>
      <section className="flex flex-wrap items-center gap-3">
        <select value={entityType} onChange={(e) => resetPage(setEntityType)(e.target.value)} className={selectCls}>
          {ENTITY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={action} onChange={(e) => resetPage(setAction)(e.target.value)} className={selectCls}>
          {ACTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={memberId} onChange={(e) => resetPage(setMemberId)(e.target.value)} className={selectCls}>
          <option value="">All members</option>
          <option value="system">System / Public</option>
          {members.map((m: any) => (
            <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
          ))}
        </select>
        <span className="text-white/30 text-[10px] uppercase tracking-widest ml-auto">
          {total} events
        </span>
      </section>

      <section className="border border-white/10 bg-crm-surface">
        {isLoading ? (
          <p className="text-white/40 text-sm p-6">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="p-6 space-y-2">
            <p className="text-white/40 text-sm">No audit events found.</p>
            <p className="text-white/25 text-[11px]">
              If this is unexpected, make sure migration{" "}
              <span className="text-white/50">20260720_014_audit_activity_log.sql</span>{" "}
              has been run — it installs the database triggers that record activity.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map((r: any) => {
              const badge = ACTION_COLOR[r.action] ?? "text-white/50 border-white/20";
              const isOpen = expanded === r.id;
              return (
                <div key={r.id} className="px-4 py-3 hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : r.id)}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-white/30 text-[10px] w-16 shrink-0" title={new Date(r.created_at).toLocaleString()}>
                      {timeAgo(r.created_at)}
                    </span>
                    <span className="text-xs font-bold w-24 shrink-0 truncate" style={{ color: AUDIT }}>
                      {r.team_members?.name ?? "System"}
                    </span>
                    <span className={`text-[9px] uppercase tracking-widest border px-1.5 py-0.5 shrink-0 ${badge}`}>
                      {r.action.replace("_", " ")}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-white/40 shrink-0">
                      {r.entity_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[11px] text-white/60 truncate flex-1 min-w-[120px]">
                      {summarize(r)}
                    </span>
                  </div>
                  {isOpen && (
                    <pre className="mt-3 text-[10px] text-white/50 bg-black/40 border border-white/5 p-3 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify({ entity_id: r.entity_id, ...r.payload }, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {pages > 1 && (
        <section className="flex items-center justify-between">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="text-[10px] uppercase tracking-widest border border-white/10 px-3 py-2 text-white/50 hover:text-white disabled:opacity-20"
          >
            ← Newer
          </button>
          <span className="text-white/30 text-[10px] uppercase tracking-widest">
            Page {page + 1} / {pages}
          </span>
          <button
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="text-[10px] uppercase tracking-widest border border-white/10 px-3 py-2 text-white/50 hover:text-white disabled:opacity-20"
          >
            Older →
          </button>
        </section>
      )}
    </CrmLayout>
  );
}
