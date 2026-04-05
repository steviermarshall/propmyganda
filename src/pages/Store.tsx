import { useState } from "react";
import { Link } from "react-router-dom";
import { products } from "@/lib/data";
import Marquee from "@/components/Marquee";

const filters = ["All", "Music", "Clothing", "Accessories"];

const Store = () => {
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = activeFilter === "All" ? products : products.filter((p) => p.category === activeFilter);

  return (
    <div>
      {/* Hero */}
      <div className="bg-primary text-primary-foreground pt-32 pb-16">
        <div className="container-content">
          <h1 className="text-5xl md:text-8xl text-heading">Store</h1>
        </div>
      </div>

      {/* Products */}
      <section className="section-padding bg-background">
        <div className="container-content">
          {/* Filters */}
          <div className="flex gap-2 mb-10">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`text-xs tracking-[0.15em] uppercase font-bold px-5 py-3 border transition-colors ${
                  f === activeFilter
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((product) => (
              <Link to={`/store/${product.id}`} key={product.id} className="group">
                <div className="relative aspect-square bg-secondary hover-zoom">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={800}
                    height={800}
                  />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/60 transition-colors duration-300 flex items-end p-6">
                    <span className="text-primary-foreground text-xs tracking-[0.2em] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-primary-foreground/20 backdrop-blur-sm px-4 py-2">
                      Add to Cart
                    </span>
                  </div>
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mt-4">{product.artist}</p>
                <p className="text-sm font-bold uppercase mt-1">{product.name}</p>
                <p className="text-sm mt-1">${product.price}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Marquee />
    </div>
  );
};

export default Store;
