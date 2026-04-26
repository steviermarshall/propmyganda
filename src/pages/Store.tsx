import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { productImage } from "@/lib/fallback-assets";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";

type Product = Database["public"]["Tables"]["products"]["Row"];

const filters = ["All", "Music", "Clothing", "Accessories"] as const;

const Store = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<typeof filters[number]>("All");

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProducts((data ?? []) as Product[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () => (activeFilter === "All" ? products : products.filter((p) => p.category === activeFilter)),
    [activeFilter, products],
  );

  const featured = useMemo(() => products.find((p) => p.featured) ?? products[0] ?? null, [products]);

  return (
    <div className="bg-background">
      {/* Hero */}
      <div className="bg-black text-white pt-32 pb-0 overflow-hidden">
        <div className="container-content">
          <ScrollReveal>
            <p className="text-xs tracking-[0.3em] uppercase text-white/40 mb-4">PMG Official</p>
            <h1 className="text-[12vw] md:text-[10vw] font-display uppercase leading-none tracking-tight">Store</h1>
          </ScrollReveal>
        </div>
        {/* Featured product strip */}
        {featured && (
          <div className="mt-8 border-t border-white/10">
            <Link to={`/store/${featured.slug}`} className="group block">
              <div className="container-content py-6 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/5 overflow-hidden">
                    <img
                      src={productImage(featured.slug, featured.image_url)}
                      alt={featured.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-0.5">Featured Drop</p>
                    <p className="font-display text-xl uppercase tracking-wide">{featured.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-electric font-display text-2xl">${(featured.price_cents / 100).toFixed(0)}</span>
                  <span className="text-xs tracking-[0.2em] uppercase text-white/40 group-hover:text-white transition-colors">Shop →</span>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="border-b border-border sticky top-16 md:top-20 z-30 bg-background">
        <div className="container-content">
          <div className="flex gap-0 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`text-[11px] tracking-[0.2em] uppercase font-bold px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                  f === activeFilter
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
                <span className="ml-2 text-[10px] opacity-50">
                  {f === "All" ? products.length : products.filter((p) => p.category === f).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="section-padding">
        <div className="container-content">
          {loading && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading…</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm uppercase tracking-widest">No products yet</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {filtered.map((product, i) => (
                <ScrollReveal key={product.id} delay={(i % 3) * 0.05} y={30}>
                  <Link to={`/store/${product.slug}`} className="group block bg-background">
                    <div className="relative aspect-square overflow-hidden bg-secondary">
                      <img
                        src={productImage(product.slug, product.image_url)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                        width={800}
                        height={800}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 transition-colors duration-300 flex items-center justify-center">
                        <span className="text-white text-xs tracking-[0.3em] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white px-5 py-3">
                          View
                        </span>
                      </div>
                      <div className="absolute top-3 left-3">
                        <span className="bg-black text-white text-[9px] tracking-[0.2em] uppercase px-2 py-1">
                          {product.category}
                        </span>
                      </div>
                      {product.inventory !== null && product.inventory <= 0 && (
                        <div className="absolute top-3 right-3">
                          <span className="bg-red-500/80 text-white text-[9px] tracking-[0.2em] uppercase px-2 py-1">
                            Sold Out
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 md:p-5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{product.artist}</p>
                      <p className="font-display text-lg uppercase leading-tight">{product.name}</p>
                      <p className="text-electric font-bold text-sm mt-1">${(product.price_cents / 100).toFixed(0)}</p>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-black text-white py-20">
        <div className="container-content text-center">
          <ScrollReveal>
            <h2 className="font-display text-5xl md:text-7xl uppercase mb-6">100% Independent</h2>
            <p className="text-white/50 text-sm tracking-widest uppercase mb-8">Every purchase supports the movement</p>
            <div className="w-16 h-px bg-electric mx-auto" />
          </ScrollReveal>
        </div>
      </section>

      <Marquee />
    </div>
  );
};

export default Store;
