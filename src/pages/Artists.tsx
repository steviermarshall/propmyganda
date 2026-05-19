import { useEffect, useRef } from "react";
import { artists } from "@/lib/data";
import SEO from "@/components/SEO";
import ScrollReveal from "@/components/webgl/ScrollReveal";

const zoe = artists.find((a) => a.id === "zoe") as typeof artists[0] & {
  bio?: string;
  spotifyArtistId?: string;
  spotifyTrackId?: string;
};

// Paste your reel URLs here (tap ••• → Copy Link on each reel)
const REEL_URLS: string[] = [
  "https://www.instagram.com/reel/DXwwAHiuWc5/",
  "https://www.instagram.com/reel/DN8r0-XDnF1/",
  "https://www.instagram.com/reel/DRfP-MLic1P/",
  "https://www.instagram.com/reel/DYZ8fcauiaw/",
  "https://www.instagram.com/reel/DWRy8FEiUCD/",
];

function InstagramReels() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!REEL_URLS.length) return;
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
    script.onload = () => {
      (window as any).instgrm?.Embeds?.process();
    };
    return () => { document.body.removeChild(script); };
  }, []);

  if (!REEL_URLS.length) return null;

  return (
    <section className="py-16 border-b border-white/10 overflow-hidden">
      <div className="container-content mb-6">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">
          PMG · @propmyganda_
        </p>
      </div>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto px-6 pb-4 scrollbar-hide"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {REEL_URLS.map((url, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[280px]"
            style={{ scrollSnapAlign: "start" }}
          >
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={url}
              data-instgrm-version="14"
              style={{
                background: "#000",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                margin: 0,
                maxWidth: "280px",
                minWidth: "280px",
                padding: 0,
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Artists() {
  return (
    <div className="bg-black text-white min-h-screen">
      <SEO
        title="Records — PMG Roster | PROPMYGANDA"
        description="PMG Records. Independent artists distributed worldwide."
        path="/artists"
      />

      {/* Hero */}
      <section className="pt-32 pb-16 border-b border-white/10 relative overflow-hidden">
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
              Records
            </h1>
          </ScrollReveal>
        </div>
      </section>

      {/* PMG content pitch + artist bio */}
      <section className="section-padding border-b border-white/10">
        <div className="container-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left: PMG pitch */}
            <ScrollReveal>
              <p className="text-[10px] uppercase tracking-[0.4em] text-electric mb-6">
                PMG Content Services
              </p>
              <h2 className="font-display text-4xl md:text-5xl uppercase leading-none mb-6">
                We Build<br />Artists.
              </h2>
              <p className="text-white/60 leading-relaxed mb-4">
                PMG handles everything from concept to camera to release — professional shoots, short-form content, music videos, and full visual campaigns built around your sound.
              </p>
              <p className="text-white/60 leading-relaxed mb-8">
                We've put artists in front of millions. If you're serious about your music, we're serious about your story.
              </p>
              <a
                href="https://docs.google.com/forms/d/1dXl9gqipbr_dqlHaEP4XLhOs1Q3ruVAPSST_khyfcPg/viewform"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 text-xs tracking-[0.2em] uppercase font-bold text-electric border border-electric px-6 py-3 hover:bg-electric hover:text-black transition-colors"
              >
                Work With PMG <span>→</span>
              </a>
            </ScrollReveal>

            {/* Right: artist bio */}
            {zoe?.bio && zoe.bio !== "Bio coming soon." && (
              <ScrollReveal delay={0.15}>
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-6">
                  {zoe.name} · {zoe.genre}
                </p>
                <div className="border-l-2 border-electric pl-6">
                  <p className="text-white/70 leading-relaxed">
                    {zoe.bio}
                  </p>
                </div>
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>

      {/* Instagram reels — shows once URLs are added */}
      <InstagramReels />

      {/* Both Spotify embeds */}
      <section className="section-padding">
        <div className="container-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

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
