import { useState } from "react";
import { Link } from "react-router-dom";
import { products } from "@/lib/data";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";
import SEO from "@/components/SEO";

const filters = ["All", "Music", "Clothing", "Accessories"];

const Store = () => {
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = activeFilter === "All" ? products : products.filter((p) => p.category === activeFilter);
  const featured = products[0];

  return (
    <div className="bg-background">
      <SEO
        title="Store — PMG Official Merchandise | PROPMYGANDA"
        description="Official PMG and artist merchandise. Music, apparel, and accessories. Ships worldwide."
        path="/store"
      />

      {/* Hero */}
      <div className="bg-black text-white pt-32 pb-0 overflow-hidden">
        <div className="container-content">
          <ScrollReveal>
            <p className="text-xs tracking-[0.3em] uppercase text-white/40 mb-4">PMG Official</p>
            <h1 className="text-[12vw] md:text-[10vw] font-display uppercase leading-none tracking-tight">Store</h1>
          </ScrollReveal>
        </div>
        {/* Featured product strip */}
        <div className="mt-8 border-t border-white/10">
          <Link to={`/store/${featured.id}`} className="group block">
            <div className="container-content py-6 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/5 overflow-hidden">
                  <img src={featured.image} alt={featured.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-0.5">Featured Drop</p>
                  <p className="font-display text-xl uppercase tracking-wide">{featured.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-electric font-display text-2xl">${featured.price}</span>
                <span className="text-xs tracking-[0.2em] uppercase text-white/40 group-hover:text-white transition-colors">Shop →</span>
              </div>
            </div>
          </Link>
        </div>
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
                  {f === "All" ? products.length : products.filter(p => p.category === f).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="section-padding">
        <div className="container-content">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {filtered.map((product, i) => (
              <ScrollReveal key={product.id} delay={(i % 3) * 0.05} y={30}>
                <Link to={`/store/${product.id}`} className="group block bg-background">
                  <div className="relative aspect-square overflow-hidden bg-secondary">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                      width={800}
                      height={800}
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 transition-colors duration-300 flex items-center justify-center">
                      <span className="text-white text-xs tracking-[0.3em] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white px-5 py-3">
                        View
                      </span>
                    </div>
                    {/* Category tag */}
                    <div className="absolute top-3 left-3">
                      <span className="bg-black text-white text-[9px] tracking-[0.2em] uppercase px-2 py-1">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 md:p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{product.artist}</p>
                    <p className="font-display text-lg uppercase leading-tight">{product.name}</p>
                    <p className="text-electric font-bold text-sm mt-1">${product.price}</p>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
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
