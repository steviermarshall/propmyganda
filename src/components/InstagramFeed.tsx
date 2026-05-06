import { useEffect, useRef } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

// Load Instagram's embed script once per page
function loadEmbedScript() {
  if (document.getElementById("ig-embed-js")) return;
  const s = document.createElement("script");
  s.id = "ig-embed-js";
  s.src = "https://www.instagram.com/embed.js";
  s.async = true;
  s.defer = true;
  document.body.appendChild(s);
}

function waitAndProcess(attempts = 0) {
  if (window.instgrm) {
    window.instgrm.Embeds.process();
    return;
  }
  if (attempts < 20) setTimeout(() => waitAndProcess(attempts + 1), 300);
}

// Single post — uses innerHTML so React never reconciles Instagram's injected iframe
function InstagramPost({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = `
      <blockquote
        class="instagram-media"
        data-instgrm-permalink="${url}"
        data-instgrm-version="14"
        data-instgrm-captioned
        style="background:#FFF;border:0;border-radius:3px;
               box-shadow:0 0 1px 0 rgba(0,0,0,.5),0 1px 10px 0 rgba(0,0,0,.15);
               margin:0 auto;max-width:540px;min-width:326px;
               padding:0;width:calc(100% - 2px);"
      >
        <a href="${url}" target="_blank" rel="noopener noreferrer"
           style="display:block;padding:16px;font-size:14px;color:#999;">
          View on Instagram →
        </a>
      </blockquote>`;
    loadEmbedScript();
    waitAndProcess();
  }, [url]);

  return (
    <div
      ref={ref}
      className="instagram-post-wrapper"
      style={{ minHeight: 300 }}
    />
  );
}

interface Post {
  id: string;
  instagram_url: string;
  label: string | null;
}

interface Props {
  posts: Post[];
  loading?: boolean;
}

export default function InstagramFeed({ posts, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-secondary animate-pulse rounded-sm" style={{ minHeight: 480 }} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="border border-border p-16 text-center max-w-lg">
        <p className="text-muted-foreground text-sm uppercase tracking-widest">No posts yet</p>
        <p className="text-xs text-muted-foreground mt-2">
          Add Instagram post URLs in the Supabase dashboard under{" "}
          <code className="text-xs bg-secondary px-1">instagram_posts</code>
        </p>
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
