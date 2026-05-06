interface Post {
  id: string;
  instagram_url: string;
  label: string | null;
}

interface Props {
  posts: Post[];
  loading?: boolean;
}

function getCleanUrl(url: string) {
  return url.split("?")[0].replace(/\/$/, "");
}

function getEmbedUrl(url: string) {
  return `${getCleanUrl(url)}/embed/`;
}

export default function InstagramFeed({ posts, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="border border-border p-16 text-center max-w-lg">
        <p className="text-muted-foreground text-sm uppercase tracking-widest">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {posts.map((post) => (
        <div key={post.id} className="group relative">
          {/* Square crop window over the embed. Instagram embed renders the photo
              first, so a square viewport hides the caption/UI below. */}
          <div className="relative aspect-square overflow-hidden bg-secondary border border-border">
            <iframe
              src={getEmbedUrl(post.instagram_url)}
              title={post.label ?? "Instagram post"}
              className="absolute left-1/2 -translate-x-1/2 border-0 pointer-events-none"
              style={{
                top: -54,           // hide the IG header bar
                width: "100%",
                height: "calc(100% + 220px)", // overflow caption section
              }}
              scrolling="no"
              loading="lazy"
              allowTransparency
            />
            <a
              href={getCleanUrl(post.instagram_url)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={post.label ?? "Open Instagram post"}
              className="absolute inset-0 flex items-center justify-center bg-foreground/0 hover:bg-foreground/40 transition-colors"
            >
              <span className="opacity-0 group-hover:opacity-100 text-background text-[9px] tracking-[0.3em] uppercase font-bold transition-opacity">
                View ↗
              </span>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
