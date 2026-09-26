import { cn } from "@/lib/utils";

export function Sparkline({
  values,
  height = 56,
  stroke = "#6366f1",
  fill = "rgba(99,102,241,0.12)",
  highlight = [],
  className,
}: {
  values: number[];
  height?: number;
  stroke?: string;
  fill?: string;
  highlight?: number[];
  className?: string;
}) {
  const width = 300;
  if (values.length < 2) return <p className="text-xs text-slate-400">Not enough readings yet</p>;
  const max = Math.max(...values);
  const min = Math.min(0, ...values);
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => height - ((v - min) / (max - min || 1)) * (height - 6) - 3;
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={cn("w-full", className)} style={{ height }}>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={fill} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.75} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {highlight.map((i) => (
        <circle key={i} cx={x(i)} cy={y(values[i])} r={3.5} fill="#ef4444" stroke="white" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function Bars({
  data,
  height = 120,
  unit,
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
          <div
            className={cn("w-full rounded-t-sm transition", d.highlight ? "bg-red-500" : "bg-accent-400/80 group-hover:bg-accent-500")}
            style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
          />
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
            {d.label}: {d.value.toFixed(1)} {unit}
          </div>
        </div>
      ))}
    </div>
  );
}
