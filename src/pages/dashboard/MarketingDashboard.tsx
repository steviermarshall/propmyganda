import { useEffect, useState } from "react";
import DashLayout from "@/components/dashboard/DashLayout";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Metric = Database["public"]["Tables"]["social_metrics"]["Row"];
type Publication = Database["public"]["Tables"]["publications"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "text-pink-400",
  youtube:   "text-red-400",
  spotify:   "text-green-400",
  tiktok:    "text-cyan-400",
  twitter:   "text-sky-400",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function MarketingDashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tab, setTab] = useState<"metrics" | "publications" | "events">("metrics");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("social_metrics").select("*").order("recorded_at", { ascending: false }).limit(20),
      supabase.from("publications").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*").order("event_date", { ascending: false }),
    ]).then(([m, p, e]) => {
      setMetrics((m.data ?? []) as Metric[]);
      setPubs((p.data ?? []) as Publication[]);
      setEvents((e.data ?? []) as Event[]);
      setLoading(false);
    });
  }, []);

  async function toggleFeatured(id: string, current: boolean) {
    await supabase.from("publications").update({ featured: !current }).eq("id", id);
    setPubs((prev) => prev.map((p) => (p.id === id ? { ...p, featured: !current } : p)));
  }

  async function togglePublished(pub: Publication) {
    const published_at = pub.published_at ? null : new Date().toISOString();
    await supabase.from("publications").update({ published_at }).eq("id", pub.id);
    setPubs((prev) => prev.map((p) => (p.id === pub.id ? { ...p, published_at } : p)));
  }

  return (
    <DashLayout title="Marketing">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10">
          {(["metrics", "publications", "events"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                tab === t ? "text-electric border-b-2 border-electric -mb-px" : "text-white/40 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <div className="text-white/40 text-sm">Loading…</div>}

        {/* Social Metrics */}
        {!loading && tab === "metrics" && (
          <div>
            {metrics.length === 0 && (
              <p className="text-white/40 text-sm">No metrics yet. Run the sync-social-metrics Edge Function to populate.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {metrics.map((m) => (
                <div key={m.id} className="border border-white/10 bg-white/[0.02] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-widest ${PLATFORM_COLOR[m.platform] ?? "text-white"}`}>
                      {m.platform}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {new Date(m.recorded_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-3xl font-display">{fmt(m.followers)}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Followers</p>
                  {m.streams_30d !== null && (
                    <p className="text-xs text-white/60">{fmt(m.streams_30d)} streams (30d)</p>
                  )}
                  {m.engagement_rate !== null && (
                    <p className="text-xs text-white/60">{m.engagement_rate}% engagement</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Publications */}
        {!loading && tab === "publications" && (
          <div className="space-y-3">
            {pubs.map((pub) => (
              <div key={pub.id} className="border border-white/10 bg-white/[0.02] p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-white/40 border border-white/10 px-1.5 py-0.5">{pub.category}</span>
                    {pub.featured && <span className="text-[10px] text-electric uppercase tracking-wider">Featured</span>}
                    {!pub.published_at && <span className="text-[10px] text-yellow-400/70 uppercase tracking-wider">Draft</span>}
                  </div>
                  <p className="font-bold text-sm truncate">{pub.title}</p>
                  <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{pub.excerpt}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleFeatured(pub.id, pub.featured)}
                    className={`text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
                      pub.featured ? "border-electric text-electric" : "border-white/10 text-white/40 hover:border-white/30"
                    }`}
                  >
                    {pub.featured ? "Featured" : "Feature"}
                  </button>
                  <button
                    onClick={() => togglePublished(pub)}
                    className={`text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
                      pub.published_at ? "border-green-500/40 text-green-400" : "border-white/10 text-white/40 hover:border-white/30"
                    }`}
                  >
                    {pub.published_at ? "Live" : "Publish"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Events */}
        {!loading && tab === "events" && (
          <div className="space-y-3">
            {events.length === 0 && <p className="text-white/40 text-sm">No events yet.</p>}
            {events.map((ev) => (
              <div key={ev.id} className="border border-white/10 bg-white/[0.02] p-4 flex items-center gap-4">
                <div className="text-center shrink-0 w-12">
                  <p className="text-xl font-display">{new Date(ev.event_date).getDate()}</p>
                  <p className="text-[10px] text-white/40 uppercase">{new Date(ev.event_date).toLocaleString("en-US", { month: "short" })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{ev.title}</p>
                  <p className="text-white/40 text-xs">{ev.venue ?? "—"} · {ev.city ?? "—"}</p>
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 border shrink-0 ${
                  ev.status === "upcoming" ? "border-green-500/40 text-green-400" :
                  ev.status === "past" ? "border-white/10 text-white/30" :
                  "border-red-500/40 text-red-400"
                }`}>
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashLayout>
  );
}
