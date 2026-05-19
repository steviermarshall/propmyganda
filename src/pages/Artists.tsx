import { useState } from "react";
import { artists } from "@/lib/data";
import SEO from "@/components/SEO";
import ScrollReveal from "@/components/webgl/ScrollReveal";

const zoe = artists.find((a) => a.id === "zoe") as typeof artists[0] & {
  bio?: string;
  spotifyArtistId?: string;
  spotifyTrackId?: string;
};

export default function Artists() {
  const [tab, setTab] = useState<"about" | "music">("about");

  return (
    <div>
      <SEO
        title="Artists — PMG Roster | PROPMYGANDA"
        description="Meet the PMG roster. Independent artists distributed worldwide."
        path="/artists"
        image={zoe?.image}
      />

      {/* Hero */}
      <div className="relative h-[70vh] bg-primary overflow-hidden">
        <img
          src={zoe?.image}
          alt="Zoe — PMG artist"
          className="absolute inset-0 w-full h-full object-cover"
          width={800}
          height={800}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="container-content">
            <ScrollReveal>
              <p className="text-primary-foreground text-xs tracking-[0.3em] uppercase mb-2 opacity-50">
                {zoe?.genre} · PMG
              </p>
              <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tight text-primary-foreground">
                {zoe?.name}
              </h1>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="border-b border-white/10 bg-primary sticky top-0 z-20">
        <div className="container-content">
          <div className="flex gap-0">
            {(["about", "music"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-4 text-xs tracking-[0.3em] uppercase font-bold transition-colors border-b-2 ${
                  tab === t
                    ? "border-electric text-electric"
                    : "border-transparent text-primary-foreground/40 hover:text-primary-foreground"
                }`}
              >
                {t === "about" ? "About" : "Music"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* About tab */}
      {tab === "about" && (
        <section className="section-padding bg-background">
          <div className="container-content">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

              {/* Bio */}
              <ScrollReveal>
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
                      PMG · {zoe?.genre}
                    </p>
                    <h2 className="font-display text-5xl md:text-7xl uppercase leading-none mb-8">
                      {zoe?.name}
                    </h2>
                    <div className="border-l-2 border-electric pl-6">
                      <p className="text-foreground/80 leading-relaxed text-base">
                        {zoe?.bio}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setTab("music")}
                    className="flex items-center gap-3 text-xs tracking-[0.2em] uppercase font-bold text-electric hover:gap-5 transition-all"
                  >
                    <span>Listen Now</span>
                    <span className="text-lg leading-none">→</span>
                  </button>
                </div>
              </ScrollReveal>

              {/* Spotify artist embed */}
              {zoe?.spotifyArtistId && (
                <ScrollReveal delay={0.15}>
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                      On Spotify
                    </p>
                    <iframe
                      data-testid="embed-iframe"
                      style={{ borderRadius: "12px" }}
                      src={`https://open.spotify.com/embed/artist/${zoe.spotifyArtistId}?utm_source=generator`}
                      width="100%"
                      height="352"
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                </ScrollReveal>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Music tab */}
      {tab === "music" && (
        <section className="section-padding bg-primary text-primary-foreground">
          <div className="container-content max-w-2xl">
            <ScrollReveal>
              <div className="space-y-3 mb-10">
                <p className="text-[10px] uppercase tracking-[0.4em] text-primary-foreground/40">
                  PMG · Latest Release
                </p>
                <h2 className="font-display text-4xl md:text-6xl uppercase leading-none">
                  Now Playing
                </h2>
              </div>
            </ScrollReveal>

            {zoe?.spotifyTrackId && (
              <ScrollReveal delay={0.1}>
                <iframe
                  data-testid="embed-iframe"
                  style={{ borderRadius: "12px" }}
                  src={`https://open.spotify.com/embed/track/${zoe.spotifyTrackId}?utm_source=generator`}
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </ScrollReveal>
            )}

            <button
              onClick={() => setTab("about")}
              className="mt-8 flex items-center gap-3 text-xs tracking-[0.2em] uppercase font-bold text-primary-foreground/40 hover:text-primary-foreground hover:gap-5 transition-all"
            >
              <span>←</span>
              <span>Back to About</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
