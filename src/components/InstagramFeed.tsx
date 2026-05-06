import { useEffect, useRef } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

function loadAndProcess() {
  const existing = document.getElementById("ig-embed-js");
  if (existing) {
    if (window.instgrm) {
      window.instgrm.Embeds.process();
    } else {
      existing.addEventListener("load", () => window.instgrm?.Embeds.process(), { once: true });
    }
    return;
  }
  const s = document.createElement("script");
  s.id = "ig-embed-js";
  s.src = "https://www.instagram.com/embed.js";
  s.async = true;
  s.addEventListener("load", () => window.instgrm?.Embeds.process(), { once: true });
  document.body.appendChild(s);
}

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
    loadAndProcess();
  }, [url]);

  return <div ref={ref} style={{ minHeight: 480 }} />;
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
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="break-inside-avoid bg-secondary animate-pulse" style={{ minHeight: 480 }} />
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
