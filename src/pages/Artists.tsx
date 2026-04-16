import { Link } from "react-router-dom";
import { artists } from "@/lib/data";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";

const Artists = () => {
  return (
    <div>
      {/* Hero */}
      <div className="bg-primary text-primary-foreground pt-32 pb-16">
        <div className="container-content">
          <ScrollReveal>
            <h1 className="text-5xl md:text-8xl text-heading">Artists</h1>
          </ScrollReveal>
        </div>
      </div>

      {/* Grid */}
      <section className="section-padding bg-background">
        <div className="container-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {artists.map((artist, i) => (
              <ScrollReveal key={artist.id} delay={(i % 3) * 0.1} y={50}>
                <Link to={`/artists/${artist.id}`} className="group block">
                  <div className="relative hover-zoom aspect-square bg-secondary">
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      width={800}
                      height={800}
                    />
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/60 transition-colors duration-300 flex items-center justify-center">
                      <span className="text-primary-foreground text-xs tracking-[0.3em] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        View Artist
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold uppercase tracking-wider mt-4">{artist.name}</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{artist.genre}</p>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <Marquee />
    </div>
  );
};

export default Artists;
