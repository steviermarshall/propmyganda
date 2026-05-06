interface Post {
  id: string;
  instagram_url: string;
  label: string | null;
}

interface Props {
  posts: Post[];
  loading?: boolean;
  /** Max number of posts to render (default: all). */
  limit?: number;
  /** Tailwind grid-cols class — defaults to 3 columns on desktop. */
  cols?: string;
}

function getCleanUrl(url: string) {
  return url.split("?")[0].replace(/\/$/, "");
}

function getEmbedUrl(url: string) {
  return `${getCleanUrl(url)}/embed/`;
}

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
          <div key={i} className="bg-secondary animate-pulse aspect-[1080/1350]" />
        ))}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="border border-border p-16 text-center max-w-lg">
        <p className="text-muted-foreground text-sm uppercase tracking-widest">No posts yet</p>
      </div>
    );
  }

  return (
    <div className={`grid ${cols} gap-4`}>
      {visible.map((post) => (
        <div
          key={post.id}
          className="relative w-full aspect-[1080/1350] overflow-hidden bg-secondary border border-border"
        >
          <iframe
            src={getEmbedUrl(post.instagram_url)}
            title={post.label ?? "Instagram post"}
            className="absolute left-0 w-full border-0"
            style={{ top: -54, height: "calc(100% + 160px)" }}
            scrolling="no"
            loading="lazy"
            allowTransparency
          />
        </div>
      ))}
    </div>
  );
}
