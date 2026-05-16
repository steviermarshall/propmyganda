import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PMGScene from "@/components/webgl/PMGScene";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";
import pmgLogo from "@/assets/pmg-logo-clean.png";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/use-auth";

const Index = () => {
  const [loaded, setLoaded] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bg-background text-foreground">
      <SEO
        title="PROPMYGANDA — Independent Music & Distribution"
        description="PMG is an independent music, content and distribution company based in Brooklyn, NY. 100% independent."
        path="/"
      />
      <h1 className="sr-only">PROPMYGANDA — Independent music, content, and distribution</h1>
      {/* WebGL Hero */}
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <PMGScene />
        </div>

        {/* Overlay UI */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 md:p-10 z-[60]">
          <div className="flex justify-between items-center text-[10px] md:text-xs tracking-[0.3em] uppercase text-white/80 pointer-events-auto relative z-[60]">
            <Link to="/" aria-label="PMG home" className="flex items-center">
              <img src={pmgLogo} alt="PMG logo — independent music distribution" className="h-6 md:h-8 w-auto" />
            </Link>
            <Link
              to="/auth/login"
              className="mr-12 md:mr-0 text-[10px] tracking-[0.2em] uppercase font-bold border border-white/40 px-4 py-2 hover:bg-white hover:text-black transition-colors text-white"
            >
              Staff
            </Link>
          </div>

          <div
            className={`transition-all duration-1000 ${
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-white/70 mb-3">
              100% Independent · Content · Distribution · Culture
            </p>
            <div className="flex flex-wrap gap-3 pointer-events-auto">
              <Link
                to="/distribution"
                className="px-6 py-3 border border-white text-white text-[10px] md:text-xs tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-colors"
              >
                Distribution
              </Link>
              <Link
                to="/artists"
                className="px-6 py-3 border border-white/40 text-white text-[10px] md:text-xs tracking-[0.3em] uppercase hover:border-white transition-colors"
              >
                Roster
              </Link>
            </div>
          </div>

          <div className="flex justify-between items-end text-[10px] md:text-xs tracking-[0.3em] uppercase text-white/60">
            <span>Scroll ↓</span>
            <span className="hidden md:block">Est. Independent</span>
            <span>WebGL · v1.0</span>
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="relative py-32 md:py-48 px-6 md:px-10 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-white/50 mb-8">
              01 — Manifesto
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.15} y={80}>
            <h2 className="text-3xl md:text-6xl lg:text-7xl font-black uppercase leading-[0.95] tracking-tight">
              We move <span className="italic font-light">music</span> for artists
              who refuse to <span className="italic font-light">wait</span> for
              permission.
            </h2>
          </ScrollReveal>
        </div>
      </section>

      {/* Pillars */}
      <section className="relative py-32 px-6 md:px-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-white/50 mb-12">
              02 — What We Do
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10">
            {[
              { n: "01", t: "Distribution", d: "Selective placement across every major DSP. Transparent splits. No middlemen." },
              { n: "02", t: "Content", d: "From visuals to long-form, we build the world around the record." },
              { n: "03", t: "Culture", d: "We invest in scenes, not just streams. Brooklyn-rooted, globally minded." },
            ].map((x, i) => (
              <ScrollReveal key={x.n} delay={i * 0.12} y={50}>
                <div className="bg-black p-8 md:p-12 group hover:bg-white hover:text-black transition-colors duration-500 h-full">
                  <p className="text-xs tracking-[0.3em] mb-12 opacity-50">{x.n}</p>
                  <h3 className="text-2xl md:text-3xl font-bold uppercase mb-4">
                    {x.t}
                  </h3>
                  <p className="text-sm opacity-70 leading-relaxed">{x.d}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 md:py-48 px-6 md:px-10 border-t border-white/10 text-center">
        <ScrollReveal>
          <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-white/50 mb-8">
            03 — Get In
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.15} y={80}>
          <h2 className="text-4xl md:text-7xl lg:text-8xl font-black uppercase mb-12 leading-none">
            Let's <span className="italic font-light">build</span>.
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.3}>
          <Link
            to="/contact"
            className="inline-block px-10 py-4 border border-white text-xs tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-colors"
          >
            Contact PMG
          </Link>
        </ScrollReveal>
      </section>

      <Marquee />
    </div>
  );
};

export default Index;
