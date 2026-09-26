import { useEffect, useRef, useState } from "react";

import reel1 from "@/assets/reels/reel-1.mp4.asset.json";
import reel2 from "@/assets/reels/reel-2.mp4.asset.json";
import reel3 from "@/assets/reels/reel-3.mp4.asset.json";
import reel4 from "@/assets/reels/reel-4.mp4.asset.json";
import reel5 from "@/assets/reels/reel-5.mp4.asset.json";
import reel6 from "@/assets/reels/reel-6.mp4.asset.json";
import poster1 from "@/assets/reels/reel-1.jpg.asset.json";
import poster2 from "@/assets/reels/reel-2.jpg.asset.json";
import poster3 from "@/assets/reels/reel-3.jpg.asset.json";
import poster4 from "@/assets/reels/reel-4.jpg.asset.json";
import poster5 from "@/assets/reels/reel-5.jpg.asset.json";
import poster6 from "@/assets/reels/reel-6.jpg.asset.json";

export const REELS = [
  { cat: "PMG-V-001", src: reel1.url, poster: poster1.url },
  { cat: "PMG-V-002", src: reel2.url, poster: poster2.url },
  { cat: "PMG-V-003", src: reel3.url, poster: poster3.url },
  { cat: "PMG-V-004", src: reel4.url, poster: poster4.url },
  { cat: "PMG-V-005", src: reel5.url, poster: poster5.url },
  { cat: "PMG-V-006", src: reel6.url, poster: poster6.url },
];

export default function ReelCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const index = Number(video.dataset.index);
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            setActive(index);
            video.play().catch(() => undefined);
          } else {
            video.pause();
          }
        });
      },
      { threshold: [0, 0.6, 1] },
    );
    videoRefs.current.forEach((v) => v && observer.observe(v));
    return () => observer.disconnect();
  }, []);

  function scrollTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  return (
    <section className="border-b border-foreground/10 bg-background py-8">
      <div className="container-content mb-4 flex items-end justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Visuals · {REELS[active].cat}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {String(active + 1).padStart(2, "0")} / {String(REELS.length).padStart(2, "0")}
        </p>
      </div>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-3 md:px-10"
      >
        {REELS.map((reel, i) => (
          <div
            key={reel.cat}
            className="relative w-[78vw] max-w-[320px] flex-shrink-0 snap-center border border-foreground/15 bg-black"
          >
            <video
              ref={(el) => {
                videoRefs.current[i] = el;
              }}
              data-index={i}
              src={reel.src}
              poster={reel.poster}
              className="aspect-[9/16] h-full w-full object-cover"
              muted
              loop
              playsInline
              preload="metadata"
              controls
            />
            <span className="absolute left-0 top-0 bg-electric px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-electric-foreground">
              {reel.cat}
            </span>
          </div>
        ))}
      </div>

      <div className="container-content mt-3 flex gap-1.5">
        {REELS.map((reel, i) => (
          <button
            key={reel.cat}
            onClick={() => scrollTo(i)}
            aria-label={`Go to video ${i + 1}`}
            className={`h-1 flex-1 transition-colors duration-200 ${
              i === active ? "bg-electric" : "bg-foreground/20"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
