"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const CHART_COLORS = [
  "#0ea5e9",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#8b5cf6",
  "#64748b",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
  "#f97316",
];

const RAG_COLORS: Record<string, string> = {
  Green: "#16a34a",
  Yellow: "#f59e0b",
  Red: "#dc2626",
};

const LEGEND: Record<string, string> = {
  Green: "text-emerald-600",
  Yellow: "text-amber-600",
  Red: "text-red-600",
};

function tooltipStyle() {
  return {
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 24px rgb(15 23 42 / 0.08)",
    fontSize: 12,
  };
}

export function PieBlock({
  data,
  height = 220,
  colors,
  palette: paletteProp,
}: {
  data: { name: string; value: number }[];
  height?: number;
  colors?: Record<string, string>;
  palette?: string[];
}) {
  const useColors = colors ?? {};
  const palette = paletteProp ?? CHART_COLORS;
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={2} stroke="none">
            {data.map((d, i) => (
              <Cell key={d.name} fill={useColors[d.name] ?? palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle()} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-2 pb-1">
        {data.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="size-2.5 rounded-sm" style={{ background: useColors[d.name] ?? palette[i % palette.length] }} />
            {d.name} <b className="tabular-nums text-slate-800">{d.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export function RAGLegend({ data }: { data: { name: string; value: number }[] }) {
  const order = ["Green", "Yellow", "Red"];
  return (
    <div className="flex flex-wrap gap-2">
      {order
        .filter((k) => data.some((d) => d.name === k))
        .map((k) => {
          const n = data.find((d) => d.name === k)?.value ?? 0;
          return (
            <span key={k} className={`inline-flex items-center gap-1.5 text-xs font-medium ${LEGEND[k] ?? "text-slate-600"}`}>
              <span className="size-2.5 rounded-sm" style={{ background: RAG_COLORS[k] }} />
              {k} · {n}
            </span>
          );
        })}
    </div>
  );
}

export function BarsBlock({
  data,
  bars,
  height = 260,
  stacked,
  money,
  xLabel,
}: {
  data: Record<string, unknown>[];
  bars: { key: string; color: string; name?: string }[];
  height?: number;
  stacked?: boolean;
  money?: boolean;
  xLabel?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: money ? 4 : -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} interval={0} angle={-18} height={48} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={tooltipStyle()}
          formatter={(value, name) => (money ? [`$${Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`, name] : [value, name])}
          labelFormatter={(label) => (xLabel ? `${xLabel} ${label}` : label)}
        />
        {bars.map((b) => (
          <Bar key={b.key} dataKey={b.key} name={b.name ?? b.key} fill={b.color} stackId={stacked ? "s" : undefined} radius={stacked ? undefined : [3, 3, 0, 0]} barSize={22} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}