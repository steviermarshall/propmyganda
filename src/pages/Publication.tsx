import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";

type Pub = Database["public"]["Tables"]["publications"]["Row"];

const CATEGORIES = ["All", "Business", "Artists", "Culture", "Milestones", "Industry"] as const;

function ArticleCard({ pub, featured }: { pub: Pub; featured?: boolean }) {
  return (
    <ScrollReveal y={40}>
      <article className={`group cursor-pointer border border-border hover:border-foreground transition-colors ${featured ? "md:col-span-2" : ""}`}>
        {pub.cover_url && (
          <div className={`bg-secondary overflow-hidden ${featured ? "aspect-video" : "aspect-video"}`}>
            <img
              src={pub.cover_url}
              alt={pub.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground border border-border px-2 py-0.5">
              {pub.category}
            </span>
            {pub.published_at && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(pub.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </div>
          <h2 className={`font-black uppercase tracking-tight leading-tight ${featured ? "text-2xl md:text-3xl" : "text-lg"}`}>
            {pub.title}
          </h2>
          {pub.excerpt && (
            <p className="text-muted-foreground text-sm mt-2 line-clamp-2">{pub.excerpt}</p>
          )}
          {pub.author && (
            <p className="text-xs text-muted-foreground mt-4 uppercase tracking-widest">{pub.author}</p>
          )}
        </div>
      </article>
    </ScrollReveal>
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
  const featured = filtered.find((a) => a.featured);
  const rest = filtered.filter((a) => !a.featured || a !== featured);

  return (
    <div>
      <div className="bg-primary text-primary-foreground pt-32 pb-16">
        <div className="container-content">
          <ScrollReveal>
            <h1 className="text-5xl md:text-8xl text-heading">Publication</h1>
          </ScrollReveal>
        </div>
      </div>

      <section className="section-padding bg-background">
        <div className="container-content">
          {/* Category filters */}
          <div className="flex gap-2 mb-10 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`text-xs tracking-[0.15em] uppercase font-bold px-4 py-2 border transition-colors ${
                  c === cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading…</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm uppercase tracking-widest">No articles yet</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featured && <ArticleCard pub={featured} featured />}
              {rest.map((pub) => (
                <ArticleCard key={pub.id} pub={pub} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Marquee />
    </div>
  );
}
