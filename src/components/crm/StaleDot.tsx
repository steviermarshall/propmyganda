interface Props {
  days: number;
}
export default function StaleDot({ days }: Props) {
  if (days < 7 || days === Infinity) return null;
  return (
    <span
      title={`${days}d since last update`}
      className="inline-block w-2 h-2 rounded-full bg-red-500 animate-stale-pulse"
    />
  );
}
