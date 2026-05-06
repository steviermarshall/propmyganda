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
  text,
  color = ROCKET_RED,
  textColor = "white",
  size = 140,
  className = "",
  spin = false,
}: { text: string; color?: string; textColor?: string; size?: number; className?: string; spin?: boolean }) {
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <div
        className={`absolute inset-0 starburst ${spin ? "animate-slow-spin" : ""}`}
        style={{ background: color }}
      />
      <div
        className="absolute inset-0 starburst"
        style={{ background: color, transform: "rotate(15deg) scale(0.92)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-display tracking-tight text-center leading-none px-2"
          style={{ color: textColor, fontSize: size * 0.22, transform: "rotate(-6deg)" }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

// ── Hero panel — explosive comic spread ──────────────────────────────────────
function HeroEvent({ ev }: { ev: Event }) {
  const d = fmt(ev.event_date);
  return (
    <div className="relative overflow-hidden border-b-[6px] border-foreground" style={{ background: ASTRO_YELLOW }}>
      {/* Speed lines background */}
      <div className="absolute inset-0 opacity-25 speedlines pointer-events-none" />
      {/* Halftone wash */}
      <div className="absolute inset-0 opacity-30 halftone-red pointer-events-none" />

      {/* Floating burst stickers */}
      <Burst text="ZAP!" color={SKY_BLUE} textColor="black" size={110}
        className="absolute top-24 right-6 md:right-16 z-20 animate-bob" spin />
      <Burst text="BOOM!" color={ROCKET_RED} size={150}
        className="absolute bottom-10 left-4 md:left-12 z-20 sticker-tilt-l animate-bob" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] min-h-[85vh]">
        {/* Flyer panel */}
        <div className="relative order-first lg:order-last p-6 md:p-12 lg:p-16 flex items-center justify-center">
          <div className="relative w-full max-w-md comic-panel comic-panel-red bg-background overflow-hidden scanlines">
            {ev.flyer_url ? (
              <img src={ev.flyer_url} alt={ev.title} className="w-full aspect-[3/4] object-cover" />
            ) : (
              <div className="aspect-[3/4] flex items-center justify-center halftone">
                <span className="text-[12rem] font-display leading-none text-foreground">{d.day}</span>
              </div>
            )}
            {/* Date sticker */}
            <div
              className="absolute -top-4 -left-4 bg-foreground text-background px-4 py-2 border-[3px] border-foreground font-display text-xl tracking-wider sticker-tilt-l"
              style={{ boxShadow: `5px 5px 0 0 ${ASTRO_YELLOW}` }}
            >
              {d.month} {d.day} · {d.year}
            </div>
          </div>
        </div>

        {/* Title panel */}
        <div className="relative px-6 md:px-12 lg:px-16 pt-32 lg:pt-24 pb-16 flex flex-col justify-center text-foreground">
          <p className="text-[10px] tracking-[0.6em] uppercase font-bold mb-4 inline-block bg-foreground text-background px-3 py-1 self-start">
            ▲ NEXT TRANSMISSION
          </p>
          <h2
            className="font-display text-6xl md:text-7xl lg:text-[7rem] leading-[0.85] tracking-tight uppercase mb-6 text-glitch"
            style={{ WebkitTextStroke: "1px hsl(0 0% 0%)" }}
          >
            {ev.title}
          </h2>

          <div className="flex flex-wrap gap-2 mb-8">
            {ev.doors_time && (
              <span className="bg-foreground text-background px-3 py-1 text-xs font-bold tracking-widest uppercase">
                ⏱ {ev.doors_time}
              </span>
            )}
            {ev.venue && (
              <span className="bg-background border-[3px] border-foreground px-3 py-1 text-xs font-bold tracking-widest uppercase">
                ⌖ {ev.venue}
              </span>
            )}
            {ev.city && (
              <span className="px-3 py-1 text-xs font-bold tracking-widest uppercase" style={{ background: ROCKET_RED, color: "white" }}>
                ✺ {ev.city}
              </span>
            )}
          </div>

          {ev.description && (
            <div className="bg-background/90 border-[3px] border-foreground p-5 max-w-md mb-8 relative">
              <p className="text-sm leading-relaxed font-medium">{ev.description}</p>
              <div className="absolute -bottom-3 left-8 w-6 h-6 bg-background border-r-[3px] border-b-[3px] border-foreground rotate-45" />
            </div>
          )}

          {ev.ticket_url && (
            <a
              href={ev.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start group relative font-display text-2xl tracking-wider uppercase px-8 py-4 bg-foreground text-background border-[4px] border-foreground transition-transform hover:-translate-x-1 hover:-translate-y-1"
              style={{ boxShadow: `8px 8px 0 0 ${ROCKET_RED}` }}
            >
              ▶ Get Tickets <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
            </a>
          )}
        </div>
      </div>

      {/* Bottom ticker */}
      <div className="relative z-10 bg-foreground text-background py-2 overflow-hidden border-t-[3px] border-foreground">
        <div className="animate-marquee whitespace-nowrap text-[11px] font-bold tracking-[0.4em]">
          {"⚡ INCOMING TRANSMISSION ⚡ TOKYO 2099 ⚡ NONSTOP NEW YORK ⚡ ".repeat(8)}
        </div>
      </div>
    </div>
  );
}

// ── Upcoming card — comic panel ───────────────────────────────────────────────
function UpcomingCard({ ev, idx }: { ev: Event; idx: number }) {
  const d = fmt(ev.event_date);
  const palette = [ROCKET_RED, SKY_BLUE, ASTRO_YELLOW];
  const accent = palette[idx % palette.length];
  const tilt = idx % 2 === 0 ? "sticker-tilt-l" : "sticker-tilt-r";
  return (
    <ScrollReveal y={30}>
      <div className={`group relative bg-background border-[4px] border-foreground transition-transform hover:-translate-y-1 ${tilt}`}
        style={{ boxShadow: `10px 10px 0 0 ${accent}` }}>
        <div className="grid grid-cols-[110px_1fr_auto] gap-0">
          {/* Date stamp */}
          <div className="relative flex flex-col items-center justify-center py-6 border-r-[4px] border-foreground halftone-yellow">
            <div className="absolute inset-0 bg-foreground/0" />
            <span className="font-display text-6xl leading-none text-foreground relative">{d.day}</span>
            <span className="text-[10px] tracking-[0.3em] font-black mt-1 text-foreground relative">{d.month}</span>
          </div>

          {/* Info */}
          <div className="p-5 flex flex-col justify-center min-w-0">
            <h3 className="font-display text-2xl md:text-3xl uppercase tracking-tight leading-none truncate">
              {ev.title}
            </h3>
            <div className="flex flex-wrap gap-2 mt-3">
              {ev.venue && <span className="text-[10px] font-bold tracking-widest uppercase bg-foreground text-background px-2 py-0.5">⌖ {ev.venue}</span>}
              {ev.city && <span className="text-[10px] font-bold tracking-widest uppercase border-2 border-foreground px-2 py-0.5">{ev.city}</span>}
              {ev.doors_time && <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5" style={{ background: accent, color: "white" }}>⏱ {ev.doors_time}</span>}
            </div>
          </div>

          {/* Ticket */}
          {ev.ticket_url && (
            <a
              href={ev.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="self-stretch flex items-center px-6 font-display text-xl tracking-wider uppercase border-l-[4px] border-foreground bg-foreground text-background hover:bg-background hover:text-foreground transition-colors"
              onClick={e => e.stopPropagation()}
            >
              GO →
            </a>
          )}
        </div>
      </div>
    </ScrollReveal>
  );
}

// ── Past card — manga polaroid ────────────────────────────────────────────────
function PastCard({ ev, idx }: { ev: Event; idx: number }) {
  const d = fmt(ev.event_date);
  const tilt = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"][idx % 4];
  return (
    <ScrollReveal y={20}>
      <div className={`group bg-background border-[3px] border-foreground p-2 ${tilt} transition-transform hover:rotate-0 hover:-translate-y-1`}
        style={{ boxShadow: "6px 6px 0 0 hsl(0 0% 0%)" }}>
        {ev.flyer_url ? (
          <div className="aspect-[3/4] overflow-hidden relative scanlines">
            <img
              src={ev.flyer_url}
              alt={ev.title}
              className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500"
            />
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [igPosts, setIgPosts] = useState<IgPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [igLoading, setIgLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);

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
      {/* Hero */}
      {!loading && hero && <HeroEvent ev={hero} />}

      {!loading && !hero && (
        <div className="relative pt-32 pb-16 overflow-hidden border-b-[6px] border-foreground" style={{ background: ASTRO_YELLOW }}>
          <div className="absolute inset-0 opacity-30 halftone-red" />
          <div className="container-content relative">
            <h1 className="font-display text-7xl md:text-9xl uppercase tracking-tight text-glitch">Events</h1>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {!loading && upcoming.length > 0 && (
        <section className="relative section-padding border-b-[6px] border-foreground overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04] halftone pointer-events-none" />
          <div className="container-content relative">
            <div className="flex items-center gap-4 mb-12">
              <span className="inline-block w-12 h-12 starburst" style={{ background: ROCKET_RED }} />
              <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tight leading-none">
                Upcoming<span style={{ color: ROCKET_RED }}>!!</span>
              </h2>
            </div>
            {rest.length > 0 ? (
              <div className="space-y-6 max-w-4xl">
                {rest.map((ev, i) => <UpcomingCard key={ev.id} ev={ev} idx={i} />)}
              </div>
            ) : (
              <p className="font-display text-2xl uppercase">// More dates incoming...</p>
            )}
          </div>
        </section>
      )}

      {/* From the Gram */}
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
            <a
              href="https://www.instagram.com/nonstopnewyork"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background px-3 py-1.5 text-[11px] tracking-[0.3em] uppercase font-bold hover:bg-background hover:text-foreground transition-colors border-[3px] border-foreground"
            >
              @nonstopnewyork ↗
            </a>
          </div>
          <div className="bg-background border-[4px] border-foreground p-4 md:p-6"
            style={{ boxShadow: `12px 12px 0 0 hsl(0 0% 0%)` }}>
            <InstagramFeed posts={igPosts} loading={igLoading} />
          </div>
        </div>
      </section>

      {/* Archive */}
      {!loading && past.length > 0 && (
        <section className="relative section-padding border-b-[6px] border-foreground overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05] speedlines pointer-events-none" />
          <div className="container-content relative">
            <div className="flex items-center gap-4 mb-12">
              <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tight leading-none">
                Archive
              </h2>
              <span className="font-display text-3xl" style={{ color: ROCKET_RED }}>※</span>
              <span className="text-[11px] tracking-[0.4em] uppercase font-bold text-muted-foreground">flashback file</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {past.map((ev, i) => <PastCard key={ev.id} ev={ev} idx={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* Book / Hire ─── manga services panel ─────────────────────────────── */}
      <section className="relative py-24 overflow-hidden border-b-[6px] border-foreground" style={{ background: ROCKET_RED }}>
        <div className="absolute inset-0 opacity-25 halftone pointer-events-none" />
        <Burst text="HIRE!" color={ASTRO_YELLOW} textColor="black" size={130}
          className="absolute top-12 left-6 md:left-20 z-10 animate-bob sticker-tilt-l" spin />

        <div className="container-content relative grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="text-background">
            <p className="text-[10px] tracking-[0.6em] uppercase font-bold mb-4 inline-block bg-background text-foreground px-3 py-1">
              ▼ SERVICES MENU
            </p>
            <h2 className="font-display text-6xl md:text-8xl uppercase tracking-tight leading-[0.85] mb-6"
              style={{ WebkitTextStroke: "2px hsl(0 0% 0%)" }}>
              Book<br/>or Hire
            </h2>
            <div className="bg-background/95 text-foreground border-[4px] border-foreground p-5 max-w-md">
              <p className="text-sm leading-relaxed font-medium">
                From the booth to the door — DJ sets, event security, venue connections, and full-scale promotion. One team, every angle.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { label: "DJ", desc: "Sets that hit", icon: "♪" },
              { label: "Security", desc: "Crowd control", icon: "✺" },
              { label: "Venue", desc: "Spaces on lock", icon: "⌖" },
              { label: "Promoter", desc: "Sell-out fuel", icon: "▲" },
            ].map(({ label, desc, icon }, i) => (
              <button
                key={label}
                onClick={() => setBookingOpen(true)}
                className={`group relative bg-background text-foreground border-[4px] border-foreground p-5 text-left transition-transform hover:-translate-y-1 hover:-translate-x-1 ${i % 2 === 0 ? "sticker-tilt-l" : "sticker-tilt-r"}`}
                style={{ boxShadow: `8px 8px 0 0 hsl(0 0% 0%)` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-3xl uppercase tracking-tight leading-none">{label}</p>
                    <p className="text-[10px] font-bold tracking-widest uppercase mt-2 text-muted-foreground">{desc}</p>
                  </div>
                  <span className="font-display text-3xl" style={{ color: ROCKET_RED }}>{icon}</span>
                </div>
                <span className="absolute bottom-2 right-3 text-[10px] font-bold tracking-widest uppercase opacity-40 group-hover:opacity-100 transition-opacity">
                  TAP →
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Marquee />
      <BookingSheet open={bookingOpen} onOpenChange={setBookingOpen} />
    </div>
  );
}
