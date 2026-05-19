import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import SEO from "@/components/SEO";

type Pub = Database["public"]["Tables"]["publications"]["Row"];

const CATEGORIES = ["All", "Business", "Artists", "Culture", "Milestones", "Industry"] as const;

const CAT_COLOR: Record<string, string> = {
  Business:    "#00F0FF",
  Artists:     "#FF3B30",
  Culture:     "#FFCC00",
  Milestones:  "#34C759",
  Industry:    "#AF52DE",
};

function fmtDate(s: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

function timeAgo(s: string | null) {
  if (!s) return "";
  const diff = Date.now() - new Date(s).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return fmtDate(s);
}

// Massive featured hero — looks like The Verge top-of-page
function HeroFeatured({ pub }: { pub: Pub }) {
  const color = CAT_COLOR[pub.category] ?? "#000";
  return (
    <Link to={`/publication/${pub.slug}`} className="block group border-b-4 border-black">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {pub.cover_url && (
          <div className="aspect-[4/3] lg:aspect-auto overflow-hidden bg-black">
            <img
              src={pub.cover_url}
              alt={pub.title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
          </div>
        )}
        <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-white">
          <span
            className="inline-block self-start text-[10px] tracking-[0.25em] uppercase font-bold mb-6 px-2 py-1 text-white"
            style={{ backgroundColor: color }}
          >
            {pub.category}
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl uppercase leading-[0.95] tracking-tight mb-6 text-black group-hover:underline decoration-2 underline-offset-4">
            {pub.title}
          </h2>
          {pub.excerpt && (
            <p className="text-base lg:text-lg text-black/60 leading-relaxed mb-6 max-w-xl">{pub.excerpt}</p>
          )}
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-black/50">
            {pub.author && <span className="font-bold text-black/80">By {pub.author}</span>}
            {pub.author && pub.published_at && <span>·</span>}
            {pub.published_at && <span>{timeAgo(pub.published_at)}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Medium card — for the top stories rail
function MediumCard({ pub }: { pub: Pub }) {
  const color = CAT_COLOR[pub.category] ?? "#000";
  return (
    <Link to={`/publication/${pub.slug}`} className="group block">
      {pub.cover_url && (
        <div className="aspect-video overflow-hidden bg-black mb-4">
          <img
            src={pub.cover_url}
            alt={pub.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      )}
      <span
        className="inline-block text-[9px] tracking-[0.25em] uppercase font-bold mb-2 px-1.5 py-0.5 text-white"
        style={{ backgroundColor: color }}
      >
        {pub.category}
      </span>
      <h3 className="font-display text-xl md:text-2xl uppercase leading-[1] tracking-tight text-black group-hover:underline decoration-2 underline-offset-4 mb-2">
        {pub.title}
      </h3>
      {pub.excerpt && <p className="text-sm text-black/60 line-clamp-2 mb-2">{pub.excerpt}</p>}
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-black/40">
        {pub.author && <span className="font-bold">{pub.author}</span>}
        {pub.author && pub.published_at && <span>·</span>}
        {pub.published_at && <span>{timeAgo(pub.published_at)}</span>}
      </div>
    </Link>
  );
}

// Compact row card — for the list section
function CompactCard({ pub }: { pub: Pub }) {
  const color = CAT_COLOR[pub.category] ?? "#000";
  return (
    <Link to={`/publication/${pub.slug}`} className="group grid grid-cols-[1fr_auto] gap-4 py-4 border-b border-black/10 items-start">
      <div className="min-w-0">
        <span
          className="inline-block text-[9px] tracking-[0.25em] uppercase font-bold mb-2 px-1.5 py-0.5 text-white"
          style={{ backgroundColor: color }}
        >
          {pub.category}
        </span>
        <h3 className="font-display text-lg md:text-xl uppercase leading-[1.05] tracking-tight text-black group-hover:underline decoration-2 underline-offset-4 mb-1">
          {pub.title}
        </h3>
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-black/40 mt-1">
          {pub.author && <span className="font-bold">{pub.author}</span>}
          {pub.author && pub.published_at && <span>·</span>}
          {pub.published_at && <span>{timeAgo(pub.published_at)}</span>}
        </div>
      </div>
      {pub.cover_url && (
        <div className="w-24 md:w-32 aspect-square overflow-hidden bg-black flex-shrink-0">
          <img
            src={pub.cover_url}
            alt={pub.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      )}
    </Link>
  );
}

export default function Publication() {
  const [articles, setArticles] = useState<Pub[]>([]);
  const [cat, setCat] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("publications")
      .select("*")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        setArticles((data ?? []) as Pub[]);
        setLoading(false);
      });
  }, []);

  const filtered = cat === "All" ? articles : articles.filter((a) => a.category === cat);
  const hero = filtered.find((a) => a.featured) ?? filtered[0];
  const rest = filtered.filter((a) => a !== hero);
  const topThree = rest.slice(0, 3);
  const list = rest.slice(3);

  return (
    <div className="bg-white text-black min-h-screen">
      <SEO
        title="Publication — PMG Editorial"
        description="Editorial on independent music: business, artists, culture, milestones, and industry. By PROPMYGANDA."
        path="/publication"
      />

      {/* Masthead — Verge-style top bar */}
      <header className="border-b-4 border-black bg-white pt-28 pb-6">
        <div className="container-content">
          <p className="text-[10px] tracking-[0.4em] uppercase text-black/40 mb-2">PROPMYGANDA</p>
          <h1 className="font-display text-6xl md:text-8xl uppercase tracking-tight leading-none">Publication</h1>
          <p className="text-sm text-black/60 mt-3 max-w-2xl">
            Editorial on independent music — business, artists, culture, milestones, and the industry behind it.
          </p>
        </div>
      </header>

      {/* Category filters */}
      <div className="border-b border-black/10 bg-white sticky top-0 z-20">
        <div className="container-content">
          <div className="flex gap-0 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`text-[10px] tracking-[0.25em] uppercase font-bold px-4 py-4 whitespace-nowrap border-b-2 transition-colors ${
                  c === cat ? "border-black text-black" : "border-transparent text-black/40 hover:text-black"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="container-content py-24 text-center text-black/40 text-sm uppercase tracking-widest">
          Loading…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="container-content py-24 text-center">
          <p className="text-black/40 text-sm uppercase tracking-widest">No articles yet</p>
        </div>
      )}

      {!loading && hero && (
        <>
          {/* Hero featured */}
          <HeroFeatured pub={hero} />

          {/* Top three */}
          {topThree.length > 0 && (
            <section className="container-content py-12 border-b border-black/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {topThree.map((pub) => <MediumCard key={pub.id} pub={pub} />)}
              </div>
            </section>
          )}

          {/* Two-column: list + sidebar latest */}
          {list.length > 0 && (
            <section className="container-content py-12">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
                {/* Main list */}
                <div>
                  <p className="text-[10px] tracking-[0.4em] uppercase font-bold text-black mb-4 pb-3 border-b-2 border-black">
                    More Stories
                  </p>
                  <div>
                    {list.map((pub) => <CompactCard key={pub.id} pub={pub} />)}
                  </div>
                </div>

                {/* Sidebar: most recent regardless of section */}
                <aside className="lg:sticky lg:top-24 lg:self-start">
                  <p className="text-[10px] tracking-[0.4em] uppercase font-bold text-black mb-4 pb-3 border-b-2 border-black">
                    Latest
                  </p>
                  <ol className="space-y-5">
                    {articles.slice(0, 6).map((pub, i) => (
                      <li key={pub.id} className="grid grid-cols-[24px_1fr] gap-3">
                        <span className="font-display text-2xl leading-none text-black/20">{i + 1}</span>
                        <Link to={`/publication/${pub.slug}`} className="group block">
                          <h4 className="font-display text-sm uppercase leading-[1.1] tracking-tight text-black group-hover:underline decoration-2 underline-offset-2">
                            {pub.title}
                          </h4>
                          <p className="text-[9px] uppercase tracking-[0.2em] text-black/40 mt-1">
                            {pub.category} · {timeAgo(pub.published_at)}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </aside>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
