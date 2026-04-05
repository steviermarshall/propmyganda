const Marquee = () => {
  const text = "100% INDEPENDENT • CONTENT • DISTRIBUTION • CULTURE • ";
  const repeated = text.repeat(8);

  return (
    <div className="bg-primary text-primary-foreground py-4 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap">
        <span className="text-sm md:text-base font-bold tracking-[0.3em] uppercase">
          {repeated}
        </span>
      </div>
    </div>
  );
};

export default Marquee;
