import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";
import InstagramFeed from "@/components/InstagramFeed";
import SEO from "@/components/SEO";
import billboard from "@/assets/events-billboard.jpg";

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

// ── Billboard stage: the collage is the page; events live on the white board ──
// The board's white face, measured from the collage (736×1308 px), as fractions of the image.
const FACE = {
  tl: [195 / 736, 129 / 1308], tr: [736 / 736, 413 / 1308],
  br: [736 / 736, 622 / 1308], bl: [195 / 736, 438 / 1308],
} as const;
// The content is laid out flat at FACE_W × FACE_H (image px) and projected onto the face.
const FACE_W = 736 - 195;
const FACE_H = 438 - 129;

/** CSS matrix3d that maps a w×h rectangle onto the quad [tl, tr, br, bl] (px). */
function projectTo(w: number, h: number, q: number[][]): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const det = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (sx * dy2 - dx2 * sy) / det, hh = (dx1 * sy - sx * dy1) / det;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hh / h},0,0,1,0,${c},${f},0,1)`;
}

function BoardEvent({ ev }: { ev: Event }) {
  const d = fmt(ev.event_date);
  return (
    <div className="flex h-full gap-3 sm:gap-4">
      {ev.flyer_url && (
        <div className="w-[34%] shrink-0 overflow-hidden border border-[#0B0B0B]">
          <img src={ev.flyer_url} alt="" className="h-full w-full object-cover" loading="eager" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#0B0B0B]/60">
            {d.month} {d.day} · {d.year}{ev.doors_time ? ` · Doors ${ev.doors_time}` : ""}
          </p>
          <h2 className="mt-1 font-display text-[clamp(18px,5cqw,34px)] uppercase leading-[0.9] tracking-[-0.03em] text-[#0B0B0B]">
            {ev.title}
          </h2>
          <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.16em] text-[#0B0B0B]/60">
            {[ev.venue, ev.city].filter(Boolean).join(" · ")}
          </p>
        </div>
        {ev.ticket_url ? (
          <a
            href={ev.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start bg-[#0B0B0B] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#FFD230]"
          >
            Tickets →
          </a>
        ) : (
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#0B0B0B]/60">Details soon</p>
        )}
      </div>
    </div>
  );
}

function BillboardStage({ upcoming, loading }: { upcoming: Event[]; loading: boolean }) {
  const [i, setI] = useState(0);
  const ev = upcoming[i];
  const step = (d: number) => upcoming.length && setI((n) => (n + d + upcoming.length) % upcoming.length);
  const imgBox = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = imgBox.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const w = size.w * FACE_W / 736, h = size.w * FACE_H / 736;
  const quad = [FACE.tl, FACE.tr, FACE.br, FACE.bl].map(([x, y]) => [x * size.w, y * size.h]);
  const matrix = size.w ? projectTo(w, h, quad) : "none";
  return (
    <section className="flex min-h-[100svh] justify-center overflow-hidden bg-black" aria-label="Events">
      {/* The collage, full height, centred; the black either side is left alone. */}
      <div className="relative h-[100svh] w-full max-w-[calc(100svh*736/1308)]">
        <img src={billboard} alt="" className="h-full w-full object-cover object-top" draggable={false} />

        {/* Only the white board carries content: a flat panel projected onto the face. */}
        <div ref={imgBox} className="absolute inset-0">
          <div
            className="absolute left-0 top-0 overflow-hidden"
            style={{ width: size.w * FACE_W / 736, height: size.w * FACE_H / 736, transformOrigin: "0 0", transform: matrix, containerType: "inline-size" }}
          >
            <div className="flex h-full w-full flex-col px-[5%] py-[4%]">
              <div className="mb-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-[#0B0B0B]/60">
                <span>Nonstop NY · Events</span>
                {upcoming.length > 1 && (
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => step(-1)} className="border border-[#0B0B0B] px-1.5" aria-label="Previous event">◀</button>
                    <span>{String(i + 1).padStart(2, "0")}/{String(upcoming.length).padStart(2, "0")}</span>
                    <button type="button" onClick={() => step(1)} className="border border-[#0B0B0B] px-1.5" aria-label="Next event">▶</button>
                  </span>
                )}
              </div>
              <div className="min-h-0 flex-1">
                {loading ? (
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#0B0B0B]/60">Loading…</p>
                ) : ev ? (
                  <BoardEvent ev={ev} />
                ) : (
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <h2 className="font-display text-[clamp(22px,7cqw,44px)] uppercase leading-[0.9] tracking-[-0.03em] text-[#0B0B0B]">Next date: soon</h2>
                      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#0B0B0B]/60">No skips. The archive is below.</p>
                    </div>
                    <a href="https://www.instagram.com/nonstopnewyork" target="_blank" rel="noopener noreferrer" className="self-start bg-[#0B0B0B] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#FFD230]">
                      @nonstopnewyork →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
  DLDLIIXxeB4: "4 / 5",
  DMvqNELpNk6: "320 / 411",
  "C_BhAPApZB0": "4 / 5",
  DFn8akapqFC: "4 / 5",
  DY5dyihCXGY: "3 / 4",
};

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
        // This seeded post was removed on Instagram; its embed displays a broken-link error.
        setIgPosts((((data ?? []) as IgPost[])
          .filter((post) => !post.instagram_url.includes("DDFwiTKSdWm")))
          .map((post) => {
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
    <div className="bg-black">
      <SEO
        title="Events — Nonstop NY Shows | PMG"
        description="Upcoming and past Nonstop NY events presented by PROPMYGANDA. Brooklyn-rooted independent music, shows, and culture."
        path="/events"
        jsonLd={eventJsonLd.length > 0 ? eventJsonLd : undefined}
      />
      {/* The collage is the page; events sit on the billboard */}
      <BillboardStage upcoming={upcoming} loading={loading} />

      {/* From the Gram */}
      <section className="py-10 lg:py-12">
        <div className="container-content">
          <div>
            <div className="flex items-center gap-4 mb-5">
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
            {!igLoading && igPosts.length === 0 ? (
              <div className="border-t border-border py-8">
                <p className="text-sm text-muted-foreground">Past events are on Nonstop New York while the flyer archive is being updated.</p>
                <a href="https://www.instagram.com/nonstopnewyork/" target="_blank" rel="noopener noreferrer" className="mt-5 inline-block border-b border-foreground pb-1 text-xs uppercase tracking-widest">See past events on Instagram ↗</a>
              </div>
            ) : <InstagramFeed posts={igPosts} loading={igLoading} limit={9} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />}
          </div>

        </div>

        {/* Past flyer wall */}
        {!loading && past.length > 0 && (
          <div
            className="mt-12 border-y border-black/20 py-12"
            style={{
              backgroundColor: "#F2EFE9",
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)",
              backgroundSize: "56px 28px",
            }}
          >
            <div className="container-content">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#0B0B0B]/60 mb-8">
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
