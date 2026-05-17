import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { pullGcal, getGcalSettings } from "@/lib/crm/gcal";
import { toast } from "sonner";

type Source = "shoot" | "deliverable" | "booking" | "crm_booking";

interface Evt {
  id: string;
  source: Source;
  title: string;
  sub: string;
  at: Date;
  color: string;
}

const COLORS: Record<Source, string> = {
  shoot:        "#a855f7", // Jay purple
  deliverable:  "#f59e0b", // amber
  booking:      "#3b82f6", // Mike blue
  crm_booking:  "#3b82f6",
};

const SOURCE_LABEL: Record<Source, string> = {
  shoot: "Shoot",
  deliverable: "Deliverable",
  booking: "Booking",
  crm_booking: "Pipeline",
};

interface Props {
  accent: string;
  days?: number;        // window length, default 21
  filter?: Source[];    // optional source whitelist
}

export default function SharedCalendar({ accent, days = 21, filter }: Props) {
  const [events, setEvents] = useState<Evt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Date>(startOfDay(new Date()));
  const [gcal, setGcal] = useState<{ calendar_id: string; last_pull_at: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function loadAll() {
    setLoading(true);
    const since = startOfDay(addDays(new Date(), -1)).toISOString();
    const until = addDays(new Date(), days + 7).toISOString();

    const [shootsRes, delivRes, bookRes, crmRes] = await Promise.all([
      (supabase.from("shoots") as any)
        .select("id, scheduled_at, shoot_date, title, location, status")
        .gte("scheduled_at", since).lte("scheduled_at", until).limit(200),
      (supabase.from("deliverables") as any)
        .select("id, title, due_at, status, format")
        .gte("due_at", since).lte("due_at", until).limit(200),
      (supabase.from("bookings") as any)
        .select("id, service, name, artist_name, event_date, event_at, location, is_free")
        .limit(300),
      (supabase.from("crm_bookings") as any)
        .select("id, artist_name, shoot_date, status")
        .gte("shoot_date", since.slice(0, 10)).limit(200),
    ]);

    const all: Evt[] = [];

    (shootsRes.data ?? []).forEach((s: any) => {
      const at = s.scheduled_at ? new Date(s.scheduled_at) : (s.shoot_date ? new Date(s.shoot_date) : null);
      if (!at) return;
      all.push({
        id: `shoot-${s.id}`, source: "shoot",
        title: s.title || "Shoot",
        sub: [s.location, s.status].filter(Boolean).join(" · "),
        at, color: COLORS.shoot,
      });
    });

    (delivRes.data ?? []).forEach((d: any) => {
      if (!d.due_at) return;
      all.push({
        id: `deliv-${d.id}`, source: "deliverable",
        title: d.title || "Deliverable",
        sub: [d.format, d.status].filter(Boolean).join(" · "),
        at: new Date(d.due_at), color: COLORS.deliverable,
      });
    });

    (bookRes.data ?? []).forEach((b: any) => {
      const raw = b.event_at || b.event_date;
      if (!raw) return;
      const at = new Date(raw);
      if (isNaN(at.getTime())) return;
      const name = b.artist_name || b.name || "Booking";
      all.push({
        id: `book-${b.id}`, source: "booking",
        title: `${b.service?.toUpperCase() ?? "BOOKING"} — ${name}${b.is_free ? " (free)" : ""}`,
        sub: b.location || "",
        at, color: COLORS.booking,
      });
    });

    (crmRes.data ?? []).forEach((c: any) => {
      if (!c.shoot_date) return;
      all.push({
        id: `crm-${c.id}`, source: "crm_booking",
        title: `${c.artist_name} — pipeline`,
        sub: c.status, at: new Date(c.shoot_date), color: COLORS.crm_booking,
      });
    });

    all.sort((a, b) => a.at.getTime() - b.at.getTime());
    setEvents(filter ? all.filter(e => filter.includes(e.source)) : all);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    getGcalSettings().then((s) => {
      setGcal(s);
      // Auto-pull if never synced or last pull was > 5 minutes ago
      const last = s?.last_pull_at ? new Date(s.last_pull_at).getTime() : 0;
      if (Date.now() - last > 5 * 60 * 1000) {
        pullGcal()
          .then(() => getGcalSettings().then(setGcal))
          .catch(() => { /* silent — user can click Sync GCal to see the error */ });
      }
    });
  /* eslint-disable-next-line */ }, []);

  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => startOfDay(addDays(new Date(), i))), [days]);
  const countByDay = useMemo(() => {
    const m = new Map<string, Evt[]>();
    for (const e of events) {
      const k = format(e.at, "yyyy-MM-dd");
      const arr = m.get(k) ?? []; arr.push(e); m.set(k, arr);
    }
    return m;
  }, [events]);

  const dayEvents = countByDay.get(format(selected, "yyyy-MM-dd")) ?? [];

  async function syncNow() {
    setSyncing(true);
    try {
      const r = await pullGcal();
      toast.success(`Synced · ${r.updated} updated, ${r.skipped} skipped`);
      setGcal(await getGcalSettings());
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally { setSyncing(false); }
  }

  const last = gcal?.last_pull_at ? new Date(gcal.last_pull_at) : null;
  const ago = last ? Math.round((Date.now() - last.getTime()) / 60000) : null;

  return (
    <section className="border border-white/10 bg-crm-surface">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
          <span className="text-white/60">Shared Calendar</span>
          <span className="text-white/30">·</span>
          <span className="text-white/40">{gcal?.calendar_id ?? "primary"}</span>
          <span className="text-white/30">·</span>
          <span className="text-white/40">
            {ago == null ? "never synced" : ago < 1 ? "just now" : `${ago}m ago`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            disabled={loading}
            className="px-2 py-1 text-[10px] uppercase tracking-widest text-white/50 hover:text-white border border-white/10"
          >
            {loading ? "…" : "Refresh"}
          </button>
          <button
            onClick={syncNow}
            disabled={syncing}
            className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-black disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            {syncing ? "Syncing…" : "Sync GCal"}
          </button>
        </div>
      </div>

      {/* Day strip */}
      <div className="flex overflow-x-auto border-b border-white/5">
        {dayList.map((d) => {
          const evs = countByDay.get(format(d, "yyyy-MM-dd")) ?? [];
          const isSel = isSameDay(d, selected);
          const isToday = isSameDay(d, new Date());
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelected(d)}
              className={`shrink-0 w-16 py-3 flex flex-col items-center gap-1 border-r border-white/5 text-xs transition-colors ${
                isSel ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"
              }`}
            >
              <span className="text-[9px] uppercase tracking-widest text-white/40">{format(d, "EEE")}</span>
              <span className={`text-lg font-bold ${isToday ? "" : ""}`} style={isToday ? { color: accent } : {}}>
                {format(d, "d")}
              </span>
              <div className="flex gap-0.5 h-1.5">
                {evs.slice(0, 4).map((e, i) => (
                  <span key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: e.color }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      <div className="p-4 min-h-[200px]">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">
          {format(selected, "EEEE, MMM d")} · {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
        </p>
        {dayEvents.length === 0 ? (
          <p className="text-white/30 text-sm">No events scheduled.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {dayEvents.map((e) => (
              <div key={e.id} className="py-2 flex items-start gap-3">
                <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{e.title}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">
                    {format(e.at, "h:mm a")} · {SOURCE_LABEL[e.source]}{e.sub ? ` · ${e.sub}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-2 border-t border-white/10 text-[10px] uppercase tracking-widest text-white/50">
        {(["shoot","deliverable","booking","crm_booking"] as Source[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[s] }} />
            {SOURCE_LABEL[s]}
          </span>
        ))}
      </div>
    </section>
  );
}
