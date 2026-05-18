import { useParams, Link } from "react-router-dom";
import { artists, products } from "@/lib/data";
import SEO from "@/components/SEO";

const ArtistDetail = () => {
  const { id } = useParams();
  const artist = artists.find((a) => a.id === id) as typeof artists[0] & {
    bio?: string;
    spotifyTrackId?: string;
    spotifyArtistId?: string;
    spotifyAlbumId?: string;
    albumCover?: string;
  };

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
        <img src={artist.image} alt={`${artist.name} — PMG artist portrait`} className="absolute inset-0 w-full h-full object-cover" width={800} height={800} />
        <div className="absolute inset-0 bg-primary/50" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="container-content">
            <p className="text-primary-foreground text-xs tracking-[0.3em] uppercase mb-2 opacity-70">{artist.genre}</p>
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tight text-primary-foreground">{artist.name}</h1>
          </div>
        </div>
      </div>

      {/* Artist info + PMG track player */}
      <section className="section-padding bg-background">
        <div className="container-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

            {/* Left: Spotify artist info embed */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Artist</p>
              {artist.spotifyArtistId ? (
                <iframe
                  src={`https://open.spotify.com/embed/artist/${artist.spotifyArtistId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="380"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="eager"
                />
              ) : (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold uppercase tracking-wider">About</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {artist.bio ?? `${artist.name} is one of the most compelling voices in independent hip-hop. Signed to PMG, ${artist.name} continues to push the boundaries of the genre.`}
                  </p>
                </div>
              )}
            </div>

            {/* Right: PMG track player */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Now Playing — PMG</p>
              {artist.spotifyTrackId ? (
                <iframe
                  src={`https://open.spotify.com/embed/track/${artist.spotifyTrackId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="380"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="eager"
                />
              ) : artist.spotifyAlbumId ? (
                <iframe
                  src={`https://open.spotify.com/embed/album/${artist.spotifyAlbumId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="380"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="eager"
                />
              ) : (
                <div className="aspect-square bg-secondary flex items-center justify-center">
                  <p className="text-muted-foreground text-xs uppercase tracking-widest">Music Coming Soon</p>
                </div>
              )}
              {artist.bio && !artist.spotifyArtistId && (
                <p className="text-muted-foreground leading-relaxed mt-6 text-sm">{artist.bio}</p>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Related Merch */}
      {relatedProducts.length > 0 && (
        <section className="section-padding bg-secondary border-t border-border">
          <div className="container-content">
            <h2 className="text-2xl font-bold uppercase tracking-wider mb-10">Merch</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedProducts.map((product) => (
                <Link to="/store" key={product.id} className="group">
                  <div className="aspect-square bg-background hover-zoom">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" width={800} height={800} />
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
