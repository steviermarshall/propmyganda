import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import SEO from "@/components/SEO";
import { publicationImage } from "@/lib/publicationImage";
import { timeAgo } from "@/lib/publicationTime";

type Pub = Database["public"]["Tables"]["publications"]["Row"] & {
  source_url?: string | null;
  credit?: string | null;
};

const CATEGORIES = ["All", "Business", "Artists", "Culture", "Milestones", "Industry"] as const;
const PAGE = 12;

function sourceOf(pub: Pub): string | null {
  if (!pub.credit) return null;
  return pub.credit.replace(/^via\s+/i, "");
}

function Kicker({ pub, now }: { pub: Pub; now: number }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.2em]">
      <span className="text-electric">{pub.category}</span>
      {pub.published_at && (
        <time dateTime={pub.published_at} className="text-primary-foreground/50">
          {timeAgo(pub.published_at, now)}
        </time>
      )}
    </p>
  );
}

function Byline({ pub }: { pub: Pub }) {
  const source = sourceOf(pub);
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary-foreground/50">
      <span className="text-primary-foreground/80">{pub.author || "PMG Staff"}</span>
      {source && <span> · via {source}</span>}
    </p>
  );
}

function Picture({ pub, className, eager = false }: { pub: Pub; className: string; eager?: boolean }) {
  const image = publicationImage(pub.cover_url);
  return (
    <div className={`relative overflow-hidden bg-primary-foreground/10 ${className}`}>
      {image ? (
        <img
          src={image}
          alt=""
          loading={eager ? "eager" : "lazy"}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <span aria-hidden="true" className="absolute bottom-3 left-3 font-display text-4xl uppercase text-primary-foreground/20 md:text-6xl">
          PMG
        </span>
      )}
    </div>
  );
}

/** The big story at the top of the page. */
function LeadStory({ pub, now }: { pub: Pub; now: number }) {
  return (
    <Link to={`/publication/${pub.slug}`} className="group block">
      <Picture pub={pub} className="aspect-[16/9]" eager />
      <div className="pt-5">
        <Kicker pub={pub} now={now} />
        <h2 className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-tight group-hover:text-electric sm:text-5xl lg:text-6xl">
          {pub.title}
        </h2>
        {pub.excerpt && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-primary-foreground/70 md:text-lg">{pub.excerpt}</p>
        )}
        <div className="mt-4">
          <Byline pub={pub} />
        </div>
      </div>
    </Link>
  );
}

/** Thumbnail-left rows beside the lead story. */
function SideStory({ pub, now }: { pub: Pub; now: number }) {
  return (
    <Link to={`/publication/${pub.slug}`} className="group flex gap-4 border-b border-primary-foreground/15 py-5 first:pt-0 last:border-b-0">
      <div className="min-w-0 flex-1">
        <Kicker pub={pub} now={now} />
        <h3 className="mt-2 font-display text-xl uppercase leading-[1] tracking-tight group-hover:text-electric md:text-2xl">
          {pub.title}
        </h3>
      </div>
      <Picture pub={pub} className="aspect-square w-24 shrink-0 md:w-28" />
    </Link>
  );
}

/** Image-left cards in the Top Stories column. */
function TopStory({ pub, now }: { pub: Pub; now: number }) {
  return (
    <Link to={`/publication/${pub.slug}`} className="group grid grid-cols-[minmax(0,1fr)_38%] gap-5 border-b border-primary-foreground/15 py-6 first:pt-0 sm:grid-cols-[minmax(0,1fr)_42%]">
      <div className="min-w-0">
        <Kicker pub={pub} now={now} />
        <h3 className="mt-2 font-display text-2xl uppercase leading-[0.98] tracking-tight group-hover:text-electric md:text-3xl">
          {pub.title}
        </h3>
        {pub.excerpt && <p className="mt-3 hidden text-sm leading-relaxed text-primary-foreground/60 sm:block">{pub.excerpt}</p>}
        <div className="mt-3">
          <Byline pub={pub} />
        </div>
      </div>
      <Picture pub={pub} className="aspect-[4/3]" />
    </Link>
  );
}

/** Cards in the More Stories grid. */
function GridStory({ pub, now }: { pub: Pub; now: number }) {
  return (
    <Link to={`/publication/${pub.slug}`} className="group block">
      <Picture pub={pub} className="aspect-[16/10]" />
      <div className="pt-4">
        <Kicker pub={pub} now={now} />
        <h3 className="mt-2 font-display text-xl uppercase leading-[1] tracking-tight group-hover:text-electric md:text-2xl">
          {pub.title}
        </h3>
        {pub.excerpt && <p className="mt-2 text-sm leading-relaxed text-primary-foreground/60 line-clamp-3">{pub.excerpt}</p>}
      </div>
    </Link>
  );
}

/** The storystream: every story in order, newest first, with a running timeline. */
function Wire({ pubs, now }: { pubs: Pub[]; now: number }) {
  return (
    <aside aria-label="PMG Wire" className="lg:sticky lg:top-24">
      <div className="mb-4 flex items-center justify-between border-b-2 border-electric pb-2">
        <p className="font-display text-lg uppercase tracking-tight">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-electric align-middle" aria-hidden="true" />
          PMG Wire
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary-foreground/50">Live feed</span>
      </div>
      <ol className="relative border-l border-primary-foreground/20">
        {pubs.map((pub) => {
          const source = sourceOf(pub);
          return (
            <li key={pub.id} className="relative pb-5 pl-5 last:pb-0">
              <span aria-hidden="true" className="absolute -left-[5px] top-[6px] h-[9px] w-[9px] rounded-full border-2 border-primary bg-electric" />
              <Link to={`/publication/${pub.slug}`} className="group block">
                <p className="flex flex-wrap gap-x-2 font-mono text-[10px] uppercase tracking-[0.2em]">
                  {pub.published_at && (
                    <time dateTime={pub.published_at} className="text-electric">{timeAgo(pub.published_at, now)}</time>
                  )}
                  <span className="text-primary-foreground/40">{pub.category}</span>
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug group-hover:text-electric">{pub.title}</p>
                {source && <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-primary-foreground/40">via {source}</p>}
              </Link>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-5 border-b-2 border-primary-foreground pb-2 font-display text-lg uppercase tracking-tight">{children}</p>;
}

function Skeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-8 lg:grid-cols-12" aria-hidden="true">
      <div className="lg:col-span-8">
        <div className="aspect-[16/9] bg-primary-foreground/10" />
        <div className="mt-5 h-3 w-32 bg-primary-foreground/10" />
        <div className="mt-4 h-10 w-3/4 bg-primary-foreground/10" />
        <div className="mt-3 h-10 w-1/2 bg-primary-foreground/10" />
      </div>
      <div className="space-y-6 lg:col-span-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="flex-1 space-y-3">
              <div className="h-3 w-24 bg-primary-foreground/10" />
              <div className="h-6 w-full bg-primary-foreground/10" />
            </div>
            <div className="h-24 w-24 bg-primary-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Publication() {
  const [articles, setArticles] = useState<Pub[]>([]);
  const [cat, setCat] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(PAGE);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    supabase
      .from("publications")
      .select("*")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        // Skip the old placeholder headlines, which have no article or source.
        setArticles(((data ?? []) as Pub[]).filter((story) => story.body || story.source_url));
        setNow(Date.now());
        setLoading(false);
      });
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => { setShown(PAGE); }, [cat]);

  const filtered = useMemo(() => (cat === "All" ? articles : articles.filter((a) => a.category === cat)), [articles, cat]);

  // Lead = a featured story if there is one, else the newest recent story that has a picture.
  const { lead, side, top, more } = useMemo(() => {
    if (filtered.length === 0) return { lead: null as Pub | null, side: [] as Pub[], top: [] as Pub[], more: [] as Pub[] };
    const featured = filtered.find((p) => p.featured);
    const withImage = filtered.slice(0, 6).find((p) => publicationImage(p.cover_url));
    const leadStory = featured ?? withImage ?? filtered[0];
    const rest = filtered.filter((p) => p.id !== leadStory.id);
    return { lead: leadStory, side: rest.slice(0, 3), top: rest.slice(3, 9), more: rest.slice(9) };
  }, [filtered]);

  const updated = articles[0]?.published_at ?? null;
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: articles.length };
    for (const a of articles) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [articles]);

  return (
    <main className="min-h-screen bg-primary text-primary-foreground">
      <SEO
        title="Publication — PMG Wire"
        description="Music, artists and the business behind them. The PMG editorial wire, updated around the clock."
        path="/publication"
      />

      {/* Masthead */}
      <header className="px-6 pb-6 pt-28 md:px-10 md:pt-32">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-electric">Propmyganda · Editorial</p>
            <h1 className="font-display text-5xl uppercase leading-[0.9] tracking-tight sm:text-6xl md:text-8xl">Publication</h1>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary-foreground/50">
            {updated ? (
              <>Updated <time dateTime={updated}>{timeAgo(updated, now)}</time></>
            ) : (
              "Music, artists and the business behind them"
            )}
          </p>
        </div>
      </header>

      {/* Section navigation — sticks under the site nav */}
      <div className="sticky top-16 z-30 border-y border-primary-foreground/20 bg-primary/95 px-6 backdrop-blur md:top-20 md:px-10">
        <nav aria-label="Publication sections" className="flex gap-6 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`shrink-0 border-b-2 py-4 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
                cat === c ? "border-electric text-electric" : "border-transparent text-primary-foreground/50 hover:text-primary-foreground"
              }`}
            >
              {c}
              {counts[c] ? <span className="ml-1.5 text-primary-foreground/30">{counts[c]}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-6 py-8 md:px-10 md:py-12" aria-live="polite">
        {loading ? (
          <Skeleton />
        ) : !lead ? (
          <p className="py-16 font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground/60">No stories in this section yet.</p>
        ) : (
          <>
            {/* Hero: lead story + three stacked headlines */}
            <section className="grid grid-cols-1 gap-8 border-b border-primary-foreground/20 pb-10 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-8">
                <LeadStory pub={lead} now={now} />
              </div>
              <div className="lg:col-span-4 lg:border-l lg:border-primary-foreground/20 lg:pl-10">
                {side.map((p) => <SideStory key={p.id} pub={p} now={now} />)}
              </div>
            </section>

            {/* Top stories + the wire */}
            <section className="grid grid-cols-1 gap-10 py-10 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <SectionLabel>{cat === "All" ? "Top stories" : `Top in ${cat}`}</SectionLabel>
                {top.length > 0 ? (
                  top.map((p) => <TopStory key={p.id} pub={p} now={now} />)
                ) : (
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground/50">More coming soon.</p>
                )}
              </div>
              <div className="lg:col-span-4 lg:border-l lg:border-primary-foreground/20 lg:pl-10">
                <Wire pubs={articles.slice(0, 20)} now={now} />
              </div>
            </section>

            {/* Everything else */}
            {more.length > 0 && (
              <section className="border-t border-primary-foreground/20 pt-10">
                <SectionLabel>More stories</SectionLabel>
                <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {more.slice(0, shown).map((p) => <GridStory key={p.id} pub={p} now={now} />)}
                </div>
                {more.length > shown && (
                  <div className="mt-10 text-center">
                    <button
                      type="button"
                      onClick={() => setShown((n) => n + PAGE)}
                      className="border border-primary-foreground/40 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors hover:bg-primary-foreground hover:text-primary"
                    >
                      Load more stories
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
