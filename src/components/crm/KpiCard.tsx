interface Props {
  label: string;
  value: string | number;
  target?: string;
  accent: string;
  hint?: string;
}

export default function KpiCard({ label, value, target, accent, hint }: Props) {
  return (
    <div className="border border-white/10 bg-crm-surface p-4 space-y-1">
      <div
        className="text-4xl md:text-5xl font-display leading-none"
        style={{ color: accent }}
      >
        {value}
      </div>
      <div className="text-[10px] text-white/60 uppercase tracking-widest pt-1">{label}</div>
      {target && <div className="text-[9px] text-white/30">{target}</div>}
      {hint && <div className="text-[9px] text-white/30">{hint}</div>}
    </div>
  );
}
