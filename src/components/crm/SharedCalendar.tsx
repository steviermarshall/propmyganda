import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  format, addDays, startOfDay, isSameDay, isSameMonth,
  startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek,
} from "date-fns";
import { pullGcal, getGcalSettings, listGcalEvents } from "@/lib/crm/gcal";
import { toast } from "sonner";

type Source = "shoot" | "deliverable" | "booking" | "crm_booking" | "external";

interface Evt {
  id: string;
  source: Source;
  title: string;
  sub: string;
  at: Date;
  color: string;
  htmlLink?: string;
}

const COLORS: Record<Source, string> = {
  shoot:        "#a855f7",
  deliverable:  "#f59e0b",
  booking:      "#3b82f6",
  crm_booking:  "#3b82f6",
  external:     "#9ca3af",
};

const SOURCE_LABEL: Record<Source, string> = {
  shoot: "Shoot",
  deliverable: "Deliverable",
  booking: "Booking",
  crm_booking: "Pipeline",
  external: "External",
};

interface Props {
  accent: string;
  filter?: Source[];
}

async function fetchCalendarData(month: Date): Promise<Evt[]> {
  const since = startOfDay(addDays(startOfMonth(month), -7)).toISOString();
  const until = addDays(endOfMonth(month), 14).toISOString();
  const sinceDate = since.slice(0, 10);

  const [shootsRes, delivRes, bookRes, crmRes, gcalEvents] = await Promise.all([
    (supabase.from("shoots") as any)
      .select("id, shoot_date, scheduled_at, artist_name, location, status")
      .gte("shoot_date", sinceDate).lte("shoot_date", until.slice(0, 10)).limit(500),
    (supabase.from("deliverables") as any)
      .select("id, format, due_at, status")
      .gte("due_at", since).lte("due_at", until).limit(500),
    (supabase.from("bookings") as any)
      .select("id, service, name, artist_name, event_date, event_at, location, is_free")
      .limit(500),
    (supabase.from("crm_bookings") as any)
      .select("id, artist_name, shoot_date, status")
      .gte("shoot_date", sinceDate).limit(500),
    listGcalEvents(since, until),
  ]);

  const all: Evt[] = [];

  (shootsRes.data ?? []).forEach((s: any) => {
    const raw = s.scheduled_at || s.shoot_date;
    if (!raw) return;
    const at = new Date(raw);
    if (isNaN(at.getTime())) return;
    all.push({
      id: `shoot-${s.id}`, source: "shoot",
      title: s.artist_name || "Shoot",
      sub: [s.location, s.status].filter(Boolean).join(" · "),
      at, color: COLORS.shoot,
    });
  });

  (delivRes.data ?? []).forEach((d: any) => {
    if (!d.due_at) return;
    all.push({
      id: `deliv-${d.id}`, source: "deliverable",
      title: d.format || "Deliverable",
      sub: d.status || "",
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
      title: `${b.service?.toUpperCase() ?? "BOOKING"} — ${name}`,
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

  (gcalEvents ?? []).forEach((ev) => {
    if (ev.isPmg) return;
    if (!ev.start) return;
    const at = new Date(ev.start);
    if (isNaN(at.getTime())) return;
    all.push({
      id: `ext-${ev.id}`,
      source: "external",
      title: ev.summary,
      sub: ev.location || "external calendar",
      at,
      color: COLORS.external,
      htmlLink: ev.htmlLink,
    });
  });

  all.sort((a, b) => a.at.getTime() - b.at.getTime());
  return all;
}

export default function SharedCalendar({ accent, filter }: Props) {
  const qc = useQueryClient();
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(startOfDay(new Date()));
  const [gcal, setGcal] = useState<{ calendar_id: string; last_pull_at: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: allEvents = [], isFetching } = useQuery({
    queryKey: ["shared-calendar", viewMonth.toISOString()],
    queryFn: () => fetchCalendarData(viewMonth),
    staleTime: 2 * 60 * 1000,
    onSuccess: () => {
      getGcalSettings().then((s) => {
        setGcal(s);
        const last = s?.last_pull_at ? new Date(s.last_pull_at).getTime() : 0;
        if (Date.now() - last > 5 * 60 * 1000) {
          pullGcal()
            .then(() => getGcalSettings().then(setGcal))
            .catch(() => {});
        }
      });
    },
  } as any);

  const events = filter ? allEvents.filter((e: Evt) => filter.includes(e.source)) : allEvents;

  const monthGrid = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    const weeks: Date[][] = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(cursor);
        cursor = addDays(cursor, 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [viewMonth]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, Evt[]>();
    for (const e of events) {
      const k = format(e.at, "yyyy-MM-dd");
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    }
    return m;
  }, [events]);

  const dayEvents = eventsByDay.get(format(selected, "yyyy-MM-dd")) ?? [];

  async function syncNow() {
    setSyncing(true);
    try {
      const r = await pullGcal();
      toast.success(`Synced · ${r.updated} updated, ${r.skipped} skipped`);
      setGcal(await getGcalSettings());
      qc.invalidateQueries({ queryKey: ["shared-calendar"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally { setSyncing(false); }
  }

  const last = gcal?.last_pull_at ? new Date(gcal.last_pull_at) : null;
  const ago = last ? Math.round((Date.now() - last.getTime()) / 60000) : null;

  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <section className="border border-white/10 bg-crm-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 flex-wrap gap-2">
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
            onClick={() => qc.invalidateQueries({ queryKey: ["shared-calendar"] })}
            disabled={isFetching}
            className="px-2 py-1 text-[10px] uppercase tracking-widest text-white/50 hover:text-white border border-white/10"
          >
            {isFetching ? "…" : "Refresh"}
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

      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="px-3 py-1 text-[10px] uppercase tracking-widest text-white/60 hover:text-white border border-white/10"
        >
          ← Prev
        </button>
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white tracking-wide">{format(viewMonth, "MMMM yyyy")}</h3>
          <button
            onClick={() => { const t = startOfMonth(new Date()); setViewMonth(t); setSelected(startOfDay(new Date())); }}
            className="px-2 py-1 text-[9px] uppercase tracking-widest text-white/40 hover:text-white border border-white/10"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="px-3 py-1 text-[10px] uppercase tracking-widest text-white/60 hover:text-white border border-white/10"
        >
          Next →
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-white/5">
        {weekdayLabels.map((d) => (
          <div key={d} className="px-2 py-2 text-[9px] uppercase tracking-widest text-white/40 text-center border-r border-white/5 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7">
        {monthGrid.map((week, wi) => week.map((d) => {
          const evs = eventsByDay.get(format(d, "yyyy-MM-dd")) ?? [];
          const isSel = isSameDay(d, selected);
          const isToday = isSameDay(d, new Date());
          const inMonth = isSameMonth(d, viewMonth);
          return (
            <button
              key={`${wi}-${d.toISOString()}`}
              onClick={() => setSelected(d)}
              className={`min-h-[88px] p-1.5 border-r border-b border-white/5 last:border-r-0 flex flex-col items-stretch gap-1 text-left transition-colors ${
                isSel ? "bg-white/10" : "hover:bg-white/5"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${isToday ? "" : "text-white/70"}`}
                  style={isToday ? {
                    color: "#000",
                    backgroundColor: accent,
                    borderRadius: "4px",
                    padding: "0 6px",
                  } : {}}
                >
                  {format(d, "d")}
                </span>
                {evs.length > 0 && (
                  <span className="text-[9px] text-white/40">{evs.length}</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {evs.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="text-[9px] truncate leading-tight px-1 py-0.5 rounded-sm"
                    style={{ backgroundColor: `${e.color}33`, color: e.color }}
                    title={e.title}
                  >
                    {e.title}
                  </div>
                ))}
                {evs.length > 3 && (
                  <div className="text-[9px] text-white/40 px-1">+{evs.length - 3} more</div>
                )}
              </div>
            </button>
          );
        }))}
      </div>

      {/* Selected day events */}
      <div className="p-4 min-h-[160px] border-t border-white/10">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">
          {format(selected, "EEEE, MMM d, yyyy")} · {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
        </p>
        {dayEvents.length === 0 ? (
          <p className="text-white/30 text-sm">No events scheduled.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {dayEvents.map((e) => {
              const inner = (
                <div className="py-2 flex items-start gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{e.title}</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40">
                      {format(e.at, "h:mm a")} · {SOURCE_LABEL[e.source]}{e.sub ? ` · ${e.sub}` : ""}
                    </div>
                  </div>
                </div>
              );
              return e.htmlLink ? (
                <a key={e.id} href={e.htmlLink} target="_blank" rel="noreferrer"
                  className="block hover:bg-white/5 transition-colors">
                  {inner}
                </a>
              ) : (
                <div key={e.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-2 border-t border-white/10 text-[10px] uppercase tracking-widest text-white/50">
        {(["shoot","deliverable","booking","crm_booking","external"] as Source[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[s] }} />
            {SOURCE_LABEL[s]}
          </span>
        ))}
      </div>
    </section>
  );
}
