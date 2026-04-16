import { useState } from "react";
import { artists } from "@/lib/data";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";

const services = [
  { name: "Digital Distribution", desc: "We deliver your music to every major platform — Spotify, Apple Music, Amazon, Tidal, YouTube Music, and 150+ more. Global reach, zero compromise." },
  { name: "Content Strategy", desc: "From visual rollouts to social content calendars, we build campaigns that cut through the noise and connect with real listeners." },
  { name: "Marketing & Promo", desc: "Playlist pitching, PR campaigns, influencer seeding, and paid media — all handled in-house with a data-driven approach." },
  { name: "Sync Licensing", desc: "We place your music in film, TV, commercials, and games. Our sync team has relationships with every major network and studio." },
  { name: "Catalog Management", desc: "Full catalog administration including metadata optimization, rights management, and revenue tracking across all territories." },
  { name: "Analytics & Reporting", desc: "Real-time dashboards with actionable insights. Know exactly where your music is performing and where to push harder." },
];

const Distribution = () => {
  const [activeService, setActiveService] = useState(0);
  const [activeArtist, setActiveArtist] = useState(0);

  return (
    <div>
      {/* Hero Statement */}
      <section className="bg-primary text-primary-foreground pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="container-content max-w-4xl">
          <ScrollReveal y={80}>
            <h1 className="text-5xl md:text-8xl lg:text-9xl text-heading mb-8">We Move Music.</h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-base md:text-lg leading-relaxed opacity-70 max-w-2xl">
              PMG is the independent distribution and content arm for artists who are building something real.
              We bring passionate people and industry expertise to independent artists doing the work.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Artist Showcase */}
      <section className="section-padding bg-background border-t border-border">
        <div className="container-content">
          <ScrollReveal>
            <h2 className="text-3xl md:text-5xl text-heading mb-12">Listen Up</h2>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="flex flex-col md:flex-row gap-8">
            {/* Artist Names */}
            <div className="md:w-48 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {artists.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setActiveArtist(i)}
                  className={`text-left text-sm tracking-[0.15em] uppercase font-bold whitespace-nowrap px-3 py-2 transition-all ${
                    i === activeArtist ? "bg-primary text-primary-foreground" : "opacity-40 hover:opacity-100"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
            {/* Artist Card */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/2 aspect-square hover-zoom">
                  <img
                    src={artists[activeArtist].image}
                    alt={artists[activeArtist].name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={800}
                    height={800}
                  />
                </div>
                <div className="md:w-1/2 flex flex-col justify-center">
                  <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">{artists[activeArtist].genre}</p>
                  <h3 className="text-3xl md:text-4xl font-black uppercase">{artists[activeArtist].name}</h3>
                  <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                    One of PMG's cornerstone artists, {artists[activeArtist].name} embodies what it means to be 100% independent. Stream the latest project now.
                  </p>
                  <button className="mt-6 self-start border border-foreground px-6 py-3 text-xs tracking-[0.2em] uppercase font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                    Listen Now
                  </button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container-content">
          <ScrollReveal>
            <h2 className="text-3xl md:text-5xl text-heading mb-12">What We Do</h2>
          </ScrollReveal>
          <div className="flex flex-wrap gap-2 mb-8">
            {services.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveService(i)}
                className={`text-xs tracking-[0.15em] uppercase font-bold px-5 py-3 border transition-colors ${
                  i === activeService
                    ? "bg-primary-foreground text-primary border-primary-foreground"
                    : "border-primary-foreground/30 hover:border-primary-foreground"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <p className="text-lg leading-relaxed opacity-80 max-w-2xl">
            {services[activeService].desc}
          </p>
        </div>
      </section>

      {/* Tools */}
      <section className="section-padding bg-background border-t border-border">
        <div className="container-content">
          <ScrollReveal>
            <h2 className="text-3xl md:text-5xl text-heading mb-8">Tools & Insights</h2>
            <p className="text-muted-foreground max-w-2xl mb-8 leading-relaxed">
              PMG provides artists with real-time analytics dashboards, transparent reporting, and proprietary tools
              to track performance across every platform. Know your numbers. Own your data.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <div className="aspect-video bg-secondary border border-border flex items-center justify-center mb-8">
              <span className="text-muted-foreground text-sm uppercase tracking-wider">Dashboard Preview</span>
            </div>
            <button className="border border-foreground px-8 py-3 text-xs tracking-[0.2em] uppercase font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
              Partner Login
            </button>
          </ScrollReveal>
        </div>
      </section>

      {/* Inquiry Form */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container-content max-w-2xl">
          <ScrollReveal>
            <h2 className="text-3xl md:text-5xl text-heading mb-10">Let's Talk</h2>
          </ScrollReveal>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="Name"
              className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors"
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors"
            />
            <input
              type="text"
              placeholder="Company / Artist Name"
              className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors"
            />
            <select className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors">
              <option value="" className="bg-primary">Company Type</option>
              <option value="label" className="bg-primary">Label</option>
              <option value="artist" className="bg-primary">Artist</option>
              <option value="manager" className="bg-primary">Manager</option>
              <option value="catalog" className="bg-primary">Catalog</option>
              <option value="other" className="bg-primary">Other</option>
            </select>
            <select className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors">
              <option value="" className="bg-primary">Genre</option>
              <option value="hiphop" className="bg-primary">Hip-Hop</option>
              <option value="rnb" className="bg-primary">R&B</option>
              <option value="pop" className="bg-primary">Pop</option>
              <option value="other" className="bg-primary">Other</option>
            </select>
            <textarea
              placeholder="Message / Background"
              rows={4}
              className="w-full bg-transparent border-b border-primary-foreground/30 py-3 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground outline-none transition-colors resize-none"
            />
            <button
              type="submit"
              className="bg-primary-foreground text-primary px-10 py-4 text-xs tracking-[0.2em] uppercase font-bold hover:opacity-80 transition-opacity"
            >
              Submit
            </button>
          </form>
          <p className="mt-8 text-xs opacity-40">info@propmyganda.com</p>
        </div>
      </section>

      <Marquee />
    </div>
  );
};

export default Distribution;
