import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import SEO from "@/components/SEO";

type Pub = Database["public"]["Tables"]["publications"]["Row"];

const CAT_COLOR: Record<string, string> = {
  Business:    "#00F0FF",
  Artists:     "#FF3B30",
  Culture:     "#FFCC00",
  Milestones:  "#34C759",
  Industry:    "#AF52DE",
};

function fmtDate(s: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  }).toUpperCase();
}

export default function PublicationDetail() {
  const { slug } = useParams();
  const [pub, setPub] = useState<Pub | null>(null);
  const [related, setRelated] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("publications")
        .select("*").eq("slug", slug).maybeSingle();
      setPub(data as Pub | null);

      if (data) {
        const { data: rel } = await supabase.from("publications")
          .select("*")
          .eq("category", (data as Pub).category)
          .neq("id", (data as Pub).id)
          .not("published_at", "is", null)
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false })
          .limit(3);
        setRelated((rel ?? []) as Pub[]);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-white min-h-screen pt-40 text-center text-black/40 text-sm uppercase tracking-widest">
        Loading…
      </div>
    );
  }

  if (!pub) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl uppercase mb-4">Article Not Found</h1>
          <Link to="/publication" className="text-xs tracking-[0.2em] uppercase border-b-2 border-black pb-1">
            Back to Publication
          </Link>
        </div>
      </div>
    );
  }

  const color = CAT_COLOR[pub.category] ?? "#000";

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: pub.title,
    description: pub.excerpt ?? undefined,
    image: pub.cover_url ?? undefined,
    author: pub.author ? { "@type": "Person", name: pub.author } : undefined,
    datePublished: pub.published_at ?? undefined,
  };

  return (
    <div className="bg-white text-black min-h-screen">
      <SEO
        title={`${pub.title} — PMG Publication`}
        description={pub.excerpt ?? `${pub.category} story from PROPMYGANDA.`}
        path={`/publication/${pub.slug}`}
        image={pub.cover_url ?? undefined}
        type="article"
        jsonLd={articleJsonLd}
      />

      {/* Breadcrumb */}
      <div className="container-content pt-28 pb-6 border-b border-black/10">
        <Link to="/publication" className="text-[10px] tracking-[0.3em] uppercase text-black/40 hover:text-black">
          ← Publication
        </Link>
      </div>

      {/* Header */}
      <header className="container-content max-w-4xl py-12 md:py-16">
        <span
          className="inline-block text-[10px] tracking-[0.25em] uppercase font-bold mb-6 px-2 py-1 text-white"
          style={{ backgroundColor: color }}
        >
          {pub.category}
        </span>
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl uppercase leading-[0.95] tracking-tight mb-6">
          {pub.title}
        </h1>
        {pub.excerpt && (
          <p className="text-lg md:text-xl text-black/60 leading-relaxed mb-8 max-w-3xl">{pub.excerpt}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-black/60 pt-6 border-t border-black/10">
          {pub.author && <span className="font-bold text-black">By {pub.author}</span>}
          {pub.author && pub.published_at && <span>·</span>}
          {pub.published_at && <span>{fmtDate(pub.published_at)}</span>}
        </div>
      </header>

      {/* Cover image */}
      {pub.cover_url && (
        <div className="container-content max-w-5xl mb-12">
          <div className="aspect-video overflow-hidden bg-black">
            <img src={pub.cover_url} alt={pub.title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Body */}
      {pub.body && (
        <article className="container-content max-w-3xl pb-16">
          <div
            className="prose prose-lg max-w-none
              prose-headings:font-display prose-headings:uppercase prose-headings:tracking-tight
              prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
              prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-base prose-p:leading-relaxed prose-p:text-black/80 prose-p:mb-6
              prose-a:text-black prose-a:underline prose-a:decoration-2 prose-a:underline-offset-4
              prose-strong:text-black prose-strong:font-bold
              prose-blockquote:border-l-4 prose-blockquote:border-black prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-black/70
              prose-img:my-8"
            dangerouslySetInnerHTML={{ __html: pub.body }}
          />
        </article>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t-4 border-black bg-white">
          <div className="container-content py-12">
            <p className="text-[10px] tracking-[0.4em] uppercase font-bold text-black mb-6 pb-3 border-b-2 border-black">
              More in {pub.category}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {related.map((r) => (
                <Link key={r.id} to={`/publication/${r.slug}`} className="group block">
                  {r.cover_url && (
                    <div className="aspect-video overflow-hidden bg-black mb-4">
                      <img
                        src={r.cover_url}
                        alt={r.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <h3 className="font-display text-xl uppercase leading-[1] tracking-tight group-hover:underline decoration-2 underline-offset-4 mb-2">
                    {r.title}
                  </h3>
                  {r.published_at && (
                    <p className="text-[9px] uppercase tracking-[0.2em] text-black/40">
                      {fmtDate(r.published_at)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
