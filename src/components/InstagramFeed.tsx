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
          className="relative flex w-full aspect-[1080/1350] flex-col justify-end overflow-hidden bg-primary p-5 text-primary-foreground border border-border hover:border-electric"
        >
          <span className="font-mono text-[10px] uppercase text-electric">Nonstop New York · Archive</span>
          <span className="mt-2 font-display text-2xl uppercase">{post.label ?? "Event post"}</span>
          <span className="mt-4 font-mono text-[10px] uppercase">View on Instagram ↗</span>
        </a>
      ))}
    </div>
  );
}
