import { artists } from "@/lib/data";
import SEO from "@/components/SEO";
import ScrollReveal from "@/components/webgl/ScrollReveal";

const zoe = artists.find((a) => a.id === "zoe") as typeof artists[0] & {
  bio?: string;
  spotifyArtistId?: string;
  spotifyTrackId?: string;
};

export default function Artists() {
  return (
    <div className="bg-black text-white min-h-screen">
      <SEO
        title="Artists — PMG Roster | PROPMYGANDA"
        description="Meet the PMG roster. Independent artists distributed worldwide."
        path="/artists"
      />

      {/* Hero — no photo, typographic only */}
      <section className="pt-32 pb-16 border-b border-white/10 relative overflow-hidden">
        {/* Subtle background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="container-content relative z-10">
          <ScrollReveal>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-4">
              PMG · {zoe?.genre}
            </p>
            <h1 className="font-display text-[18vw] md:text-[12vw] uppercase leading-none tracking-tight">
              {zoe?.name}
            </h1>
          </ScrollReveal>
        </div>
      </section>

      {/* Bio */}
      <section className="section-padding border-b border-white/10">
        <div className="container-content max-w-2xl">
          <ScrollReveal>
            <div className="border-l-2 border-electric pl-6">
              <p className="text-white/70 leading-relaxed text-base">
                {zoe?.bio}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Both Spotify embeds side by side */}
      <section className="section-padding">
        <div className="container-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Artist embed */}
            {zoe?.spotifyArtistId && (
              <ScrollReveal delay={0}>
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-4">
                  Artist
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
              </ScrollReveal>
            )}

            {/* Track embed */}
            {zoe?.spotifyTrackId && (
              <ScrollReveal delay={0.1}>
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-4">
                  PMG · Latest Release
                </p>
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

          </div>
        </div>
      </section>
    </div>
  );
}
