import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";
import BookingSheet from "@/components/BookingSheet";
import InstagramFeed from "@/components/InstagramFeed";

type Event = Database["public"]["Tables"]["events"]["Row"];
type IgPost = Database["public"]["Tables"]["instagram_posts"]["Row"];

function fmt(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),
    full: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  };
}

// ── Hero: next upcoming event ─────────────────────────────────────────────────
function HeroEvent({ ev }: { ev: Event }) {
  const d = fmt(ev.event_date);
  return (
    <div className="relative min-h-[70vh] bg-primary text-primary-foreground overflow-hidden grid grid-cols-1 lg:grid-cols-2">
      {/* Details */}
      <div className="flex flex-col justify-end lg:justify-center px-8 md:px-16 pb-12 lg:pb-0 pt-36 lg:pt-24 z-10">
        <p className="text-[9px] tracking-[0.5em] uppercase text-primary-foreground/40 mb-6">Next Event</p>
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.9] mb-6">
          {ev.title}
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-primary-foreground/60 mb-8">
          <span>{d.full}</span>
          {ev.doors_time && <><span>·</span><span>Doors {ev.doors_time}</span></>}
          {ev.venue && <><span>·</span><span>{ev.venue}</span></>}
          {ev.city && <><span>·</span><span>{ev.city}</span></>}
        </div>
        {ev.description && (
          <p className="text-sm text-primary-foreground/50 max-w-md mb-10 leading-relaxed">{ev.description}</p>
        )}
        {ev.ticket_url && (
          <a
            href={ev.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start border border-primary-foreground px-8 py-4 text-xs tracking-[0.25em] uppercase font-bold hover:bg-primary-foreground hover:text-primary transition-colors"
          >
            Get Tickets →
          </a>
        )}
      </div>

      {/* Flyer */}
      {ev.flyer_url ? (
        <div className="relative overflow-hidden lg:h-full h-64 order-first lg:order-last">
          <img
            src={ev.flyer_url}
            alt={ev.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 lg:bg-gradient-to-r lg:from-primary/60 bg-gradient-to-t from-primary/80 via-transparent" />
        </div>
      ) : (
        /* No flyer — big date display */
        <div className="hidden lg:flex items-center justify-center opacity-5 select-none">
          <p className="text-[20rem] font-black leading-none tabular-nums">{d.day}</p>
        </div>
      )}
    </div>
  );
}

// ── Upcoming card ─────────────────────────────────────────────────────────────
function UpcomingCard({ ev }: { ev: Event }) {
  const d = fmt(ev.event_date);
  return (
    <ScrollReveal y={30}>
      <div className="group border border-border hover:border-foreground transition-colors overflow-hidden grid grid-cols-[auto_1fr_auto] gap-0">
        {/* Date column */}
        <div className="bg-primary text-primary-foreground flex flex-col items-center justify-center px-6 py-8 min-w-[80px]">
          <span className="text-4xl font-black leading-none">{d.day}</span>
          <span className="text-[9px] tracking-[0.3em] uppercase mt-1 opacity-60">{d.month}</span>
          <span className="text-[9px] opacity-40 mt-0.5">{d.year}</span>
        </div>

        {/* Info */}
        <div className="p-6 flex flex-col justify-center min-w-0">
          <h3 className="font-black text-lg uppercase tracking-tight truncate group-hover:opacity-70 transition-opacity">
            {ev.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {[ev.venue, ev.city].filter(Boolean).join(" · ")}
          </p>
          {ev.doors_time && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Doors {ev.doors_time}</p>
          )}
          {ev.description && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-1">{ev.description}</p>
          )}
        </div>

        {/* Flyer thumbnail + ticket CTA */}
        <div className="flex flex-col">
          {ev.flyer_url && (
            <div className="w-24 h-full overflow-hidden hidden md:block">
              <img src={ev.flyer_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          )}
          {ev.ticket_url && (
            <a
              href={ev.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center self-center mr-6 text-[10px] tracking-[0.2em] uppercase font-bold border border-foreground px-5 py-3 hover:bg-foreground hover:text-background transition-colors whitespace-nowrap ml-4"
              onClick={e => e.stopPropagation()}
            >
              Tickets
            </a>
          )}
        </div>
      </div>
    </ScrollReveal>
  );
}

// ── Past event card ───────────────────────────────────────────────────────────
function PastCard({ ev }: { ev: Event }) {
  const d = fmt(ev.event_date);
  return (
    <ScrollReveal y={20}>
      <div className="group relative overflow-hidden border border-border/40 hover:border-border transition-colors">
        {ev.flyer_url ? (
          <div className="aspect-[3/4] overflow-hidden">
            <img
              src={ev.flyer_url}
              alt={ev.title}
              className="w-full h-full object-cover grayscale opacity-60 group-hover:opacity-80 group-hover:grayscale-0 transition-all duration-500"
            />
          </div>
        ) : (
          <div className="aspect-[3/4] bg-secondary flex items-center justify-center">
            <span className="text-6xl font-black text-border">{d.day}</span>
          </div>
        )}
        <div className="p-4">
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground">{d.month} {d.year}</p>
          <h3 className="font-black text-sm uppercase tracking-tight mt-1 line-clamp-2">{ev.title}</h3>
          {ev.city && <p className="text-[10px] text-muted-foreground mt-0.5">{ev.city}</p>}
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
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    supabase
      .from("events")
      .select("*")
      .neq("status", "cancelled")
      .order("event_date", { ascending: false })
      .then(({ data }) => {
        setEvents((data ?? []) as Event[]);
        setLoading(false);
      });

    supabase
      .from("instagram_posts")
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setIgPosts((data ?? []) as IgPost[]);
        setIgLoading(false);
      });
  }, []);

  const upcoming = events.filter(e => e.status === "upcoming").sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
  const past = events.filter(e => e.status === "past").sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );
  const [hero, ...rest] = upcoming;

  return (
    <div className="bg-background">
      {/* Hero */}
      {!loading && hero && <HeroEvent ev={hero} />}

      {/* No upcoming fallback header */}
      {!loading && !hero && (
        <div className="bg-primary text-primary-foreground pt-32 pb-16">
          <div className="container-content">
            <ScrollReveal>
              <h1 className="text-5xl md:text-8xl text-heading">Events</h1>
            </ScrollReveal>
          </div>
        </div>
      )}

      {/* Tab nav */}
      <div className="border-b border-border sticky top-16 bg-background z-20">
        <div className="container-content flex gap-0">
          {(["upcoming", "past"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-8 py-4 text-[10px] tracking-[0.25em] uppercase font-bold border-b-2 transition-colors ${
                tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t} {t === "upcoming" ? `(${upcoming.length})` : `(${past.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <section className="section-padding">
        <div className="container-content">
          {loading && (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading…</div>
          )}

          {/* Upcoming */}
          {!loading && tab === "upcoming" && (
            <>
              {rest.length > 0 ? (
                <div className="space-y-3 max-w-4xl">
                  {rest.map(ev => <UpcomingCard key={ev.id} ev={ev} />)}
                </div>
              ) : (
                <div className="border border-border p-16 text-center max-w-lg">
                  <p className="text-muted-foreground text-sm uppercase tracking-widest">No additional events scheduled</p>
                  <p className="text-xs text-muted-foreground mt-2">Check back soon or follow us on socials</p>
                </div>
              )}
            </>
          )}

          {/* Past — Instagram feed first, flyer cards as fallback */}
          {tab === "past" && (
            <>
              {/* Instagram posts */}
              <div className="mb-12">
                <div className="flex items-center gap-4 mb-8">
                  <p className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground">From the Gram</p>
                  <a
                    href="https://www.instagram.com/nonstopnewyork"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    @nonstopnewyork ↗
                  </a>
                </div>
                <InstagramFeed posts={igPosts} loading={igLoading} />
              </div>

              {/* Supabase flyer cards (if any) */}
              {!loading && past.length > 0 && (
                <div className="mt-12">
                  <p className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground mb-6">Archive</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {past.map(ev => <PastCard key={ev.id} ev={ev} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Book / Hire ─────────────────────────────────────────────────────────── */}
      <section className="bg-primary text-primary-foreground py-24">
        <div className="container-content grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[9px] tracking-[0.5em] uppercase text-primary-foreground/40 mb-4">Services</p>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-[0.9] mb-6">
              Book<br />or Hire
            </h2>
            <p className="text-sm text-primary-foreground/60 leading-relaxed max-w-sm">
              From the booth to the door — DJ sets, event security, venue connections, and full-scale promotion. One team, every angle.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { label: "DJ", desc: "Sets from underground to main stage" },
              { label: "Security", desc: "Professional crowd management" },
              { label: "Venue", desc: "Spaces that fit the vision" },
              { label: "Promoter", desc: "Sell-out strategy & execution" },
            ].map(({ label, desc }) => (
              <button
                key={label}
                onClick={() => setBookingOpen(true)}
                className="group flex items-center justify-between border border-primary-foreground/20 px-6 py-4 hover:border-primary-foreground hover:bg-primary-foreground/5 transition-colors text-left"
              >
                <div>
                  <p className="font-black uppercase tracking-tight text-sm">{label}</p>
                  <p className="text-[10px] text-primary-foreground/40 mt-0.5">{desc}</p>
                </div>
                <span className="text-primary-foreground/30 group-hover:text-primary-foreground transition-colors text-lg">→</span>
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
