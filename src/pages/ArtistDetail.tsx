import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { artists, products } from "@/lib/data";
import SEO from "@/components/SEO";

type ArtistExtended = typeof artists[0] & {
  bio?: string;
  spotifyTrackId?: string;
  spotifyArtistId?: string;
  spotifyAlbumId?: string;
  albumCover?: string;
};

const SpotifyArtistEmbed = ({ id }: { id: string }) => (
  <iframe
    data-testid="embed-iframe"
    style={{ borderRadius: "12px" }}
    src={`https://open.spotify.com/embed/artist/${id}?utm_source=generator`}
    width="100%"
    height="352"
    frameBorder="0"
    allowFullScreen
    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    loading="lazy"
  />
);

const SpotifyTrackEmbed = ({ id }: { id: string }) => (
  <iframe
    data-testid="embed-iframe"
    style={{ borderRadius: "12px" }}
    src={`https://open.spotify.com/embed/track/${id}?utm_source=generator`}
    width="100%"
    height="352"
    frameBorder="0"
    allowFullScreen
    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    loading="lazy"
  />
);

function SpotifyArtistPage({ artist }: { artist: ArtistExtended }) {
  const [tab, setTab] = useState<"about" | "music">("about");

  const tabs = [
    { key: "about" as const, label: "About" },
    { key: "music" as const, label: "Music" },
  ];

  return (
    <>
      {/* Tab nav */}
      <div className="border-b border-white/10 bg-primary">
        <div className="container-content">
          <div className="flex gap-0">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-6 py-4 text-xs tracking-[0.3em] uppercase font-bold transition-colors border-b-2 ${
                  tab === t.key
                    ? "border-electric text-electric"
                    : "border-transparent text-primary-foreground/40 hover:text-primary-foreground"
                }`}
              >
                {t.label}
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
              <div className="space-y-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
                    PMG · {artist.genre}
                  </p>
                  <h2 className="font-display text-5xl md:text-7xl uppercase leading-none mb-8">
                    {artist.name}
                  </h2>
                  <div className="border-l-2 border-electric pl-6">
                    <p className="text-foreground/80 leading-relaxed text-base">
                      {artist.bio}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setTab("music")}
                  className="flex items-center gap-3 text-xs tracking-[0.2em] uppercase font-bold text-electric hover:gap-5 transition-all group"
                >
                  <span>Listen Now</span>
                  <span className="text-lg leading-none">→</span>
                </button>
              </div>

              {/* Spotify artist embed */}
              {artist.spotifyArtistId && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                    On Spotify
                  </p>
                  <SpotifyArtistEmbed id={artist.spotifyArtistId} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Music tab */}
      {tab === "music" && (
        <section className="section-padding bg-primary text-primary-foreground">
          <div className="container-content max-w-2xl">
            <div className="space-y-3 mb-10">
              <p className="text-[10px] uppercase tracking-[0.4em] text-primary-foreground/40">
                PMG · Latest Release
              </p>
              <h2 className="font-display text-4xl md:text-6xl uppercase leading-none">
                Now Playing
              </h2>
            </div>

            {artist.spotifyTrackId && (
              <SpotifyTrackEmbed id={artist.spotifyTrackId} />
            )}

            {artist.spotifyAlbumId && !artist.spotifyTrackId && (
              <iframe
                style={{ borderRadius: "12px" }}
                src={`https://open.spotify.com/embed/album/${artist.spotifyAlbumId}?utm_source=generator`}
                width="100%"
                height="352"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
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
    </>
  );
}

const ArtistDetail = () => {
  const { id } = useParams();
  const artist = artists.find((a) => a.id === id) as ArtistExtended | undefined;

  if (!artist) {
    return (
      <div className="min-h-screen bg-primary text-primary-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold uppercase mb-4">Artist Not Found</h1>
          <Link to="/artists" className="text-xs tracking-[0.2em] uppercase border-b border-primary-foreground pb-1">
            Back to Artists
          </Link>
        </div>
      </div>
    );
  }

  const relatedProducts = products.filter((p) => p.artist === artist.name || p.artist === "PMG").slice(0, 3);
  const hasSpotify = !!(artist.spotifyArtistId || artist.spotifyTrackId);

  return (
    <div>
      <SEO
        title={`${artist.name} — ${artist.genre} | PMG`}
        description={`${artist.name} is a ${artist.genre} artist on the PMG roster. Listen, watch, and shop merch.`}
        path={`/artists/${artist.id}`}
        image={artist.image}
        type="article"
      />

      {/* Hero */}
      <div className="relative h-[70vh] bg-primary">
        <img
          src={artist.image}
          alt={`${artist.name} — PMG artist portrait`}
          className="absolute inset-0 w-full h-full object-cover"
          width={800}
          height={800}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="container-content">
            <p className="text-primary-foreground text-xs tracking-[0.3em] uppercase mb-2 opacity-50">
              {artist.genre}
            </p>
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tight text-primary-foreground">
              {artist.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Tabbed section (Spotify artists) or standard layout */}
      {hasSpotify ? (
        <SpotifyArtistPage artist={artist} />
      ) : (
        <section className="section-padding bg-background">
          <div className="container-content max-w-3xl">
            <h2 className="text-2xl font-bold uppercase tracking-wider mb-6">About</h2>
            <p className="text-muted-foreground leading-relaxed">
              {artist.bio ?? `${artist.name} is one of the most compelling voices in independent music. Signed to PMG, ${artist.name} continues to push boundaries with raw lyricism and authentic storytelling.`}
            </p>
            {artist.spotifyAlbumId && (
              <div className="mt-10">
                <iframe
                  style={{ borderRadius: "12px" }}
                  src={`https://open.spotify.com/embed/album/${artist.spotifyAlbumId}?utm_source=generator`}
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Related Merch */}
      {relatedProducts.length > 0 && (
        <section className="section-padding bg-secondary border-t border-border">
          <div className="container-content">
            <h2 className="text-2xl font-bold uppercase tracking-wider mb-10">Merch</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedProducts.map((product) => (
                <Link to="/store" key={product.id} className="group">
                  <div className="aspect-square bg-background hover-zoom">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      width={800}
                      height={800}
                    />
                  </div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">{product.artist}</p>
                  <p className="text-sm font-bold uppercase mt-1">{product.name}</p>
                  <p className="text-sm mt-1">${product.price}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ArtistDetail;
