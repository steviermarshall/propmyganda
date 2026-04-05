import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import hero4 from "@/assets/hero-4.jpg";

const slides = [
  { image: hero1, artist: "Albee Al", tagline: "'NEW PROJECT' OUT NOW", cta: "Listen" },
  { image: hero2, artist: "ElCamino", tagline: "'LATEST DROP' AVAILABLE NOW", cta: "Listen" },
  { image: hero3, artist: "Max B", tagline: "THE CATALOG • STREAM NOW", cta: "Listen" },
  { image: hero4, artist: "PMG Presents", tagline: "THE FUTURE OF INDEPENDENT", cta: "Watch" },
];

const HeroCarousel = () => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((p) => (p + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-primary">
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={slide.image}
            alt={slide.artist}
            className="absolute inset-0 w-full h-full object-cover"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-primary/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-foreground text-center px-6">
            <h1 className="text-5xl md:text-8xl lg:text-9xl font-black uppercase tracking-tight mb-4">
              {slide.artist}
            </h1>
            <p className="text-sm md:text-lg tracking-[0.3em] uppercase mb-8 opacity-80">
              {slide.tagline}
            </p>
            <div className="flex gap-4">
              <button className="border border-primary-foreground px-8 py-3 text-xs tracking-[0.2em] uppercase font-bold hover:bg-primary-foreground hover:text-primary transition-colors">
                {slide.cta}
              </button>
              {i === 0 && (
                <button className="border border-primary-foreground px-8 py-3 text-xs tracking-[0.2em] uppercase font-bold hover:bg-primary-foreground hover:text-primary transition-colors">
                  Watch
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-primary-foreground opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Previous slide"
      >
        <ChevronLeft size={40} />
      </button>
      <button
        onClick={next}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-primary-foreground opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Next slide"
      >
        <ChevronRight size={40} />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 transition-all ${
              i === current ? "bg-primary-foreground w-8" : "bg-primary-foreground/40"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
