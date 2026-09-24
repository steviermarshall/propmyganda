import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { JOIN_URL, SPOTIFY_ARTIST_EMBED, pmgLogo, releases, socialLinks, videos } from "@/lib/exclusiveData";

const reveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

/** Amber tree: the creative, in-world version of the PMG Exclusive link hub. */
export default function RoomExclusive({ onExit }: { onExit: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scroller });
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -160]);
  const logoRot = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const glowScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.6]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onExit(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onExit]);

  const ticker = releases.map((r) => `${r.title} — ${r.artist}`).join("  ✦  ");

  return (
    <div ref={scroller} className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-[#0e0804] text-amber-50">
      {/* ember grain backdrop */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(#ffb13b 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

      <button
        onClick={onExit}
        className="fixed left-4 top-20 z-20 border border-amber-300/40 bg-black/50 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-amber-100 backdrop-blur transition-colors hover:bg-amber-300/15"
      >
        ← Propworld
      </button>

      {/* HERO */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 text-center">
        <motion.div style={{ scale: glowScale }} className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/25 blur-[120px]" />
        <motion.img
          src={pmgLogo}
          alt="PROPMYGANDA"
          style={{ rotate: logoRot }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-28 drop-shadow-[0_0_30px_rgba(255,177,59,0.6)] md:w-36"
        />
        <motion.div style={{ y: heroY }} className="relative">
          <p className="mt-8 text-[10px] uppercase tracking-[0.5em] text-amber-300/70">Amber Tree · The Room</p>
          <motion.h1
            initial={{ opacity: 0, y: 60, letterSpacing: "0.3em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0em" }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 font-display text-[clamp(3.5rem,13vw,11rem)] uppercase leading-[0.85] text-amber-100 drop-shadow-[0_0_40px_rgba(255,140,30,0.45)]"
          >
            PMG<br />Exclusive
          </motion.h1>
          <p className="mx-auto mt-6 max-w-lg text-base text-amber-100/65">A new artist every few days. Four drops out now — step inside and press play.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {socialLinks.map(({ label, href, Icon }, i) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                whileHover={{ y: -4, rotate: -6 }}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/30 text-amber-200 transition-colors hover:bg-amber-300 hover:text-[#0e0804]"
              >
                <Icon className="h-5 w-5" />
              </motion.a>
            ))}
          </div>
        </motion.div>
        <p className="absolute bottom-8 animate-bounce text-[10px] uppercase tracking-[0.4em] text-amber-200/50">Scroll into the room ↓</p>
      </section>

      {/* TICKER */}
      <div className="relative -rotate-2 overflow-hidden border-y border-amber-300/30 bg-amber-400 py-3 text-[#0e0804]">
        <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ duration: 24, ease: "linear", repeat: Infinity }} className="flex w-max whitespace-nowrap font-display text-2xl uppercase">
          <span className="px-4">{ticker}  ✦  {ticker}  ✦  </span>
          <span className="px-4">{ticker}  ✦  {ticker}  ✦  </span>
        </motion.div>
      </div>

      {/* DROPS — vinyl cards */}
      <section className="relative px-6 py-24 md:px-12">
        <motion.div {...reveal} viewport={{ once: true, root: scroller }}>
          <p className="text-[10px] uppercase tracking-[0.4em] text-amber-300/70">Out now</p>
          <h2 className="mt-2 font-display text-6xl uppercase md:text-8xl">The drops</h2>
        </motion.div>
        <div className="mt-14 grid gap-14 sm:grid-cols-2 lg:grid-cols-4">
          {releases.map((r, i) => (
            <motion.article key={r.title} {...reveal} transition={{ ...reveal.transition, delay: i * 0.1 }} viewport={{ once: true, root: scroller }} className="group">
              <a href={r.links.Spotify} target="_blank" rel="noopener noreferrer" className="relative block aspect-square">
                <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle,#2a1a0c_18%,#0a0604_19%,#1a1008_40%,#0a0604_41%,#150c06_70%,#050302_71%)] shadow-2xl transition-transform duration-700 group-hover:translate-x-[28%] group-hover:rotate-[200deg]" />
                <img src={r.cover} alt={`${r.title} cover artwork`} className="relative z-10 aspect-square w-full rounded-md object-cover shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:-rotate-3" />
              </a>
              <p className="mt-5 text-[9px] uppercase tracking-[0.3em] text-amber-400">{r.date}</p>
              <h3 className="mt-1 font-display text-4xl uppercase leading-none">{r.title}</h3>
              <p className="mt-1 text-sm text-amber-100/55">with {r.artist}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {Object.entries(r.links).map(([service, href]) => (
                  <a key={service} href={href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-amber-300/25 px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-amber-100/70 transition-colors hover:border-amber-300 hover:bg-amber-300 hover:text-[#0e0804]">
                    {service}
                  </a>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ON CAMERA — tape frames */}
      <section className="relative border-t border-amber-300/15 px-6 py-24 md:px-12">
        <motion.div {...reveal} viewport={{ once: true, root: scroller }}>
          <p className="text-[10px] uppercase tracking-[0.4em] text-amber-300/70">Performances · Sessions · Interviews</p>
          <h2 className="mt-2 font-display text-6xl uppercase md:text-8xl">On camera</h2>
        </motion.div>
        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {videos.map((v, i) => (
            <motion.article key={v.id} {...reveal} transition={{ ...reveal.transition, delay: i * 0.12 }} viewport={{ once: true, root: scroller }} className={i % 2 ? "lg:translate-y-10" : ""}>
              <div className="relative rounded-sm bg-amber-100/5 p-2 ring-1 ring-amber-300/20">
                <span className="absolute -top-3 left-6 h-6 w-20 rotate-[-4deg] bg-amber-200/70" />
                <div className="aspect-video overflow-hidden bg-black">
                  <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${v.id}`} title={v.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              </div>
              <h3 className="mt-4 font-display text-2xl uppercase">{v.title}</h3>
            </motion.article>
          ))}
        </div>
      </section>

      {/* LISTEN */}
      <section className="relative border-t border-amber-300/15 px-6 py-24 md:px-12">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <motion.h2 {...reveal} viewport={{ once: true, root: scroller }} className="font-display text-6xl uppercase leading-[0.85] md:text-8xl">Hear<br />it all</motion.h2>
          <iframe className="h-[352px] w-full rounded-lg" src={SPOTIFY_ARTIST_EMBED} title="PROPMYGANDA on Spotify" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
        </div>
      </section>

      {/* JOIN */}
      <section className="relative overflow-hidden bg-amber-400 px-6 py-24 text-[#0e0804] md:px-12">
        <motion.div {...reveal} viewport={{ once: true, root: scroller }} className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] opacity-60">PMG Exclusive</p>
            <h2 className="mt-2 max-w-3xl font-display text-5xl uppercase leading-[0.9] md:text-8xl">Get every drop first</h2>
          </div>
          <a href={JOIN_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-14 items-center justify-center rounded-full bg-[#0e0804] px-9 text-[11px] uppercase tracking-[0.2em] text-amber-100 transition-transform hover:scale-105">
            Join the list
          </a>
        </motion.div>
      </section>

      <div className="px-6 py-10 text-center">
        <button onClick={onExit} className="text-[10px] uppercase tracking-[0.35em] text-amber-200/60 hover:text-amber-100">← Back to the forest</button>
      </div>
    </div>
  );
}
