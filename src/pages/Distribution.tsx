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
  { value: "2", label: "Artists" },
  { value: "100M+", label: "Streams" },
  { value: "100%", label: "Independent" },
];

const CATALOGUE: Record<string, string> = {
  chuckiee: "PMG-D-001",
  "mercy-porter": "PMG-D-002",
};

const Distribution = () => {
  // Distribution clients only. Jahballa, Hammad, Stockz and Zoë moved to Records.
  const rosterArtists = artists.filter((a) => ["chuckiee", "mercy-porter"].includes(a.id));

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
      {/* Hero — condensed */}
      <section className="bg-black text-white px-6 md:px-10 pt-24 md:pt-32 pb-6 border-b border-white/10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          Propmyganda · Distribution
        </p>
        <h1 className="font-display text-[14vw] md:text-[9vw] uppercase leading-[0.85] tracking-[-0.03em]">
          We Move<br />
          <span className="text-electric">Music.</span>
        </h1>
        <p className="mt-3 max-w-md text-sm leading-snug text-white/60">
          Every major platform. Transparent splits. No middlemen. No payola · 0.00
        </p>
      </section>

      {/* Roster first — compact rows */}
      <section className="bg-black text-white px-6 md:px-10 py-8 border-b border-white/10">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          Distributed Artists
        </p>
        <ul className="border-t border-white/15">
          {rosterArtists.map((a, i) => {
            const artist = a as typeof a & {
              spotifyAlbumId?: string;
              spotifyTrackId?: string;
              spotifyArtistId?: string;
            };
            const link = artist.spotifyAlbumId
              ? `https://open.spotify.com/album/${artist.spotifyAlbumId}`
              : artist.spotifyTrackId
                ? `https://open.spotify.com/track/${artist.spotifyTrackId}`
                : artist.spotifyArtistId
                  ? `https://open.spotify.com/artist/${artist.spotifyArtistId}`
                  : null;
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 border-b border-white/15 py-3"
              >
                <button
                  onClick={() => setActiveArtist(i)}
                  className="flex min-w-0 items-baseline gap-3 text-left"
                >
                  <span className="font-mono text-[10px] tracking-[0.18em] text-electric">
                    {CATALOGUE[a.id] ?? "PMG-D-000"}
                  </span>
                  <span className="truncate font-display text-lg uppercase tracking-[-0.03em]">
                    {a.name}
                  </span>
                </button>
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50 hover:text-electric"
                  >
                    Listen →
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        {/* Selected artist — restore the full-size artwork/profile without changing the compact roster */}
        {(() => {
          const artist = rosterArtists[activeArtist] as (typeof rosterArtists)[0] & {
            bio?: string;
            spotifyAlbumId?: string;
            spotifyTrackId?: string;
            spotifyArtistId?: string;
          };
          if (!artist) return null;
          const embedSrc = artist.spotifyAlbumId
            ? `https://open.spotify.com/embed/album/${artist.spotifyAlbumId}?utm_source=generator&theme=0`
            : artist.spotifyTrackId
              ? `https://open.spotify.com/embed/track/${artist.spotifyTrackId}?utm_source=generator&theme=0`
              : artist.spotifyArtistId
                ? `https://open.spotify.com/embed/artist/${artist.spotifyArtistId}?utm_source=generator&theme=0`
                : null;
          return (
            <div className="mt-8 grid items-center gap-6 border-t border-white/15 pt-8 md:grid-cols-2 md:gap-10">
              <div className="aspect-square w-full max-w-[680px] overflow-hidden bg-secondary">
                <img src={artist.albumCover ?? artist.image} alt={`${artist.name} artwork`} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-electric">{CATALOGUE[artist.id] ?? ""} · {artist.genre}</p>
                <h2 className="mt-2 font-display text-4xl uppercase leading-none md:text-5xl">{artist.name}</h2>
                {artist.bio && <p className="mt-4 max-w-lg text-sm leading-relaxed text-primary-foreground/60">{artist.bio}</p>}
                {embedSrc && <div className="mt-6 border border-primary-foreground/15 p-2">
                  <iframe title={`${artist.name} on Spotify`} src={embedSrc} width="100%" height="352" className="block" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
                </div>}
              </div>
            </div>
          );
        })()}
      </section>

      {/* Stats */}
      <section className="bg-electric">
        <div className="container-content py-5">
          <div className="grid grid-cols-4 divide-x divide-black/20">
            {stats.map((s) => (
              <div key={s.label} className="text-center px-2">
                <p className="font-display text-2xl md:text-4xl text-black leading-none">{s.value}</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-black/60 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
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
