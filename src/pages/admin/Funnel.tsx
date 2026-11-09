import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import { TIERS } from "@/lib/tiers";

const ACCENT = "#FFD230";
// Newer tables than the generated types; untyped client.
const db = supabase as unknown as SupabaseClient;

const STEP_NAMES = ["", "Tier", "Details", "Upload", "Schedule", "Pay", "Paid"];

interface Ev { visitor: string; step: number; tier: string | null; created_at: string }
interface Ord { id: string; created_at: string; status: string; tier: string; last_step: number | null; email: string; artist_name: string; total_cents: number; paid_at: string | null; followups: Record<string, string> | null; catalogue_no: string | null }

function pct(a: number, b: number) { return b ? `${Math.round((a / b) * 100)}%` : "—"; }

export default function Funnel() {
  const [days, setDays] = useState(30);
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: events = [] } = useQuery({
    queryKey: ["funnel-events", days],
    queryFn: async () => {
      const { data, error } = await db.from("funnel_events").select("visitor,step,tier,created_at").gte("created_at", since).limit(20000);
      if (error) throw new Error(error.message);
      return (data ?? []) as Ev[];
    },
  });
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["funnel-orders", days],
    queryFn: async () => {
      const { data, error } = await db.from("onboarding_orders").select("id,created_at,status,tier,last_step,email,artist_name,total_cents,paid_at,followups,catalogue_no").gte("created_at", since).order("created_at", { ascending: false }).limit(2000);
      if (error) throw new Error(error.message);
      return (data ?? []) as Ord[];
    },
  });

  // Unique visitors who reached each step (events), then orders by furthest step, then paid.
  const reached = [1, 2, 3, 4, 5].map((st) => new Set(events.filter((e) => e.step >= st).map((e) => e.visitor)).size);
  const paid = orders.filter((o) => o.paid_at).length;
  const started = reached[0];
  const byTier = TIERS.map((t) => {
    const os = orders.filter((o) => o.tier === t.id);
    const p = os.filter((o) => o.paid_at);
    return { t, drafts: os.length, paid: p.length, revenue: p.reduce((s, o) => s + o.total_cents, 0) };
  }).filter((r) => r.drafts > 0);
  const stalled = orders.filter((o) => !o.paid_at && !["cancelled", "done"].includes(o.status));

  return (
    <CrmLayout title="Funnel" accent={ACCENT}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">/start funnel</h1>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)} className="border px-3 py-1 text-xs uppercase tracking-widest" style={{ borderColor: days === d ? ACCENT : "rgba(255,255,255,0.2)", color: days === d ? ACCENT : "#fff" }}>{d} days</button>
            ))}
          </div>
        </div>
        <p className="mb-8 text-xs opacity-50">Where people stop. Visitors are anonymous per-device ids. A step counts once a visitor reaches it. Paid comes from the orders table.</p>

        <ol className="grid gap-px bg-white/15 sm:grid-cols-3 lg:grid-cols-6">
          {reached.map((n, i) => (
            <li key={i} className="bg-black p-4">
              <span className="block text-[10px] uppercase tracking-widest opacity-60">{String(i + 1).padStart(2, "0")} {STEP_NAMES[i + 1]}</span>
              <span className="mt-1 block text-3xl font-bold tabular-nums">{n}</span>
              <span className="block text-xs opacity-50">{i === 0 ? "started" : `${pct(n, reached[i - 1])} of previous · ${pct(n, started)} of start`}</span>
            </li>
          ))}
          <li className="bg-black p-4" style={{ boxShadow: `inset 0 2px 0 ${ACCENT}` }}>
            <span className="block text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>06 Paid</span>
            <span className="mt-1 block text-3xl font-bold tabular-nums">{paid}</span>
            <span className="block text-xs opacity-50">{pct(paid, reached[4])} of pay · {pct(paid, started)} of start</span>
          </li>
        </ol>

        <h2 className="mt-10 mb-3 text-lg font-bold">By plan</h2>
        {byTier.length === 0 ? <p className="text-sm opacity-50">No orders in this window.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[10px] uppercase tracking-widest opacity-60"><th className="py-2">Plan</th><th>Started details</th><th>Paid</th><th>Rate</th><th>Revenue</th></tr></thead>
            <tbody>
              {byTier.map(({ t, drafts, paid: p, revenue }) => (
                <tr key={t.id} className="border-t border-white/10"><td className="py-2">{t.name}</td><td>{drafts}</td><td>{p}</td><td>{pct(p, drafts)}</td><td>${(revenue / 100).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 className="mt-10 mb-1 text-lg font-bold">Stopped before paying</h2>
        <p className="mb-3 text-xs opacity-50">Recovery emails go out automatically at 1 hour and 24 hours. The ticks show which went. Reply to the artist directly to pick one up by hand.</p>
        {isLoading ? <p className="text-sm opacity-50">Loading…</p> : stalled.length === 0 ? <p className="text-sm opacity-50">Nobody stalled in this window.</p> : (
          <ul className="space-y-1">
            {stalled.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-white/15 px-3 py-2 text-sm">
                <span className="font-semibold">{o.artist_name}</span>
                <a href={`mailto:${o.email}`} className="text-xs underline opacity-70">{o.email}</a>
                <span className="text-[10px] uppercase tracking-widest opacity-60">{TIERS.find((t) => t.id === o.tier)?.name ?? o.tier}</span>
                <span className="text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>stopped at {STEP_NAMES[o.last_step ?? 2]}</span>
                <span className="ml-auto text-xs opacity-40">{new Date(o.created_at).toLocaleString()}</span>
                <span className="text-[10px] uppercase tracking-widest opacity-60">{o.followups?.recovery1 ? "✓ 1h" : "· 1h"} {o.followups?.recovery2 ? "✓ 24h" : "· 24h"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CrmLayout>
  );
}
