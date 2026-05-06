interface Post {
  id: string;
  instagram_url: string;
  label: string | null;
}

interface Props {
  posts: Post[];
  loading?: boolean;
}

function getEmbedUrl(url: string) {
  const [base, query] = url.split("?");
  const clean = base.replace(/\/$/, "");
  return query ? `${clean}/embed/captioned/?${query}` : `${clean}/embed/captioned/`;
}

function InstagramPost({ url }: { url: string }) {
  return (
    <iframe
      src={getEmbedUrl(url)}
      className="w-full border-0 block"
      style={{ minHeight: 560 }}
      scrolling="no"
      allowTransparency
      loading="lazy"
      title="Instagram post"
    />
  );
}

export default function InstagramFeed({ posts, loading }: Props) {
  if (loading) {
    return (
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="break-inside-avoid bg-secondary animate-pulse" style={{ minHeight: 560 }} />
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
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
      {posts.map((post) => (
        <div key={post.id} className="break-inside-avoid">
          {post.label && (
            <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-2 px-1">
              {post.label}
            </p>
          )}
          <InstagramPost url={post.instagram_url} />
        </div>
      ))}
    </div>
  );
}
