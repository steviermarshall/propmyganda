import { motion } from "framer-motion";
import { Suspense, lazy } from "react";

const PropworldScene = lazy(() => import("@/components/propworld/PropworldScene"));

const realms = [
  {
    title: "The Sound",
    desc: "Sonic identity of the Propworld universe — frequencies, rituals, releases.",
    glyph: "◐",
  },
  {
    title: "The Visuals",
    desc: "Worldbuilding through art, film, and design that bends reality.",
    glyph: "◈",
  },
  {
    title: "The Culture",
    desc: "Community, rituals, and the people who live inside the world.",
    glyph: "◆",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.4 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const Propworld = () => {
  return (
    <main className="relative min-h-screen bg-[#03030a] text-foreground overflow-hidden">
      {/* 3D Scene background */}
      <div className="fixed inset-0 z-0">
        <Suspense fallback={<div className="w-full h-full bg-[#03030a]" />}>
          <PropworldScene />
        </Suspense>
      </div>

      {/* Gradient veil for legibility */}
      <div className="pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-[#03030a]/80 via-transparent to-[#03030a]/90" />

      {/* Overlay UI */}
      <div className="relative z-20">
        <section className="container-content min-h-screen flex flex-col justify-center pt-24 pb-20">
          <motion.div
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="max-w-3xl"
          >
            <motion.p
              variants={itemVariants}
              className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-[#00f0ff] mb-6"
            >
              Enter the universe
            </motion.p>

            <motion.h1
              variants={itemVariants}
              className="text-6xl md:text-8xl lg:text-9xl font-bold uppercase tracking-tight text-white leading-[0.9]"
            >
              Prop
              <span className="block bg-gradient-to-r from-[#00f0ff] via-white to-[#ff00aa] bg-clip-text text-transparent">
                world
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-8 max-w-xl text-base md:text-lg text-white/70 leading-relaxed"
            >
              A living world built by PMG — culture, sound, and story converging
              into one immersive experience. Drag, orbit, and step inside.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-10 flex items-center gap-4">
              <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-white/50">
                <span className="w-8 h-px bg-[#00f0ff]" />
                Drag to orbit
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Realms grid */}
        <section className="container-content pb-32">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {realms.map((realm) => (
              <motion.article
                key={realm.title}
                variants={itemVariants}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="group relative border border-white/10 bg-white/[0.03] backdrop-blur-md p-8 overflow-hidden"
              >
                <div className="text-3xl text-[#00f0ff] mb-5 opacity-80 group-hover:opacity-100 transition-opacity">
                  {realm.glyph}
                </div>
                <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-3">
                  {realm.title}
                </h2>
                <p className="text-sm text-white/60 leading-relaxed">{realm.desc}</p>

                {/* Hover beam */}
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center" />
              </motion.article>
            ))}
          </motion.div>
        </section>
      </div>
    </main>
  );
};

export default Propworld;
