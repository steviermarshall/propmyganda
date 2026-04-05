import { Link } from "react-router-dom";
import HeroCarousel from "@/components/HeroCarousel";
import Marquee from "@/components/Marquee";
import { products, newsArticles, artists } from "@/lib/data";

const Index = () => {
  return (
    <div>
      {/* Hero */}
      <HeroCarousel />

      {/* Shop Preview */}
      <section className="section-padding bg-background">
        <div className="container-content">
          <div className="flex items-end justify-between mb-10">
            <h2 className="text-3xl md:text-5xl text-heading">Shop</h2>
            <Link to="/store" className="text-xs tracking-[0.2em] uppercase font-bold border-b border-foreground pb-1 hover:opacity-60 transition-opacity">
              Shop All
            </Link>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
            {products.slice(0, 5).map((product) => (
              <Link to="/store" key={product.id} className="flex-shrink-0 w-56 md:w-64 group">
                <div className="hover-zoom aspect-square bg-secondary mb-3">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" width={800} height={800} />
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{product.artist}</p>
                <p className="text-sm font-bold uppercase mt-1">{product.name}</p>
                <p className="text-sm mt-1">${product.price}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* News */}
      <section className="section-padding bg-background border-t border-border">
        <div className="container-content">
          <h2 className="text-3xl md:text-5xl text-heading mb-10">News</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Featured */}
            <div className="group cursor-pointer">
              <div className="aspect-video bg-primary mb-4 hover-zoom">
                <img src={artists[0].image} alt="News" className="w-full h-full object-cover grayscale" loading="lazy" width={800} height={800} />
              </div>
              <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground">{newsArticles[0].category}</span>
              <h3 className="text-xl md:text-2xl font-bold uppercase mt-2">{newsArticles[0].title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{newsArticles[0].excerpt}</p>
            </div>
            {/* Smaller articles */}
            <div className="space-y-6">
              {newsArticles.slice(1).map((article) => (
                <div key={article.id} className="flex gap-4 cursor-pointer group border-b border-border pb-6">
                  <div className="w-24 h-24 flex-shrink-0 bg-secondary hover-zoom">
                    <img src={artists[article.id % artists.length].image} alt={article.title} className="w-full h-full object-cover grayscale" loading="lazy" width={800} height={800} />
                  </div>
                  <div>
                    <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground">{article.category}</span>
                    <h4 className="text-sm font-bold uppercase mt-1 group-hover:opacity-60 transition-opacity">{article.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{article.excerpt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Socials */}
      <section className="section-padding bg-background border-t border-border">
        <div className="container-content">
          <div className="flex items-end justify-between mb-10">
            <h2 className="text-3xl md:text-5xl text-heading">Socials</h2>
            <a href="#" className="text-xs tracking-[0.2em] uppercase font-bold border-b border-foreground pb-1 hover:opacity-60 transition-opacity">
              Follow Us
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {artists.slice(0, 4).map((a, i) => (
              <div key={i} className="aspect-square hover-zoom cursor-pointer">
                <img src={a.image} alt="Social" className="w-full h-full object-cover" loading="lazy" width={800} height={800} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marquee */}
      <Marquee />
    </div>
  );
};

export default Index;
