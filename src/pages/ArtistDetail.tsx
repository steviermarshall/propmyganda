import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { artistImage, productImage } from "@/lib/fallback-assets";

type Artist = Database["public"]["Tables"]["artists"]["Row"];
type Release = Database["public"]["Tables"]["releases"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

const ArtistDetail = () => {
  const { id: slug } = useParams();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [merch, setMerch] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      const { data: a } = await supabase
        .from("artists")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;

      if (!a) {
        setLoading(false);
        return;
      }

      setArtist(a as Artist);

      const [{ data: r }, { data: p }] = await Promise.all([
        supabase
          .from("releases")
          .select("*")
          .eq("artist_id", (a as Artist).id)
          .order("release_date", { ascending: false }),
        supabase
          .from("products")
          .select("*")
          .or(`artist.eq.${(a as Artist).name},artist.eq.PMG`)
          .eq("active", true)
          .limit(3),
      ]);

      if (cancelled) return;
      setReleases((r ?? []) as Release[]);
      setMerch((p ?? []) as Product[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-primary text-primary-foreground flex items-center justify-center">
        <p className="text-xs tracking-widest uppercase opacity-60">Loading…</p>
      </div>
    );
  }

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

  const hero = artistImage(artist.slug, artist.image_url);

  const streamingLinks: Array<{ name: string; url: string | null }> = [
    { name: "Spotify",     url: artist.spotify_url },
    { name: "Apple Music", url: artist.apple_music_url },
    { name: "YouTube",     url: artist.youtube_url },
    { name: "SoundCloud",  url: artist.soundcloud_url },
  ];
  const liveLinks = streamingLinks.filter((l) => !!l.url);

  return (
    <div>
      {/* Hero */}
      <div className="relative h-[70vh] bg-primary">
        <img src={hero} alt={artist.name} className="absolute inset-0 w-full h-full object-cover" width={800} height={800} />
        <div className="absolute inset-0 bg-primary/50" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="container-content">
            {artist.genre && (
              <p className="text-primary-foreground text-xs tracking-[0.3em] uppercase mb-2 opacity-70">{artist.genre}</p>
            )}
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tight text-primary-foreground">{artist.name}</h1>
          </div>
        </div>
      </div>

      {/* Bio */}
      <section className="section-padding bg-background">
        <div className="container-content max-w-3xl">
          <h2 className="text-2xl font-bold uppercase tracking-wider mb-6">About</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {artist.bio ??
              `${artist.name} is one of the voices defining PMG's sound — 100% independent, no compromise.`}
          </p>

          {/* Streaming Links */}
          {liveLinks.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-4">
              {liveLinks.map((l) => (
                <a
                  key={l.name}
                  href={l.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border border-foreground px-5 py-3 text-xs tracking-[0.15em] uppercase font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {l.name} <ExternalLink size={12} />
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Discography */}
      {releases.length > 0 && (
        <section className="section-padding bg-secondary border-t border-border">
          <div className="container-content">
            <h2 className="text-2xl font-bold uppercase tracking-wider mb-10">Discography</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {releases.map((r) => {
                const cover = r.cover_url || hero;
                const link = r.spotify_url || r.apple_music_url;
                const Wrapper: React.ElementType = link ? "a" : "div";
                const wrapperProps = link
                  ? { href: link, target: "_blank", rel: "noopener noreferrer" }
                  : {};
                return (
                  <Wrapper key={r.id} {...wrapperProps} className="group block">
                    <div className="aspect-square bg-primary/10 mb-3 hover-zoom">
                      <img src={cover} alt={r.title} className="w-full h-full object-cover" loading="lazy" width={800} height={800} />
                    </div>
                    <p className="text-sm font-bold uppercase truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {r.type}
                      {r.release_date && ` · ${new Date(r.release_date).getFullYear()}`}
                    </p>
                  </Wrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Related Merch */}
      {merch.length > 0 && (
        <section className="section-padding bg-background border-t border-border">
          <div className="container-content">
            <h2 className="text-2xl font-bold uppercase tracking-wider mb-10">Merch</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {merch.map((p) => (
                <Link to={`/store/${p.slug}`} key={p.id} className="group">
                  <div className="aspect-square bg-secondary hover-zoom">
                    <img
                      src={productImage(p.slug, p.image_url)}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      width={800}
                      height={800}
                    />
                  </div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">{p.artist}</p>
                  <p className="text-sm font-bold uppercase mt-1">{p.name}</p>
                  <p className="text-sm mt-1">${(p.price_cents / 100).toFixed(0)}</p>
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
