import { useEffect, useState } from "react";
import { Instagram, Youtube } from "lucide-react";

const TikTokIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.93a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z" />
  </svg>
);

const links = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/propmyganda_?igsh=OWM5dzBqbjJzNjRn&utm_source=qr",
    Icon: Instagram,
    handle: "@propmyganda_",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@propmyganda?_r=1&_t=ZP-95cOtZhhM8V",
    Icon: TikTokIcon,
    handle: "@propmyganda",
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@propmyganda?si=RpjUBlcJsaxcbKyX",
    Icon: Youtube,
    handle: "@propmyganda",
  },
];

const SocialDock = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`fixed right-3 md:right-6 bottom-24 md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-40 transition-all duration-1000 ${
        mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      }`}
      aria-label="Social links"
    >
      {/* vertical label */}
      <div className="hidden md:flex flex-col items-center mb-4">
        <span className="text-[9px] tracking-[0.4em] uppercase text-white/40 [writing-mode:vertical-rl] rotate-180">
          Connect
        </span>
        <span className="block w-px h-8 bg-gradient-to-b from-white/40 to-transparent mt-2" />
      </div>

      <ul className="flex flex-col gap-3 md:gap-4">
        {links.map(({ label, href, Icon, handle }, i) => (
          <li
            key={label}
            className="group relative"
            style={{
              animation: mounted
                ? `fade-in 0.6s ease-out ${i * 0.12}s both`
                : undefined,
            }}
          >
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} — ${handle}`}
              className="relative flex items-center justify-center w-11 h-11 md:w-12 md:h-12 border border-white/20 bg-black/40 backdrop-blur-md text-white/80 hover:text-black hover:bg-white hover:border-white transition-all duration-500 overflow-hidden"
            >
              {/* scanline glow */}
              <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <span className="absolute inset-x-0 top-0 h-px bg-white/80" />
                <span className="absolute inset-x-0 bottom-0 h-px bg-white/80" />
              </span>
              {/* corner ticks */}
              <span className="pointer-events-none absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/60" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/60" />
              <Icon size={16} />
            </a>

            {/* floating handle tag on hover (desktop) */}
            <span className="hidden md:block pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2 py-1 bg-white text-black text-[9px] tracking-[0.3em] uppercase whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              {handle}
            </span>
          </li>
        ))}
      </ul>

      {/* pulse line below */}
      <div className="hidden md:flex flex-col items-center mt-4">
        <span className="block w-px h-8 bg-gradient-to-t from-white/40 to-transparent mb-2" />
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
        </span>
      </div>
    </div>
  );
};

export default SocialDock;
