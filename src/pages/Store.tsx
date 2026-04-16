import { useState } from "react";
import { Link } from "react-router-dom";
import { products } from "@/lib/data";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";
import { ShoppingBag } from "lucide-react";

const filters = ["All", "Music", "Clothing", "Accessories"];

const Store = () => {
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = activeFilter === "All" ? products : products.filter((p) => p.category === activeFilter);

  return (
    <div>
      {/* Hero */}
      <div className="bg-primary text-primary-foreground pt-32 pb-20 overflow-hidden">
        <div className="container-content">
          <ScrollReveal variant="clip" duration={1.2}>
            <p className="text-xs tracking-[0.3em] uppercase opacity-60 mb-4">PMG / Merch</p>
          </ScrollReveal>
          <ScrollReveal variant="up" delay={0.15} duration={1.1}>
            <h1 className="text-6xl md:text-9xl text-heading leading-[0.85]">Store</h1>
          </ScrollReveal>
          <ScrollReveal variant="blur" delay={0.35}>
            <p className="mt-6 max-w-xl text-sm md:text-base opacity-70">
              Limited drops, vinyl, and apparel from the PMG collective. Wear the culture.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Products */}
      <section className="section-padding bg-background">
        <div className="container-content">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-12">
            {filters.map((f, i) => (
              <ScrollReveal key={f} variant="scale" delay={i * 0.06} duration={0.6}>
                <button
                  onClick={() => setActiveFilter(f)}
                  className={`text-xs tracking-[0.15em] uppercase font-bold px-5 py-3 border transition-all duration-300 ${
                    f === activeFilter
                      ? "bg-primary text-primary-foreground border-primary scale-105"
                      : "border-border hover:border-foreground hover:-translate-y-0.5"
                  }`}
                >
                  {f}
                </button>
              </ScrollReveal>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((product, i) => {
              const variants = ["up", "scale", "rotate", "blur"] as const;
              const variant = variants[i % variants.length];
              return (
                <ScrollReveal key={product.id} variant={variant} delay={(i % 3) * 0.12} y={60}>
                  <Link to={`/store/${product.id}`} className="group block">
                    <div className="relative aspect-square bg-secondary overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        loading="lazy"
                        width={800}
                        height={800}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                        <span className="inline-flex items-center gap-2 text-primary-foreground text-xs tracking-[0.2em] uppercase font-bold translate-y-4 group-hover:translate-y-0 transition-transform duration-500 bg-primary-foreground/15 backdrop-blur-md px-4 py-2 border border-primary-foreground/30">
                          <ShoppingBag size={14} /> Add to Cart
                        </span>
                      </div>
                      {product.category === "Clothing" && (
                        <span className="absolute top-4 left-4 text-[10px] tracking-[0.2em] uppercase font-bold bg-primary-foreground text-primary px-2 py-1">
                          Apparel
                        </span>
                      )}
                    </div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mt-4 transition-colors group-hover:text-foreground">
                      {product.artist}
                    </p>
                    <p className="text-sm font-bold uppercase mt-1">{product.name}</p>
                    <p className="text-sm mt-1 font-mono">${product.price}</p>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <Marquee />
    </div>
  );
};

export default Store;
