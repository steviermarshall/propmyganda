import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import BookingSheet from "@/components/BookingSheet";

type Event = Database["public"]["Tables"]["events"]["Row"];
type IgPost = Database["public"]["Tables"]["instagram_posts"]["Row"];

const YELLOW = "hsl(58 100% 50%)";
const GRAY = "hsl(0 0% 18%)";
const GRAY_LIGHT = "hsl(0 0% 32%)";
const BLACK = "hsl(0 0% 0%)";

function fmt(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),
  };
}

function getEmbedUrl(url: string) {
  const [base, query] = url.split("?");
  const clean = base.replace(/\/$/, "");
  return query ? `${clean}/embed/captioned/?${query}` : `${clean}/embed/captioned/`;
}

// ── Reusable comic panel box ──────────────────────────────────────────────────
function Panel({
  title, accent = YELLOW, children, className = "",
}: { title: string; accent?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative flex flex-col bg-background border-[3px] border-foreground overflow-hidden ${className}`}
      style={{ boxShadow: `6px 6px 0 0 ${accent}` }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b-[3px] border-foreground"
        style={{ background: BLACK, color: "white" }}>
        <span className="font-display text-xs tracking-[0.35em] uppercase">// {title}</span>
        <span className="font-display text-xs" style={{ color: accent }}>◆</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

// ── Featured flyer (no internal scroll) ───────────────────────────────────────
function HeroFlyer({ ev, onOpen }: { ev: Event; onOpen: (ev: Event) => void }) {
  const d = fmt(ev.event_date);
  return (
    <div className="relative h-full w-full flex flex-col" style={{ background: YELLOW }}>
      <div className="absolute inset-0 opacity-20 halftone pointer-events-none" />
      <div className="relative flex-1 min-h-0 grid grid-rows-[auto_1fr_auto] gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="bg-foreground text-background px-2 py-0.5 font-display text-[10px] tracking-[0.4em] uppercase">
            ▲ Next
          </span>
          <span className="bg-background border-[2px] border-foreground px-2 py-0.5 font-display text-[10px] tracking-[0.3em]">
            {d.month} {d.day} · {d.year}
          </span>
        </div>

        <button onClick={() => onOpen(ev)}
          className="relative bg-background border-[3px] border-foreground overflow-hidden min-h-0 group"
          style={{ boxShadow: `4px 4px 0 0 ${BLACK}` }}>
          {ev.flyer_url ? (
            <img src={ev.flyer_url} alt={ev.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full halftone flex items-center justify-center">
              <span className="font-display text-[8rem] leading-none">{d.day}</span>
            </div>
          )}
        </button>

        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-2xl md:text-3xl uppercase leading-none line-clamp-2">{ev.title}</h2>
          <div className="flex flex-wrap gap-1">
            {ev.venue && <span className="bg-foreground text-background px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase">⌖ {ev.venue}</span>}
            {ev.city && <span className="bg-background border border-foreground px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase">{ev.city}</span>}
            {ev.doors_time && <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase" style={{ background: BLACK, color: "white" }}>⏱ {ev.doors_time}</span>}
          </div>
          {ev.ticket_url && (
            <a href={ev.ticket_url} target="_blank" rel="noopener noreferrer"
              className="self-start font-display text-sm tracking-wider uppercase px-3 py-1.5 bg-foreground text-background border-[2px] border-foreground hover:-translate-y-0.5 transition-transform"
              style={{ boxShadow: `3px 3px 0 0 ${BLACK}` }}>
              ▶ Tickets →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty state hero ──────────────────────────────────────────────────────────
function EmptyHero() {
  return (
    <div className="relative h-full w-full flex items-center justify-center" style={{ background: YELLOW }}>
      <div className="absolute inset-0 opacity-25 halftone" />
      <h2 className="relative font-display text-5xl uppercase text-glitch text-center leading-none">No<br/>Drops<br/>Yet</h2>
    </div>
  );
}

// ── Upcoming polaroid mini ────────────────────────────────────────────────────
function FlyerMini({ ev, idx, onOpen }: { ev: Event; idx: number; onOpen: (ev: Event) => void }) {
  const d = fmt(ev.event_date);
  const tilts = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];
  const tilt = tilts[idx % tilts.length];
  return (
    <button onClick={() => onOpen(ev)}
      className={`group shrink-0 w-[150px] bg-background border-[3px] border-foreground p-1.5 ${tilt} transition-transform hover:rotate-0 hover:-translate-y-1 hover:scale-105`}
      style={{ boxShadow: `4px 4px 0 0 ${BLACK}` }}>
      {ev.flyer_url ? (
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          <img src={ev.flyer_url} alt={ev.title} className="w-full h-full object-cover" />
          <div className="absolute top-1 left-1 bg-foreground text-background px-1.5 py-0.5 font-display text-[10px] tracking-wider">
            {d.month} {d.day}
          </div>
        </div>
      ) : (
        <div className="aspect-[3/4] flex items-center justify-center" style={{ background: YELLOW }}>
          <span className="font-display text-5xl">{d.day}</span>
        </div>
      )}
      <p className="px-1 pt-1.5 font-display text-[11px] uppercase leading-tight line-clamp-2 text-left">{ev.title}</p>
    </button>
  );
}

// ── Past polaroid mini ────────────────────────────────────────────────────────
function PastMini({ ev, idx }: { ev: Event; idx: number }) {
  const d = fmt(ev.event_date);
  const tilt = ["-rotate-1", "rotate-1"][idx % 2];
  return (
    <div className={`shrink-0 w-[110px] bg-background border-[2px] border-foreground p-1 ${tilt}`}
      style={{ boxShadow: `3px 3px 0 0 ${GRAY}` }}>
      {ev.flyer_url ? (
        <div className="aspect-[3/4] overflow-hidden">
          <img src={ev.flyer_url} alt={ev.title} className="w-full h-full object-cover grayscale" />
        </div>
      ) : (
        <div className="aspect-[3/4] halftone flex items-center justify-center">
          <span className="font-display text-3xl">{d.day}</span>
        </div>
      )}
      <p className="text-[8px] font-black tracking-widest uppercase mt-1 px-0.5">{d.month} · {d.year}</p>
      <p className="font-display text-[10px] uppercase leading-none px-0.5 pb-0.5 line-clamp-2">{ev.title}</p>
    </div>
  );
}

// ── Services panel content ────────────────────────────────────────────────────
function ServicesContent({ onOpen }: { onOpen: () => void }) {
  const services = [
    { label: "DJ", icon: "♪" },
    { label: "Security", icon: "✺" },
    { label: "Venue", icon: "⌖" },
    { label: "Promoter", icon: "▲" },
  ];
  return (
    <div className="h-full grid grid-cols-2 gap-2 p-2">
      {services.map((s) => (
        <button key={s.label} onClick={onOpen}
          className="flex flex-col items-center justify-center bg-background border-[2px] border-foreground hover:bg-foreground hover:text-background transition-colors"
          style={{ boxShadow: `3px 3px 0 0 ${YELLOW}` }}>
          <span className="font-display text-2xl leading-none">{s.icon}</span>
          <span className="text-[9px] font-black tracking-widest uppercase mt-1">{s.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Flyer modal ───────────────────────────────────────────────────────────────
function FlyerModal({ ev, onClose }: { ev: Event | null; onClose: () => void }) {
  if (!ev) return null;
  const d = fmt(ev.event_date);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-foreground/85 backdrop-blur-sm animate-fade-up"
      onClick={onClose}>
      <div className="relative max-w-3xl w-full grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-4 max-h-[90vh]"
        onClick={e => e.stopPropagation()}>
        {ev.flyer_url && (
          <div className="bg-background border-[4px] border-foreground overflow-hidden max-h-[90vh]"
            style={{ boxShadow: `8px 8px 0 0 ${YELLOW}` }}>
            <img src={ev.flyer_url} alt={ev.title} className="w-full h-full object-contain max-h-[90vh]" />
          </div>
        )}
        <div className="bg-background border-[4px] border-foreground p-5 overflow-y-auto relative"
          style={{ boxShadow: `8px 8px 0 0 ${YELLOW}` }}>
          <button onClick={onClose}
            className="absolute -top-4 -right-4 z-10 w-10 h-10 bg-foreground text-background font-display text-xl flex items-center justify-center border-[3px] border-foreground"
            style={{ boxShadow: `3px 3px 0 0 ${YELLOW}` }}>✕</button>
          <p className="text-[10px] tracking-[0.5em] uppercase font-bold inline-block bg-foreground text-background px-2 py-1 mb-3">
            {d.month} {d.day} · {d.year}
          </p>
          <h3 className="font-display text-3xl uppercase leading-[0.9] mb-3">{ev.title}</h3>
          <div className="flex flex-wrap gap-1 mb-3">
            {ev.doors_time && <span className="bg-foreground text-background px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">⏱ {ev.doors_time}</span>}
            {ev.venue && <span className="border-2 border-foreground px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">⌖ {ev.venue}</span>}
            {ev.city && <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase" style={{ background: BLACK, color: "white" }}>{ev.city}</span>}
          </div>
          {ev.description && <p className="text-sm leading-relaxed mb-4">{ev.description}</p>}
          {ev.ticket_url && (
            <a href={ev.ticket_url} target="_blank" rel="noopener noreferrer"
              className="inline-block font-display text-lg tracking-wider uppercase px-4 py-2 bg-foreground text-background border-[3px] border-foreground"
              style={{ boxShadow: `5px 5px 0 0 ${YELLOW}` }}>
              ▶ Tickets →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page (single viewport, no page scroll) ────────────────────────────────────
export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [igPosts, setIgPosts] = useState<IgPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [igLoading, setIgLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [openFlyer, setOpenFlyer] = useState<Event | null>(null);

  useEffect(() => {
    supabase.from("events").select("*").neq("status", "cancelled").order("event_date", { ascending: false })
      .then(({ data }) => { setEvents((data ?? []) as Event[]); setLoading(false); });
    supabase.from("instagram_posts").select("*").eq("active", true)
      .order("display_order", { ascending: true }).order("created_at", { ascending: false })
      .then(({ data }) => { setIgPosts((data ?? []) as IgPost[]); setIgLoading(false); });
  }, []);

  const upcoming = events.filter(e => e.status === "upcoming")
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const past = events.filter(e => e.status === "past")
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  const [hero, ...rest] = upcoming;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col"
      style={{ background: BLACK, color: "white" }}>

      {/* Top strip */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b-[3px] border-foreground"
        style={{ background: YELLOW, color: BLACK }}>
        <h1 className="font-display text-2xl md:text-3xl uppercase tracking-tight leading-none">
          Events <span className="opacity-50">//</span> Control Deck
        </h1>
        <div className="hidden md:flex items-center gap-2 text-[10px] font-bold tracking-[0.4em] uppercase">
          <span>⚡ Live Feed</span>
          <span className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
        </div>
      </div>

      {/* Main grid — fills remaining viewport, NO scroll */}
      <div
        className="flex-1 min-h-0 grid gap-2 p-2"
        style={{
          background: GRAY,
          gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1.6fr) minmax(0,1fr)",
          gridTemplateRows: "minmax(0,1.4fr) minmax(0,1fr)",
        }}
      >
        {/* LEFT — Featured flyer (spans both rows) */}
        <div className="row-span-2 min-h-0 border-[3px] border-foreground overflow-hidden"
          style={{ boxShadow: `6px 6px 0 0 ${YELLOW}` }}>
          {loading ? (
            <div className="h-full w-full animate-pulse" style={{ background: GRAY_LIGHT }} />
          ) : hero ? (
            <HeroFlyer ev={hero} onOpen={setOpenFlyer} />
          ) : (
            <EmptyHero />
          )}
        </div>

        {/* CENTER TOP — Upcoming wall (horizontal scroll inside) */}
        <Panel title="Upcoming Wall" accent={YELLOW} className="min-h-0">
          {loading ? (
            <div className="flex gap-3 p-4 h-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[150px] aspect-[3/4] animate-pulse" style={{ background: GRAY_LIGHT }} />
              ))}
            </div>
          ) : rest.length === 0 ? (
            <div className="h-full flex items-center justify-center p-4">
              <p className="font-display text-lg uppercase opacity-60">// queue empty</p>
            </div>
          ) : (
            <div className="h-full overflow-x-auto overflow-y-hidden">
              <div className="flex items-center gap-4 p-4 h-full" style={{ background: GRAY_LIGHT }}>
                {rest.map((ev, i) => <FlyerMini key={ev.id} ev={ev} idx={i} onOpen={setOpenFlyer} />)}
              </div>
            </div>
          )}
        </Panel>

        {/* CENTER BOTTOM — Gram comic grid (internal scroll) */}
        <Panel title="From the Gram" accent={YELLOW} className="min-h-0">
          {igLoading ? (
            <div className="h-full p-3 grid grid-cols-3 gap-2" style={{ background: GRAY_LIGHT }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse border-[2px] border-foreground" style={{ background: GRAY }} />
              ))}
            </div>
          ) : igPosts.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="font-display text-lg uppercase opacity-60">// no posts yet</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto" style={{ background: GRAY_LIGHT }}>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 p-2">
                {igPosts.map((p) => (
                  <div key={p.id} className="relative border-[2px] border-foreground bg-background overflow-hidden"
                    style={{ boxShadow: `3px 3px 0 0 ${BLACK}`, aspectRatio: "1/1" }}>
                    <iframe
                      src={getEmbedUrl(p.instagram_url)}
                      className="w-full h-full border-0 block"
                      scrolling="no"
                      loading="lazy"
                      title="Instagram post"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* RIGHT TOP — Hire / Services */}
        <Panel title="Hire Us" accent={YELLOW} className="min-h-0">
          <ServicesContent onOpen={() => setBookingOpen(true)} />
        </Panel>

        {/* RIGHT BOTTOM — Archive (internal scroll) */}
        <Panel title="Archive" accent={YELLOW} className="min-h-0">
          {loading ? (
            <div className="h-full animate-pulse" style={{ background: GRAY_LIGHT }} />
          ) : past.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="font-display text-sm uppercase opacity-60">// no archive</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto" style={{ background: GRAY_LIGHT }}>
              <div className="grid grid-cols-2 gap-3 p-3">
                {past.map((ev, i) => <PastMini key={ev.id} ev={ev} idx={i} />)}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <BookingSheet open={bookingOpen} onOpenChange={setBookingOpen} />
      <FlyerModal ev={openFlyer} onClose={() => setOpenFlyer(null)} />
    </div>
  );
}
