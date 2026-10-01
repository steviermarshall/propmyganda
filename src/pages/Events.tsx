import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";
import InstagramFeed from "@/components/InstagramFeed";
import SEO from "@/components/SEO";

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

// ── The wall: off-white subway tile drawn in CSS (brand: wheatpaste wall) ──────
const TILE = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='80' viewBox='0 0 160 80'>` +
    `<rect width='160' height='80' fill='#F2EFE9'/>` +
    `<rect x='1' y='1' width='158' height='38' fill='#F6F3EE' stroke='#C9C4BB' stroke-width='1.5'/>` +
    `<rect x='-79' y='41' width='158' height='38' fill='#F6F3EE' stroke='#C9C4BB' stroke-width='1.5'/>` +
    `<rect x='81' y='41' width='158' height='38' fill='#F6F3EE' stroke='#C9C4BB' stroke-width='1.5'/>` +
  `</svg>`,
);
const WALL_STYLE: React.CSSProperties = {
  backgroundColor: "#F2EFE9",
  backgroundImage: `url("data:image/svg+xml;utf8,${TILE}")`,
  backgroundSize: "160px 80px",
};

// ── Upcoming: a flyer pasted on the wall ─────────────────────────────
function PastedEvent({ ev, index = 0 }: { ev: Event; index?: number }) {
  const d = fmt(ev.event_date);
  const tilt = [-1.5, 1, -0.5, 1.5][index % 4];
  return (
    <article
      className="snap-in grid grid-cols-1 gap-0 border border-black/30 bg-[#F2EFE9] text-[#0B0B0B] shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:grid-cols-[180px_1fr]"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {ev.flyer_url ? (
        <div className="aspect-[3/4] overflow-hidden border-b border-black/20 sm:border-b-0 sm:border-r">
          <img src={ev.flyer_url} alt={ev.title} className="h-full w-full object-cover" loading={index === 0 ? "eager" : "lazy"} />
        </div>
      ) : (
        <div className="flex aspect-[3/4] flex-col items-center justify-center border-b border-black/20 bg-[#FFD230] sm:border-b-0 sm:border-r">
          <span className="font-display text-6xl leading-none">{d.day}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]">{d.month}</span>
        </div>
      )}
      <div className="flex flex-col justify-between p-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0B0B0B]/60">
            {d.full}{ev.doors_time ? ` · Doors ${ev.doors_time}` : ""}
          </p>
          <h2 className="mt-2 font-display text-3xl uppercase leading-[0.9] tracking-[-0.03em] md:text-5xl">{ev.title}</h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#0B0B0B]/60">
            {[ev.venue, ev.city].filter(Boolean).join(" · ")}
          </p>
          {ev.description && <p className="mt-3 max-w-md text-sm leading-relaxed text-[#0B0B0B]/80">{ev.description}</p>}
        </div>
        <div className="mt-5">
          {ev.ticket_url ? (
            <a href={ev.ticket_url} target="_blank" rel="noopener noreferrer" className="inline-block bg-[#0B0B0B] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#FFD230]">
              Tickets →
            </a>
          ) : (
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0B0B0B]/60">Details soon</p>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Past event card ───────────────────────────────────────────────────────────
function isInstagramUrl(url: string | null | undefined): boolean {
  return !!url && /instagram\.com\/(p|reel)\//i.test(url);
}

function igEmbedUrl(url: string): string {
  return `${url.split("?")[0].replace(/\/$/, "")}/embed/`;
}

/** Measured picture shape of each Nonstop NY post (photo-only crop). */
const IG_ASPECTS: Record<string, string> = {
  DAb2hotJcrw: "4 / 5",
  DHj0IMTpEw3: "4 / 5",
  DIM3RPhJsZr: "4 / 5",
  DK56lIeAHWm: "3 / 4",
  DMvqNELpNk6: "320 / 411",
  "C_BhAPApZB0": "4 / 5",
  DFn8akapqFC: "4 / 5",
  DY5dyihCXGY: "3 / 4",
};

/** Instagram posts that were deleted or made private; their embeds only show an error. */
const HIDDEN_IG_CODES = ["DDFwiTKSdWm", "DLDLIIXxeB4"];

function igCode(url: string): string | undefined {
  return url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/)?.[1];
}

function PastCard({ ev, index = 0 }: { ev: Event; index?: number }) {
  const d = fmt(ev.event_date);
  // Use ticket_url as a fallback when flyer_url is missing but it's an IG link
  const visualUrl = ev.flyer_url ?? (isInstagramUrl(ev.ticket_url) ? ev.ticket_url : null);
  const igEmbed = isInstagramUrl(visualUrl);
  const tilt = [-2, 1.5, -1, 2, -1.5, 1][index % 6];

  const linkHref = ev.ticket_url ?? ev.flyer_url ?? null;
  const inner = (
    <div
      className="group relative overflow-hidden border border-black/20 bg-[#F2EFE9] shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition-transform duration-200"
      style={{ transform: `rotate(${tilt}deg)` }}
    >

      {igEmbed ? (
        <div className="aspect-[3/4] overflow-hidden bg-secondary relative">
          <iframe
            src={igEmbedUrl(visualUrl!)}
            title={ev.title}
            className="absolute left-0 w-full border-0"
            style={{ top: -54, height: "calc(100% + 160px)" }}
            scrolling="no"
            loading="lazy"
            allowTransparency
          />
        </div>
      ) : visualUrl ? (
        <div className="aspect-[3/4] overflow-hidden">
          <img
            src={visualUrl}
            alt={ev.title}
            className="w-full h-full object-cover grayscale opacity-60 group-hover:opacity-80 group-hover:grayscale-0 transition-all duration-500"
          />
        </div>
      ) : (
        <div className="aspect-[3/4] bg-secondary flex items-center justify-center">
          <span className="text-6xl font-black text-border">{d.day}</span>
        </div>
      )}
      <div className="p-4 text-[#0B0B0B]">
        <p className="font-mono text-[9px] tracking-[0.2em] uppercase opacity-60">{d.month} {d.year}</p>
        <h3 className="font-display text-sm uppercase leading-[0.9] tracking-[-0.03em] mt-1 line-clamp-2">{ev.title}</h3>
        {ev.city && <p className="font-mono text-[9px] uppercase tracking-[0.15em] opacity-50 mt-0.5">{ev.city}</p>}
      </div>

    </div>
  );

  return (
    <ScrollReveal y={20}>
      {linkHref ? (
        <a href={linkHref} target="_blank" rel="noopener noreferrer" className="block">
          {inner}
        </a>
      ) : (
        inner
      )}
    </ScrollReveal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [igPosts, setIgPosts] = useState<IgPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [igLoading, setIgLoading] = useState(true);

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
        // Posts removed on Instagram, or with a malformed link, only show an error in the embed.
        const rows = ((data ?? []) as IgPost[])
          .filter((post) => !HIDDEN_IG_CODES.some((code) => post.instagram_url.includes(code)));
        const clean = rows.filter((post) => igCode(post.instagram_url));
        setIgPosts(clean.map((post) => {
          const code = igCode(post.instagram_url);
          return { ...post, aspect: code ? IG_ASPECTS[code] : undefined };
        }));
        setIgLoading(false);
      });
  }, []);

  const upcoming = events.filter(e => e.status === "upcoming").sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
  const past = events.filter(e => e.status === "past").sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );

  const eventJsonLd = upcoming.map((ev) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: ev.title,
    startDate: ev.event_date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: ev.venue
      ? {
          "@type": "Place",
          name: ev.venue,
          address: ev.city ?? undefined,
        }
      : undefined,
    image: ev.flyer_url ?? undefined,
    description: ev.description ?? undefined,
    url: ev.ticket_url ?? undefined,
  }));

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <SEO
        title="Events — Nonstop NY Shows | PMG"
        description="Upcoming and past Nonstop NY events presented by PROPMYGANDA. Brooklyn-rooted independent music, shows, and culture."
        path="/events"
        jsonLd={eventJsonLd.length > 0 ? eventJsonLd : undefined}
      />
      {/* Header strip */}
      <div className="bg-[#0B0B0B] px-6 pb-8 pt-28 text-[#F2EFE9] md:px-10 md:pt-32">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FFD230]">Nonstop NY · PMG-E</p>
        <h1 className="font-display text-6xl uppercase leading-[0.85] tracking-[-0.03em] md:text-8xl">Events</h1>
        <p className="mt-3 max-w-md font-mono text-[11px] uppercase tracking-[0.14em] text-[#9A9A9E]">No skips · Brooklyn</p>
      </div>

      {/* Upcoming — flyers pasted on the wall */}
      <section className="border-y-2 border-[#0B0B0B] px-6 py-12 md:px-10 md:py-16" style={WALL_STYLE}>
        <p className="mb-6 inline-block bg-[#0B0B0B] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#F2EFE9]">
          {upcoming.length > 0 ? `Upcoming · ${String(upcoming.length).padStart(2, "0")}` : "Upcoming"}
        </p>
        {loading ? (
          <div className="h-48 max-w-3xl animate-pulse border border-black/20 bg-[#F2EFE9]" />
        ) : upcoming.length > 0 ? (
          <div className="max-w-3xl space-y-8">
            {upcoming.map((ev, i) => <PastedEvent key={ev.id} ev={ev} index={i} />)}
          </div>
        ) : (
          <div className="inline-block border border-black/30 bg-[#F2EFE9] px-5 py-4 text-[#0B0B0B] shadow-[0_8px_24px_rgba(0,0,0,0.25)]" style={{ transform: "rotate(-1deg)" }}>
            <p className="font-display text-2xl uppercase leading-[0.9] tracking-[-0.03em]">Next date: soon</p>
            <a href="https://www.instagram.com/nonstopnewyork" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.2em] underline">@nonstopnewyork ↗</a>
          </div>
        )}
      </section>

      {/* From the Gram */}
      <section className="bg-[#0B0B0B] py-10 text-[#F2EFE9] lg:py-12">
        <div className="container-content">
          <div>
            <div className="mb-5 inline-flex items-center gap-4 border border-[#F2EFE9]/30 px-3 py-2 text-[#F2EFE9]">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase">From the Gram</p>
              <a
                href="https://www.instagram.com/nonstopnewyork"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#FFD230]"
              >
                @nonstopnewyork ↗
              </a>
            </div>
            {!igLoading && igPosts.length === 0 ? (
              <div className="inline-block border border-[#F2EFE9]/30 px-4 py-3 text-[#F2EFE9]">
                <p className="text-sm">Past events are on Nonstop New York while the flyer archive is being updated.</p>
                <a href="https://www.instagram.com/nonstopnewyork/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-[#FFD230]">See past events on Instagram ↗</a>
              </div>
            ) : <InstagramFeed posts={igPosts} loading={igLoading} limit={8} cols="grid-cols-2 lg:grid-cols-4" />}
          </div>

        </div>

        {/* Past flyer wall */}
        {!loading && past.length > 0 && (
          <div className="mt-12 border-t-2 border-[#0B0B0B] py-12" style={WALL_STYLE}>
            <div className="container-content">
              <p className="mb-8 inline-block bg-[#0B0B0B] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#F2EFE9]">
                Flyer archive
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                {past.map((ev, i) => <PastCard key={ev.id} ev={ev} index={i} />)}
              </div>
            </div>
          </div>
        )}

      </section>

      <Marquee />
    </div>
  );
}
