interface Post {
  id: string;
  instagram_url: string;
  label: string | null;
  /** CSS aspect-ratio of the post's picture, e.g. "4 / 5" or "3 / 4". Defaults to 4 / 5. */
  aspect?: string;
}

interface Props {
  posts: Post[];
  loading?: boolean;
  /** Max number of posts to render (default: all). */
  limit?: number;
  /** Tailwind grid-cols class — defaults to 3 columns on desktop. */
  cols?: string;
}

/** Fixed header (avatar + username) height inside Instagram's embed page. */
const IG_EMBED_HEADER = 54;

function getCleanUrl(url: string) {
  return url.split("?")[0].replace(/\/$/, "");
}

/**
 * Shows ONLY the post's picture: Instagram's embed iframe is cropped to hide
 * the header above and the caption below the photo.
 */
export default function InstagramFeed({
  posts,
  loading,
  limit,
  cols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
}: Props) {
  const visible = limit ? posts.slice(0, limit) : posts;

  if (loading) {
    return (
      <div className={`grid ${cols} gap-4`}>
        {Array.from({ length: limit ?? 6 }).map((_, i) => (
          <div key={i} className="bg-secondary animate-pulse aspect-[4/5]" />
        ))}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="border border-border p-16 text-center max-w-lg">
        <p className="text-muted-foreground text-sm uppercase tracking-widest">Event flyers coming soon</p>
      </div>
    );
  }

  return (
    <div className={`grid ${cols} gap-4`}>
      {visible.map((post) => (
        <a
          key={post.id}
          href={getCleanUrl(post.instagram_url)} target="_blank" rel="noopener noreferrer"
          className="relative block w-full overflow-hidden border border-border hover:border-electric transition-colors"
          style={{ aspectRatio: post.aspect ?? "4 / 5" }}
        >
          <iframe
            src={`${getCleanUrl(post.instagram_url)}/embed/`}
            title={post.label ?? "Instagram post"}
            className="absolute left-0 w-full border-0 pointer-events-none"
            style={{ top: -IG_EMBED_HEADER, height: `calc(100% + ${IG_EMBED_HEADER + 2}px)` }}
            scrolling="no"
            loading="lazy"
            tabIndex={-1}
          />
        </a>
      ))}
    </div>
  );
}
