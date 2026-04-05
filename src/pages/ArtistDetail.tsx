import { useParams, Link } from "react-router-dom";
import { artists, products } from "@/lib/data";
import { ExternalLink } from "lucide-react";

const ArtistDetail = () => {
  const { id } = useParams();
  const artist = artists.find((a) => a.id === id);

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
      {/* Hero */}
      <div className="relative h-[70vh] bg-primary">
        <img src={artist.image} alt={artist.name} className="absolute inset-0 w-full h-full object-cover" width={800} height={800} />
        <div className="absolute inset-0 bg-primary/50" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="container-content">
            <p className="text-primary-foreground text-xs tracking-[0.3em] uppercase mb-2 opacity-70">{artist.genre}</p>
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tight text-primary-foreground">{artist.name}</h1>
          </div>
        </div>
      </div>

      {/* Bio */}
      <section className="section-padding bg-background">
        <div className="container-content max-w-3xl">
          <h2 className="text-2xl font-bold uppercase tracking-wider mb-6">About</h2>
          <p className="text-muted-foreground leading-relaxed">
            {artist.name} is one of the most compelling voices in independent hip-hop. Signed to PMG, {artist.name} continues
            to push the boundaries of the genre with raw lyricism and authentic storytelling rooted in the streets. With multiple
            projects under the PMG umbrella, {artist.name} represents the future of 100% independent music.
          </p>

          {/* Streaming Links */}
          <div className="mt-10 flex flex-wrap gap-4">
            {["Spotify", "Apple Music", "YouTube", "SoundCloud"].map((platform) => (
              <a
                key={platform}
                href="#"
                className="flex items-center gap-2 border border-foreground px-5 py-3 text-xs tracking-[0.15em] uppercase font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {platform} <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Discography */}
      <section className="section-padding bg-secondary border-t border-border">
        <div className="container-content">
          <h2 className="text-2xl font-bold uppercase tracking-wider mb-10">Discography</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-square bg-primary/10 mb-3 hover-zoom">
                  <img src={artist.image} alt="Album" className="w-full h-full object-cover grayscale" loading="lazy" width={800} height={800} />
                </div>
                <p className="text-sm font-bold uppercase">Project {i}</p>
                <p className="text-xs text-muted-foreground">202{i + 2}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Merch */}
      {relatedProducts.length > 0 && (
        <section className="section-padding bg-background border-t border-border">
          <div className="container-content">
            <h2 className="text-2xl font-bold uppercase tracking-wider mb-10">Merch</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedProducts.map((product) => (
                <Link to="/store" key={product.id} className="group">
                  <div className="aspect-square bg-secondary hover-zoom">
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
