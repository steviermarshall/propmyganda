interface Props {
  actual: number;
  target: number;
}
export default function StatusDot({ actual, target }: Props) {
  if (!target) return <span className="inline-block w-2 h-2 rounded-full bg-white/20" />;
  const pct = actual / target;
  const color =
    pct >= 1 ? "bg-green-500" : pct >= 0.6 ? "bg-yellow-500" : "bg-red-500";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}
