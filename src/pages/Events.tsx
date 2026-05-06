import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import BookingSheet from "@/components/BookingSheet";

type Event = Database["public"]["Tables"]["events"]["Row"];


const YELLOW = "hsl(58 100% 50%)";
const BLACK = "hsl(0 0% 0%)";
const GRAY = "hsl(0 0% 12%)";
const GRAY_2 = "hsl(0 0% 22%)";
const GRAY_TXT = "hsl(0 0% 65%)";

function fmt(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),
    weekday: d.toLocaleString("en-US", { weekday: "short" }).toUpperCase(),
  };
}

// ── Flyer modal ───────────────────────────────────────────────────────────────
function FlyerModal({ ev, onClose }: { ev: Event | null; onClose: () => void }) {
  if (!ev) return null;
  const d = fmt(ev.event_date);
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-2 sm:p-4 md:p-6 backdrop-blur-md animate-fade-up"
      style={{ background: "hsl(0 0% 0% / 0.9)" }} onClick={onClose}>
      <div className="relative w-full h-full grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-2 md:gap-3"
        onClick={e => e.stopPropagation()}>
        {ev.flyer_url && (
          <div className="overflow-hidden min-h-0" style={{ background: GRAY, border: `1px solid ${YELLOW}` }}>
            <img src={ev.flyer_url} alt={ev.title} className="w-full h-full object-contain" />
          </div>
        )}
        <div className="p-5 md:p-7 overflow-y-auto relative min-h-0" style={{ background: GRAY, color: "white", border: `1px solid ${YELLOW}` }}>
          <button onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-sm hover:text-background transition-colors"
            style={{ background: "transparent", color: YELLOW, border: `1px solid ${YELLOW}` }}>✕</button>
          <p className="text-[10px] tracking-[0.5em] uppercase mb-3" style={{ color: YELLOW }}>
            {d.weekday} · {d.month} {d.day} · {d.year}
          </p>
          <h3 className="font-display text-3xl md:text-4xl uppercase leading-[0.9] mb-4">{ev.title}</h3>
          <div className="flex flex-wrap gap-1.5 mb-4 text-[10px] tracking-widest uppercase">
            {ev.doors_time && <span className="px-2 py-1" style={{ border: `1px solid ${GRAY_2}`, color: GRAY_TXT }}>⏱ {ev.doors_time}</span>}
            {ev.venue && <span className="px-2 py-1" style={{ border: `1px solid ${GRAY_2}`, color: GRAY_TXT }}>⌖ {ev.venue}</span>}
            {ev.city && <span className="px-2 py-1" style={{ background: YELLOW, color: BLACK }}>{ev.city}</span>}
          </div>
          {ev.description && <p className="text-sm leading-relaxed mb-5" style={{ color: GRAY_TXT }}>{ev.description}</p>}
          {ev.ticket_url && (
            <a href={ev.ticket_url} target="_blank" rel="noopener noreferrer"
              className="inline-block font-display text-base tracking-[0.2em] uppercase px-5 py-2.5 transition-transform hover:-translate-y-0.5"
              style={{ background: YELLOW, color: BLACK }}>
              Get Tickets →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Booking modal ─────────────────────────────────────────────────────────────
function ServiceList({ onOpen }: { onOpen: () => void }) {
  const services = ["DJ Booking", "Security", "Venue Rental", "Promoter"];
  return (
    <div className="flex flex-col">
      {services.map((s, i) => (
        <button key={s} onClick={onOpen}
          className="group flex items-center justify-between text-left px-3 py-2.5 transition-colors hover:bg-foreground"
          style={{
            color: "white",
            borderTop: i === 0 ? "none" : `1px solid ${GRAY_2}`,
          }}>
          <span className="text-[11px] tracking-[0.25em] uppercase group-hover:text-background">{s}</span>
          <span className="text-xs transition-transform group-hover:translate-x-1" style={{ color: YELLOW }}>→</span>
        </button>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [openFlyer, setOpenFlyer] = useState<Event | null>(null);

  useEffect(() => {
    supabase.from("events").select("*").neq("status", "cancelled").order("event_date", { ascending: false })
      .then(({ data }) => { setEvents((data ?? []) as Event[]); setLoading(false); });
  }, []);

  const upcoming = events.filter(e => e.status === "upcoming")
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const past = events.filter(e => e.status === "past")
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  const [hero, ...rest] = upcoming;
  const heroDate = hero ? fmt(hero.event_date) : null;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col"
      style={{ background: BLACK, color: "white", fontFeatureSettings: '"ss01"' }}>

      {/* Slim header bar */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: GRAY_2 }}>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: YELLOW }} />
          <span className="font-display text-sm tracking-[0.4em] uppercase">Events / Live</span>
        </div>
        <span className="text-[10px] tracking-[0.4em] uppercase" style={{ color: GRAY_TXT }}>
          {upcoming.length.toString().padStart(2, "0")} upcoming · {past.length.toString().padStart(2, "0")} archive
        </span>
      </header>

      {/* Main grid — fits viewport */}
      <main
        className="flex-1 min-h-0 grid gap-3 p-3"
        style={{
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
          gridTemplateRows: "minmax(0, 1.5fr) minmax(0, 1fr)",
        }}
      >
        {/* HERO — Featured flyer (large, dominant) */}
        <section className="relative row-span-2 min-h-0 overflow-hidden"
          style={{ background: GRAY, border: `1px solid ${GRAY_2}` }}>
          {loading ? (
            <div className="h-full w-full animate-pulse" style={{ background: GRAY_2 }} />
          ) : hero && heroDate ? (
            <button onClick={() => setOpenFlyer(hero)} className="group relative h-full w-full block text-left">
              {hero.flyer_url ? (
                <img src={hero.flyer_url} alt={hero.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: GRAY }}>
                  <span className="font-display text-[16rem] leading-none" style={{ color: YELLOW }}>{heroDate.day}</span>
                </div>
              )}

              {/* Top bar overlay */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 z-10"
                style={{ background: "linear-gradient(180deg, hsl(0 0% 0% / 0.85), transparent)" }}>
                <span className="text-[10px] tracking-[0.5em] uppercase" style={{ color: YELLOW }}>▲ Next Transmission</span>
                <span className="text-[10px] tracking-[0.4em] uppercase font-bold">
                  {heroDate.weekday} · {heroDate.month} {heroDate.day}
                </span>
              </div>

              {/* Bottom info overlay */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-5 md:p-6"
                style={{ background: "linear-gradient(0deg, hsl(0 0% 0% / 0.92) 0%, hsl(0 0% 0% / 0.7) 60%, transparent)" }}>
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-3xl md:text-5xl uppercase leading-[0.9] mb-2 line-clamp-2">
                      {hero.title}
                    </h2>
                    <div className="flex flex-wrap gap-1.5 text-[10px] tracking-widest uppercase">
                      {hero.venue && <span style={{ color: GRAY_TXT }}>⌖ {hero.venue}</span>}
                      {hero.city && <span style={{ color: YELLOW }}>· {hero.city}</span>}
                      {hero.doors_time && <span style={{ color: GRAY_TXT }}>· ⏱ {hero.doors_time}</span>}
                    </div>
                  </div>
                  {hero.ticket_url ? (
                    <span className="font-display text-sm tracking-[0.3em] uppercase px-4 py-2 transition-transform group-hover:-translate-y-0.5"
                      style={{ background: YELLOW, color: BLACK }}>
                      Tickets →
                    </span>
                  ) : (
                    <span className="font-display text-sm tracking-[0.3em] uppercase px-4 py-2"
                      style={{ border: `1px solid ${YELLOW}`, color: YELLOW }}>
                      Details →
                    </span>
                  )}
                </div>
              </div>

              {/* Side index */}
              <div className="absolute top-1/2 right-3 -translate-y-1/2 z-10 hidden md:flex flex-col items-end gap-1"
                style={{ writingMode: "vertical-rl" }}>
                <span className="text-[9px] tracking-[0.6em] uppercase" style={{ color: YELLOW }}>FEATURED · 001</span>
              </div>
            </button>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <p className="font-display text-3xl uppercase tracking-[0.3em]" style={{ color: GRAY_TXT }}>// no drops</p>
            </div>
          )}
        </section>

        {/* TOP RIGHT — Upcoming queue */}
        <section className="min-h-0 flex flex-col overflow-hidden"
          style={{ background: GRAY, border: `1px solid ${GRAY_2}` }}>
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: GRAY_2 }}>
            <span className="text-[10px] tracking-[0.4em] uppercase" style={{ color: YELLOW }}>Queue</span>
            <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: GRAY_TXT }}>{rest.length} drops</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse" style={{ background: GRAY_2 }} />
                ))}
              </div>
            ) : rest.length === 0 ? (
              <div className="h-full flex items-center justify-center p-4">
                <p className="text-[10px] tracking-[0.4em] uppercase" style={{ color: GRAY_TXT }}>// queue empty</p>
              </div>
            ) : (
              rest.map((ev, i) => {
                const d = fmt(ev.event_date);
                return (
                  <button key={ev.id} onClick={() => setOpenFlyer(ev)}
                    className="group w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-foreground"
                    style={{ borderTop: i === 0 ? "none" : `1px solid ${GRAY_2}` }}>
                    <div className="shrink-0 w-12 text-center">
                      <div className="font-display text-2xl leading-none group-hover:text-background" style={{ color: YELLOW }}>{d.day}</div>
                      <div className="text-[8px] tracking-[0.3em] mt-0.5 group-hover:text-background" style={{ color: GRAY_TXT }}>{d.month}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm uppercase leading-tight line-clamp-1 group-hover:text-background">{ev.title}</p>
                      <p className="text-[9px] tracking-[0.3em] uppercase mt-0.5 line-clamp-1 group-hover:text-background" style={{ color: GRAY_TXT }}>
                        {[ev.venue, ev.city].filter(Boolean).join(" · ") || "TBA"}
                      </p>
                    </div>
                    <span className="text-xs group-hover:translate-x-1 transition-transform group-hover:text-background" style={{ color: YELLOW }}>→</span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* BOTTOM RIGHT — Hire only */}
        <section className="min-h-0 flex flex-col overflow-hidden" style={{ background: GRAY, border: `1px solid ${GRAY_2}` }}>
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: GRAY_2 }}>
            <span className="text-[10px] tracking-[0.4em] uppercase" style={{ color: YELLOW }}>Hire</span>
            <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: GRAY_TXT }}>book us</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ServiceList onOpen={() => setBookingOpen(true)} />
          </div>
        </section>
      </main>

      <BookingSheet open={bookingOpen} onOpenChange={setBookingOpen} />
      <FlyerModal ev={openFlyer} onClose={() => setOpenFlyer(null)} />
    </div>
  );
}
