interface Post {
  id: string;
  instagram_url: string;
  label: string | null;
}

interface Props {
  posts: Post[];
  loading?: boolean;
}

function getShortcode(url: string) {
  const m = url.match(/\/(?:p|reel|tv)\/([^/?#]+)/);
  return m?.[1] ?? "";
}

function getThumbUrl(url: string) {
  const code = getShortcode(url);
  return code ? `https://www.instagram.com/p/${code}/media/?size=l` : "";
}

function getCleanUrl(url: string) {
  return url.split("?")[0];
}

export default function InstagramFeed({ posts, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
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
    <div className="grid grid-cols-3 gap-2 md:gap-3">
      {posts.map((post) => (
        <a
          key={post.id}
          href={getCleanUrl(post.instagram_url)}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block aspect-square overflow-hidden bg-secondary"
          aria-label={post.label ?? "Instagram post"}
        >
          <img
            src={getThumbUrl(post.instagram_url)}
            alt={post.label ?? "Instagram post"}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-background text-[9px] tracking-[0.3em] uppercase font-bold transition-opacity">
              View ↗
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
