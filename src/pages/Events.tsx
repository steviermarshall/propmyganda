import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";
import BookingSheet from "@/components/BookingSheet";
import InstagramFeed from "@/components/InstagramFeed";

type Event = Database["public"]["Tables"]["events"]["Row"];
type IgPost = Database["public"]["Tables"]["instagram_posts"]["Row"];

const ROCKET_RED = "hsl(355 85% 52%)";
const ASTRO_YELLOW = "hsl(58 100% 50%)";
const SKY_BLUE = "hsl(195 100% 50%)";

function fmt(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),
    full: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  };
}

// ── BAM! starburst sticker ────────────────────────────────────────────────────
function Burst({
  text, color = ROCKET_RED, textColor = "white", size = 140, className = "", spin = false,
}: { text: string; color?: string; textColor?: string; size?: number; className?: string; spin?: boolean }) {
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <div className={`absolute inset-0 starburst ${spin ? "animate-slow-spin" : ""}`} style={{ background: color }} />
      <div className="absolute inset-0 starburst" style={{ background: color, transform: "rotate(15deg) scale(0.92)" }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display tracking-tight text-center leading-none px-2"
          style={{ color: textColor, fontSize: size * 0.22, transform: "rotate(-6deg)" }}>
          {text}
        </span>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroEvent({ ev }: { ev: Event }) {
  const d = fmt(ev.event_date);
  return (
    <div className="relative overflow-hidden border-b-[6px] border-foreground" style={{ background: ASTRO_YELLOW }}>
      <div className="absolute inset-0 opacity-25 speedlines pointer-events-none" />
      <div className="absolute inset-0 opacity-30 halftone-red pointer-events-none" />

      <Burst text="ZAP!" color={SKY_BLUE} textColor="black" size={110}
        className="absolute top-24 right-6 md:right-16 z-20 animate-bob" spin />
      <Burst text="BOOM!" color={ROCKET_RED} size={150}
        className="absolute bottom-10 left-4 md:left-12 z-20 sticker-tilt-l animate-bob" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] min-h-[85vh]">
        <div className="relative order-first lg:order-last p-6 md:p-12 lg:p-16 flex items-center justify-center">
          <div className="relative w-full max-w-md comic-panel comic-panel-red bg-background overflow-hidden scanlines">
            {ev.flyer_url ? (
              <img src={ev.flyer_url} alt={ev.title} className="w-full aspect-[3/4] object-cover" />
            ) : (
              <div className="aspect-[3/4] flex items-center justify-center halftone">
                <span className="text-[12rem] font-display leading-none text-foreground">{d.day}</span>
              </div>
            )}
            <div className="absolute -top-4 -left-4 bg-foreground text-background px-4 py-2 border-[3px] border-foreground font-display text-xl tracking-wider sticker-tilt-l"
              style={{ boxShadow: `5px 5px 0 0 ${ASTRO_YELLOW}` }}>
              {d.month} {d.day} · {d.year}
            </div>
          </div>
        </div>

        <div className="relative px-6 md:px-12 lg:px-16 pt-32 lg:pt-24 pb-16 flex flex-col justify-center text-foreground">
          <p className="text-[10px] tracking-[0.6em] uppercase font-bold mb-4 inline-block bg-foreground text-background px-3 py-1 self-start">
            ▲ NEXT TRANSMISSION
          </p>
          <h2 className="font-display text-6xl md:text-7xl lg:text-[7rem] leading-[0.85] tracking-tight uppercase mb-6 text-glitch"
            style={{ WebkitTextStroke: "1px hsl(0 0% 0%)" }}>
            {ev.title}
          </h2>

          <div className="flex flex-wrap gap-2 mb-8">
            {ev.doors_time && <span className="bg-foreground text-background px-3 py-1 text-xs font-bold tracking-widest uppercase">⏱ {ev.doors_time}</span>}
            {ev.venue && <span className="bg-background border-[3px] border-foreground px-3 py-1 text-xs font-bold tracking-widest uppercase">⌖ {ev.venue}</span>}
            {ev.city && <span className="px-3 py-1 text-xs font-bold tracking-widest uppercase" style={{ background: ROCKET_RED, color: "white" }}>✺ {ev.city}</span>}
          </div>

          {ev.description && (
            <div className="bg-background/90 border-[3px] border-foreground p-5 max-w-md mb-8 relative">
              <p className="text-sm leading-relaxed font-medium">{ev.description}</p>
              <div className="absolute -bottom-3 left-8 w-6 h-6 bg-background border-r-[3px] border-b-[3px] border-foreground rotate-45" />
            </div>
          )}

          {ev.ticket_url && (
            <a href={ev.ticket_url} target="_blank" rel="noopener noreferrer"
              className="self-start group relative font-display text-2xl tracking-wider uppercase px-8 py-4 bg-foreground text-background border-[4px] border-foreground transition-transform hover:-translate-x-1 hover:-translate-y-1"
              style={{ boxShadow: `8px 8px 0 0 ${ROCKET_RED}` }}>
              ▶ Get Tickets <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
            </a>
          )}
        </div>
      </div>

      <div className="relative z-10 bg-foreground text-background py-2 overflow-hidden border-t-[3px] border-foreground">
        <div className="animate-marquee whitespace-nowrap text-[11px] font-bold tracking-[0.4em]">
          {"⚡ INCOMING TRANSMISSION ⚡ TOKYO 2099 ⚡ NONSTOP NEW YORK ⚡ ".repeat(8)}
        </div>
      </div>
    </div>
  );
}

// ── Polaroid flyer ────────────────────────────────────────────────────────────
function FlyerPolaroid({ ev, idx, onOpen }: { ev: Event; idx: number; onOpen: (ev: Event) => void }) {
  const d = fmt(ev.event_date);
  const tilts = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3", "-rotate-2", "rotate-1"];
  const tilt = tilts[idx % tilts.length];
  const accents = [ROCKET_RED, SKY_BLUE, ASTRO_YELLOW, "hsl(0 0% 0%)"];
  const accent = accents[idx % accents.length];
  return (
    <ScrollReveal y={30}>
      <button
        onClick={() => onOpen(ev)}
        className={`group block w-full text-left bg-background border-[4px] border-foreground p-3 ${tilt} transition-transform duration-300 hover:rotate-0 hover:-translate-y-2 hover:scale-105 cursor-pointer`}
        style={{ boxShadow: `10px 10px 0 0 ${accent}` }}
      >
        {ev.flyer_url ? (
          <div className="relative aspect-[3/4] overflow-hidden scanlines bg-secondary">
            <img src={ev.flyer_url} alt={ev.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute top-2 left-2 bg-foreground text-background px-2 py-1 font-display text-sm tracking-wider"
              style={{ boxShadow: `3px 3px 0 0 ${accent}` }}>
              {d.month} {d.day}
            </div>
          </div>
        ) : (
          <div className="aspect-[3/4] halftone-yellow flex items-center justify-center">
            <span className="font-display text-7xl leading-none text-foreground">{d.day}</span>
          </div>
        )}
        <div className="px-1 pt-3 pb-1">
          <h3 className="font-display text-xl uppercase leading-none line-clamp-2">{ev.title}</h3>
          <p className="text-[10px] font-black tracking-[0.3em] uppercase mt-1.5 text-muted-foreground">
            {[ev.venue, ev.city].filter(Boolean).join(" · ")}
          </p>
        </div>
      </button>
    </ScrollReveal>
  );
}

// ── Flyer modal ───────────────────────────────────────────────────────────────
function FlyerModal({ ev, onClose }: { ev: Event | null; onClose: () => void }) {
  if (!ev) return null;
  const d = fmt(ev.event_date);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-foreground/80 backdrop-blur-sm animate-fade-up"
      onClick={onClose}>
      <div className="relative max-w-4xl w-full grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-6 max-h-[90vh]"
        onClick={e => e.stopPropagation()}>
        {ev.flyer_url && (
          <div className="comic-panel comic-panel-red bg-background overflow-hidden scanlines max-h-[90vh]">
            <img src={ev.flyer_url} alt={ev.title} className="w-full h-full object-contain max-h-[90vh]" />
          </div>
        )}
        <div className="bg-background border-[4px] border-foreground p-6 md:p-8 overflow-y-auto"
          style={{ boxShadow: `10px 10px 0 0 ${ASTRO_YELLOW}` }}>
          <button onClick={onClose}
            className="absolute -top-4 -right-4 z-10 w-12 h-12 bg-foreground text-background font-display text-2xl flex items-center justify-center border-[3px] border-foreground"
            style={{ boxShadow: `4px 4px 0 0 ${ROCKET_RED}` }}>
            ✕
          </button>
          <p className="text-[10px] tracking-[0.5em] uppercase font-bold inline-block bg-foreground text-background px-3 py-1 mb-4">
            {d.month} {d.day} · {d.year}
          </p>
          <h3 className="font-display text-4xl md:text-5xl uppercase leading-[0.9] mb-4">{ev.title}</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {ev.doors_time && <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold tracking-widest uppercase">⏱ {ev.doors_time}</span>}
            {ev.venue && <span className="border-2 border-foreground px-2 py-1 text-[10px] font-bold tracking-widest uppercase">⌖ {ev.venue}</span>}
            {ev.city && <span className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-background" style={{ background: ROCKET_RED }}>{ev.city}</span>}
          </div>
          {ev.description && <p className="text-sm leading-relaxed mb-6">{ev.description}</p>}
          {ev.ticket_url && (
            <a href={ev.ticket_url} target="_blank" rel="noopener noreferrer"
              className="inline-block font-display text-xl tracking-wider uppercase px-6 py-3 bg-foreground text-background border-[3px] border-foreground transition-transform hover:-translate-y-1"
              style={{ boxShadow: `6px 6px 0 0 ${ROCKET_RED}` }}>
              ▶ Get Tickets →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Past polaroid (small) ─────────────────────────────────────────────────────
function PastCard({ ev, idx }: { ev: Event; idx: number }) {
  const d = fmt(ev.event_date);
  const tilt = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"][idx % 4];
  return (
    <ScrollReveal y={20}>
      <div className={`group bg-background border-[3px] border-foreground p-2 ${tilt} transition-transform hover:rotate-0 hover:-translate-y-1`}
        style={{ boxShadow: "6px 6px 0 0 hsl(0 0% 0%)" }}>
        {ev.flyer_url ? (
          <div className="aspect-[3/4] overflow-hidden relative scanlines">
            <img src={ev.flyer_url} alt={ev.title}
              className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500" />
          </div>
        ) : (
          <div className="aspect-[3/4] halftone flex items-center justify-center">
            <span className="font-display text-7xl">{d.day}</span>
          </div>
        )}
        <div className="px-1 pt-2 pb-1">
          <p className="text-[9px] tracking-[0.3em] font-black uppercase">{d.month} · {d.year}</p>
          <h3 className="font-display text-lg uppercase leading-none mt-1 line-clamp-2">{ev.title}</h3>
        </div>
      </div>
    </ScrollReveal>
  );
}

// ── Floating Services Dock ────────────────────────────────────────────────────
function ServicesDock({ onOpen }: { onOpen: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const services = [
    { label: "DJ", icon: "♪", color: ROCKET_RED },
    { label: "Security", icon: "✺", color: SKY_BLUE },
    { label: "Venue", icon: "⌖", color: ASTRO_YELLOW },
    { label: "Promoter", icon: "▲", color: "hsl(0 0% 0%)" },
  ];
  return (
    <>
      {/* Desktop side dock */}
      <div className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-40 flex-col gap-3">
        <div className="bg-foreground text-background px-2 py-3 font-display text-[10px] tracking-[0.4em] uppercase text-center border-[3px] border-foreground"
          style={{ writingMode: "vertical-rl", boxShadow: `4px 4px 0 0 ${ROCKET_RED}` }}>
          ▼ HIRE US
        </div>
        {services.map((s, i) => (
          <button key={s.label} onClick={onOpen}
            className={`group relative bg-background border-[3px] border-foreground w-16 h-16 flex flex-col items-center justify-center transition-transform hover:-translate-x-2 hover:scale-105 ${i % 2 === 0 ? "sticker-tilt-l" : "sticker-tilt-r"}`}
            style={{ boxShadow: `5px 5px 0 0 ${s.color}` }}>
            <span className="font-display text-2xl leading-none" style={{ color: s.color }}>{s.icon}</span>
            <span className="text-[8px] font-black tracking-widest uppercase mt-0.5">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile expanding dock */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {expanded && services.map((s) => (
          <button key={s.label} onClick={() => { onOpen(); setExpanded(false); }}
            className="bg-background border-[3px] border-foreground px-3 py-2 flex items-center gap-2 animate-fade-up"
            style={{ boxShadow: `4px 4px 0 0 ${s.color}` }}>
            <span className="font-display text-lg" style={{ color: s.color }}>{s.icon}</span>
            <span className="text-[10px] font-black tracking-widest uppercase">{s.label}</span>
          </button>
        ))}
        <button onClick={() => setExpanded(v => !v)}
          className="w-14 h-14 bg-foreground text-background border-[3px] border-foreground font-display text-xl flex items-center justify-center"
          style={{ boxShadow: `5px 5px 0 0 ${ROCKET_RED}` }}>
          {expanded ? "✕" : "HIRE"}
        </button>
      </div>
    </>
  );
}

// ── Comic-grid Instagram ──────────────────────────────────────────────────────
function getEmbedUrl(url: string) {
  const [base, query] = url.split("?");
  const clean = base.replace(/\/$/, "");
  return query ? `${clean}/embed/captioned/?${query}` : `${clean}/embed/captioned/`;
}

function ComicGramGrid({ posts, loading }: { posts: IgPost[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-6 auto-rows-[140px] gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-secondary animate-pulse border-[3px] border-foreground"
            style={{
              gridColumn: `span ${[3, 3, 2, 4, 3, 3, 2, 4][i]}`,
              gridRow: `span ${[3, 2, 2, 3, 2, 3, 2, 2][i]}`,
            }} />
        ))}
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <div className="border-[3px] border-foreground p-12 text-center bg-background">
        <p className="font-display text-2xl uppercase">// no posts yet</p>
      </div>
    );
  }

  // Predefined comic-page panel layout pattern (col-span / row-span pairs)
  const layouts = [
    { c: 3, r: 3 }, { c: 3, r: 2 },
    { c: 2, r: 2 }, { c: 4, r: 3 },
    { c: 3, r: 2 }, { c: 3, r: 3 },
    { c: 2, r: 2 }, { c: 4, r: 2 },
    { c: 3, r: 3 }, { c: 3, r: 2 },
  ];

  return (
    <div className="grid grid-cols-6 auto-rows-[140px] gap-3 md:gap-4">
      {posts.map((p, i) => {
        const l = layouts[i % layouts.length];
        return (
          <div key={p.id}
            className="relative border-[4px] border-foreground bg-background overflow-hidden scanlines"
            style={{
              gridColumn: `span ${l.c}`,
              gridRow: `span ${l.r}`,
              boxShadow: `4px 4px 0 0 hsl(0 0% 0%)`,
            }}>
            <iframe
              src={getEmbedUrl(p.instagram_url)}
              className="w-full h-full border-0 block"
              scrolling="no"
              loading="lazy"
              title="Instagram post"
              style={{ minHeight: "100%" }}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-foreground/10" />
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
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
    <div className="bg-background text-foreground">
      {!loading && hero && <HeroEvent ev={hero} />}

      {!loading && !hero && (
        <div className="relative pt-32 pb-16 overflow-hidden border-b-[6px] border-foreground" style={{ background: ASTRO_YELLOW }}>
          <div className="absolute inset-0 opacity-30 halftone-red" />
          <div className="container-content relative">
            <h1 className="font-display text-7xl md:text-9xl uppercase tracking-tight text-glitch">Events</h1>
          </div>
        </div>
      )}

      {/* Upcoming — POLAROID WALL */}
      {!loading && rest.length > 0 && (
        <section className="relative section-padding border-b-[6px] border-foreground overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05] halftone pointer-events-none" />
          <Burst text="LIVE!" color={ROCKET_RED} size={120}
            className="absolute -top-6 right-8 md:right-32 z-20 sticker-tilt-r animate-bob" spin />

          <div className="container-content relative">
            <div className="flex items-end gap-4 mb-12 flex-wrap">
              <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tight leading-none">
                The<br/>Wall<span style={{ color: ROCKET_RED }}>!!</span>
              </h2>
              <p className="text-[11px] tracking-[0.4em] uppercase font-bold text-muted-foreground pb-2">
                ↳ tap a flyer to inspect
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {rest.map((ev, i) => <FlyerPolaroid key={ev.id} ev={ev} idx={i} onOpen={setOpenFlyer} />)}
            </div>
          </div>
        </section>
      )}

      {/* From the Gram — comic page panels */}
      <section className="relative section-padding border-b-[6px] border-foreground overflow-hidden" style={{ background: SKY_BLUE }}>
        <div className="absolute inset-0 opacity-20 halftone pointer-events-none" />
        <Burst text="POW!" color={ASTRO_YELLOW} textColor="black" size={120}
          className="absolute top-12 right-8 md:right-20 z-10 animate-bob" />
        <div className="container-content relative">
          <div className="flex flex-wrap items-center gap-4 mb-10">
            <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tight leading-none text-background"
              style={{ WebkitTextStroke: "2px hsl(0 0% 0%)" }}>
              From the Gram
            </h2>
            <a href="https://www.instagram.com/nonstopnewyork" target="_blank" rel="noopener noreferrer"
              className="bg-foreground text-background px-3 py-1.5 text-[11px] tracking-[0.3em] uppercase font-bold hover:bg-background hover:text-foreground transition-colors border-[3px] border-foreground">
              @nonstopnewyork ↗
            </a>
          </div>
          <div className="bg-background border-[4px] border-foreground p-3 md:p-5"
            style={{ boxShadow: `12px 12px 0 0 hsl(0 0% 0%)` }}>
            <ComicGramGrid posts={igPosts} loading={igLoading} />
          </div>
        </div>
      </section>

      {/* Archive */}
      {!loading && past.length > 0 && (
        <section className="relative section-padding border-b-[6px] border-foreground overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05] speedlines pointer-events-none" />
          <div className="container-content relative">
            <div className="flex items-center gap-4 mb-12 flex-wrap">
              <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tight leading-none">Archive</h2>
              <span className="font-display text-3xl" style={{ color: ROCKET_RED }}>※</span>
              <span className="text-[11px] tracking-[0.4em] uppercase font-bold text-muted-foreground">flashback file</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {past.map((ev, i) => <PastCard key={ev.id} ev={ev} idx={i} />)}
            </div>
          </div>
        </section>
      )}

      <Marquee />
      <BookingSheet open={bookingOpen} onOpenChange={setBookingOpen} />
      <ServicesDock onOpen={() => setBookingOpen(true)} />
      <FlyerModal ev={openFlyer} onClose={() => setOpenFlyer(null)} />
    </div>
  );
}
