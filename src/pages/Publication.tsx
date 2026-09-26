import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import SEO from "@/components/SEO";
import { publicationImage } from "@/lib/publicationImage";

type Pub = Database["public"]["Tables"]["publications"]["Row"] & { source_url?: string | null; credit?: string | null };
const CATEGORIES = ["All", "Business", "Artists", "Culture", "Milestones", "Industry"] as const;

function dateOf(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
}

function Story({ pub, lead = false }: { pub: Pub; lead?: boolean }) {
  const image = publicationImage(pub.cover_url);
  return (
    <Link to={`/publication/${pub.slug}`} className={`group block min-w-0 ${lead ? "md:col-span-2" : ""}`}>
      <div className={`relative overflow-hidden border border-primary-foreground/15 bg-secondary ${lead ? "aspect-[4/3] md:aspect-[16/7]" : "aspect-[4/3]"}`}>
        {image ? <img src={image} alt="" loading={lead ? "eager" : "lazy"} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <span className="absolute bottom-4 left-4 font-display text-5xl uppercase text-secondary-foreground/20 md:text-7xl" aria-hidden="true">PMG</span>}
      </div>
      <div className="border-b border-primary-foreground/20 py-5">
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase text-electric">
          <span>{pub.category}</span><span className="text-primary-foreground/50">{dateOf(pub.published_at)}</span>
          {pub.credit && <span className="text-primary-foreground/50">{pub.credit}</span>}
        </div>
        <h2 className={`font-display uppercase leading-none group-hover:text-electric ${lead ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"}`}>{pub.title}</h2>
        {pub.excerpt && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-primary-foreground/60">{pub.excerpt}</p>}
      </div>
    </Link>
  );
}

export default function Publication() {
  const [articles, setArticles] = useState<Pub[]>([]);
  const [cat, setCat] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("publications").select("*")
      .not("published_at", "is", null).lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        // Do not publish the old placeholder headlines, which have no article or source.
        setArticles(((data ?? []) as Pub[]).filter((story) => story.body || story.source_url));
        setLoading(false);
      });
  }, []);
  const filtered = cat === "All" ? articles : articles.filter((a) => a.category === cat);
  return (
    <main className="min-h-screen bg-primary text-primary-foreground">
      <SEO title="Publication — PMG Editorial" description="Music, artists and the business behind them. The PMG editorial wire." path="/publication" />
      <header className="border-b border-primary-foreground/20 px-6 pb-8 pt-28 md:px-10 md:pt-32">
        <p className="font-mono text-[10px] uppercase text-electric">Propmyganda · Editorial</p>
        <h1 className="font-display text-5xl uppercase leading-none md:text-8xl">Publication</h1>
      </header>
      <div className="border-b border-primary-foreground/20 px-6 md:px-10">
        <nav aria-label="Publication categories" className="flex gap-6 overflow-x-auto">
          {CATEGORIES.map((c) => <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`shrink-0 border-b-2 py-4 font-mono text-[10px] uppercase ${cat === c ? "border-electric text-electric" : "border-transparent text-primary-foreground/50 hover:text-primary-foreground"}`}>{c}</button>)}
        </nav>
      </div>
      <section className="container-content py-8 md:py-12" aria-live="polite">
        {loading ? <p className="font-mono text-xs uppercase text-primary-foreground/50">Loading…</p> : filtered.length === 0 ? <p className="py-16 font-mono text-xs uppercase text-primary-foreground/60">No stories in this section yet.</p> : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
            {filtered.map((pub, i) => <Story key={pub.id} pub={pub} lead={i === 0} />)}
          </div>
        )}
      </section>
    </main>
  );
}
