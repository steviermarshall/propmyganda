const Propworld = () => {
  return (
    <main className="min-h-screen bg-background pt-24 md:pt-32 pb-20">
      <section className="container-content">
        <header className="mb-12 md:mb-16">
          <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-electric mb-4">
            Enter the universe
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tight text-foreground">
            Propworld
          </h1>
          <p className="mt-6 max-w-2xl text-base md:text-lg text-foreground/70">
            A living world built by PMG — culture, sound, and story converging into
            one immersive experience. Step inside.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "The Sound", desc: "Sonic identity of the Propworld universe." },
            { title: "The Visuals", desc: "Worldbuilding through art, film, and design." },
            { title: "The Culture", desc: "Community, rituals, and the people inside." },
          ].map((card) => (
            <article
              key={card.title}
              className="group relative border border-foreground/10 bg-foreground/[0.02] p-8 transition-all hover:border-electric hover:bg-foreground/[0.04]"
            >
              <h2 className="text-xl font-bold uppercase tracking-wider text-foreground mb-3">
                {card.title}
              </h2>
              <p className="text-sm text-foreground/60 leading-relaxed">{card.desc}</p>
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-electric to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Propworld;
