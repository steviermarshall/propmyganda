import { useState } from "react";
import { artists } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";
import SEO from "@/components/SEO";

const services = [
  { name: "Digital Distribution", desc: "We deliver your music to every major platform — Spotify, Apple Music, Amazon, Tidal, YouTube Music, and 150+ more. Global reach, zero compromise." },
  { name: "Content Strategy", desc: "From visual rollouts to social content calendars, we build campaigns that cut through the noise and connect with real listeners." },
  { name: "Marketing & Promo", desc: "Playlist pitching, PR campaigns, influencer seeding, and paid media — all handled in-house with a data-driven approach." },
  { name: "Sync Licensing", desc: "We place your music in film, TV, commercials, and games. Our sync team has relationships with every major network and studio." },
  { name: "Catalog Management", desc: "Full catalog administration including metadata optimization, rights management, and revenue tracking across all territories." },
  { name: "Analytics & Reporting", desc: "Real-time dashboards with actionable insights. Know exactly where your music is performing and where to push harder." },
];

const stats = [
  { value: "150+", label: "Platforms" },
  { value: "6", label: "Artists" },
  { value: "100M+", label: "Streams" },
  { value: "100%", label: "Independent" },
];

const Distribution = () => {
  const rosterArtists = artists.filter((a) => a.id === "chuckiee" || a.id === "mercy-porter");

  const [activeService, setActiveService] = useState(0);
  const [activeArtist, setActiveArtist] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    artist_name: "",
    contact_name: "",
    email: "",
    phone: "",
    genre: "",
    monthly_listeners: "",
    current_distributor: "",
    message: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.from("distribution_applications").insert([{
      artist_name:         form.artist_name,
      contact_name:        form.contact_name,
      email:               form.email,
      phone:               form.phone || null,
      genre:               form.genre || null,
      monthly_listeners:   form.monthly_listeners || null,
      current_distributor: form.current_distributor || null,
      message:             form.message || null,
    }] as never);
    if (err) setError("Something went wrong. Try again.");
    else setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div>
      <SEO
        title="Distribution — Independent Music Distribution | PMG"
        description="PMG delivers your music to Spotify, Apple Music, and 150+ DSPs. Marketing, sync, catalog management. Apply to work with PMG."
        path="/distribution"
      />
      {/* Hero */}
      <section className="bg-black text-white pt-32 pb-24 md:pt-44 md:pb-32 overflow-hidden relative">
        <div className="container-content relative z-10">
          <ScrollReveal y={80}>
            <p className="text-xs tracking-[0.4em] uppercase text-white/40 mb-6">Propmyganda · Distribution</p>
            <h1 className="font-display text-[14vw] md:text-[10vw] uppercase leading-none tracking-tight mb-0">
              We Move<br />
              <span className="text-electric">Music.</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.3}>
            <p className="text-base md:text-lg leading-relaxed text-white/60 max-w-xl mt-8">
              PMG is the independent distribution and content arm for artists building something real.
              We bring industry expertise to those doing the work.
            </p>
          </ScrollReveal>
        </div>
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </section>

      {/* Stats */}
      <section className="bg-electric">
        <div className="container-content py-8">
          <div className="grid grid-cols-4 divide-x divide-black/20">
            {stats.map((s) => (
              <div key={s.label} className="text-center px-4 py-2">
                <p className="font-display text-3xl md:text-5xl text-black leading-none">{s.value}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-black/60 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Artist Showcase */}
      <section className="section-padding bg-background border-t border-border">
        <div className="container-content">
          <ScrollReveal>
            <h2 className="font-display text-4xl md:text-6xl uppercase mb-12">The Roster</h2>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="flex flex-col md:flex-row gap-8">
            <div className="md:w-48 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {rosterArtists.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setActiveArtist(i)}
                  className={`text-left text-xs tracking-[0.15em] uppercase font-bold whitespace-nowrap px-3 py-2.5 border-l-2 transition-all ${
                    i === activeArtist
                      ? "border-electric text-foreground bg-electric/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
            <div className="flex-1">
              {(() => {
                const artist = rosterArtists[activeArtist] as typeof rosterArtists[0] & { bio?: string; albumCover?: string; spotifyAlbumId?: string };
                return (
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/2 flex-shrink-0 self-start aspect-square overflow-hidden bg-secondary">
                      <img
                        src={artist.albumCover ?? artist.image}
                        alt={artist.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                        width={800}
                        height={800}
                      />
                    </div>
                    <div className="md:w-1/2 flex flex-col justify-center gap-4">
                      <div>
                        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">{artist.genre}</p>
                        <h3 className="font-display text-4xl md:text-5xl uppercase leading-none">{artist.name}</h3>
                        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                          {artist.bio ?? `One of PMG's cornerstone artists. ${artist.name} embodies what it means to be 100% independent.`}
                        </p>
                      </div>
                      {artist.spotifyAlbumId ? (
                        <iframe
                          src={`https://open.spotify.com/embed/album/${artist.spotifyAlbumId}?utm_source=generator&theme=0`}
                          width="100%"
                          height="380"
                          frameBorder="0"
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="eager"
                        />
                      ) : (
                        <button className="self-start bg-black text-white px-6 py-3 text-xs tracking-[0.2em] uppercase font-bold hover:bg-electric hover:text-black transition-colors">
                          Listen Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding bg-black text-white">
        <div className="container-content">
          <ScrollReveal>
            <h2 className="font-display text-4xl md:text-6xl uppercase mb-12">What We Do</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-white/10">
            {services.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveService(i)}
                className={`text-left p-6 border-b border-r border-white/10 transition-colors ${
                  i === activeService ? "bg-electric" : "hover:bg-white/5"
                }`}
              >
                <p className={`text-xs tracking-[0.2em] uppercase font-bold mb-2 ${i === activeService ? "text-black" : "text-white/40"}`}>
                  0{i + 1}
                </p>
                <p className={`font-display text-xl uppercase ${i === activeService ? "text-black" : "text-white"}`}>
                  {s.name}
                </p>
                {i === activeService && (
                  <p className="text-black/70 text-sm mt-3 leading-relaxed">{s.desc}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="section-padding bg-background border-t border-border">
        <div className="container-content max-w-2xl">
          <ScrollReveal>
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">Apply</p>
            <h2 className="font-display text-4xl md:text-6xl uppercase mb-10">Work With PMG</h2>
          </ScrollReveal>

          {submitted ? (
            <ScrollReveal>
              <div className="border border-electric bg-electric/5 p-10 text-center space-y-4">
                <p className="font-display text-5xl uppercase text-electric">Received.</p>
                <p className="text-muted-foreground text-sm">We'll be in touch within 48 hours.</p>
              </div>
            </ScrollReveal>
          ) : (
            <ScrollReveal delay={0.1}>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="dist-artist-name" className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Artist Name *</label>
                    <input
                      id="dist-artist-name"
                      type="text"
                      required
                      value={form.artist_name}
                      onChange={(e) => set("artist_name", e.target.value)}
                      className="w-full bg-transparent border-b border-border py-3 text-sm focus:border-foreground outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="dist-contact-name" className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Contact Name *</label>
                    <input
                      id="dist-contact-name"
                      type="text"
                      required
                      value={form.contact_name}
                      onChange={(e) => set("contact_name", e.target.value)}
                      className="w-full bg-transparent border-b border-border py-3 text-sm focus:border-foreground outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="dist-email" className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Email *</label>
                    <input
                      id="dist-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className="w-full bg-transparent border-b border-border py-3 text-sm focus:border-foreground outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="dist-phone" className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Phone</label>
                    <input
                      id="dist-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      className="w-full bg-transparent border-b border-border py-3 text-sm focus:border-foreground outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="dist-genre" className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Genre</label>
                    <select
                      id="dist-genre"
                      value={form.genre}
                      onChange={(e) => set("genre", e.target.value)}
                      className="w-full bg-background border-b border-border py-3 text-sm focus:border-foreground outline-none transition-colors"
                    >
                      <option value="">Select genre</option>
                      <option value="Hip-Hop">Hip-Hop</option>
                      <option value="R&B">R&B</option>
                      <option value="Pop">Pop</option>
                      <option value="Afrobeats">Afrobeats</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dist-monthly" className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Monthly Listeners</label>
                    <select
                      id="dist-monthly"
                      value={form.monthly_listeners}
                      onChange={(e) => set("monthly_listeners", e.target.value)}
                      className="w-full bg-background border-b border-border py-3 text-sm focus:border-foreground outline-none transition-colors"
                    >
                      <option value="">Select range</option>
                      <option value="Under 10K">Under 10K</option>
                      <option value="10K–50K">10K–50K</option>
                      <option value="50K–250K">50K–250K</option>
                      <option value="250K–1M">250K–1M</option>
                      <option value="1M+">1M+</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="dist-current-distro" className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Current Distributor</label>
                  <input
                    id="dist-current-distro"
                    type="text"
                    value={form.current_distributor}
                    onChange={(e) => set("current_distributor", e.target.value)}
                    placeholder="DistroKid, TuneCore, etc."
                    className="w-full bg-transparent border-b border-border py-3 text-sm focus:border-foreground outline-none transition-colors placeholder:text-muted-foreground/50"
                  />
                </div>
                <div>
                  <label htmlFor="dist-message" className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Tell Us About Yourself</label>
                  <textarea
                    id="dist-message"
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    rows={4}
                    className="w-full bg-transparent border-b border-border py-3 text-sm focus:border-foreground outline-none transition-colors resize-none"
                  />
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-black text-white py-4 text-xs tracking-[0.2em] uppercase font-bold hover:bg-electric hover:text-black transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit Application"}
                </button>
              </form>
            </ScrollReveal>
          )}
        </div>
      </section>

      <Marquee />
    </div>
  );
};

export default Distribution;
