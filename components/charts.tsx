"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FORMAT_LABEL, pct, shortDate } from "@/lib/format";
import type { Quantitative } from "@/lib/types";

const BRAND = "#ff4f8b";
const BRAND_SOFT = "rgba(255,79,139,0.35)";
const AXIS = { fill: "rgba(255,255,255,0.5)", fontSize: 11 };
const GRID = "rgba(255,255,255,0.06)";

function TipBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-3/95 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white">{title}</p>
      {lines.map((l) => (
        <p key={l} className="text-white/70">
          {l}
        </p>
      ))}
    </div>
  );
}

export function EngagementTimeline({ quant }: { quant: Quantitative }) {
  const data = quant.timeline.map((t) => ({ ...t, label: shortDate(t.date) }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.25)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof data)[number];
              return <TipBox title={p.label} lines={[`${FORMAT_LABEL[p.format]}`, `Engajamento ${pct(p.engagement)}`]} />;
            }}
          />
          <Line
            type="monotone"
            dataKey="engagement"
            stroke={BRAND}
            strokeWidth={2}
            dot={{ r: 3, fill: BRAND, strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "#0a0a12", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FormatBars({ quant }: { quant: Quantitative }) {
  const best = Math.max(...quant.byFormat.map((f) => f.avgEngagement));
  const data = quant.byFormat.map((f) => ({ ...f, label: FORMAT_LABEL[f.format] }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap={10}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={78} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const f = payload[0].payload as (typeof data)[number];
              return (
                <TipBox
                  title={f.label}
                  lines={[
                    `${f.count} posts (${pct(f.share, 0)} do total)`,
                    `Engajamento médio ${pct(f.avgEngagement)}`,
                    ...(f.avgViews != null ? [`Views médias ${f.avgViews.toLocaleString("pt-BR")}`] : []),
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="avgEngagement"
            radius={[0, 4, 4, 0]}
            label={{ position: "right", fill: "rgba(255,255,255,0.75)", fontSize: 11, formatter: (v: unknown) => pct(Number(v)) }}
          >
            {data.map((f) => (
              <Cell key={f.format} fill={f.avgEngagement === best ? BRAND : BRAND_SOFT} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeekdayBars({ quant }: { quant: Quantitative }) {
  const best = Math.max(...quant.byWeekday.map((d) => d.avgEngagement));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={quant.byWeekday} margin={{ top: 8, right: 0, left: -18, bottom: 0 }} barCategoryGap={8}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as Quantitative["byWeekday"][number];
              return <TipBox title={d.day} lines={[`${d.posts} posts`, `Engajamento médio ${pct(d.avgEngagement)}`]} />;
            }}
          />
          <Bar dataKey="avgEngagement" radius={[4, 4, 0, 0]}>
            {quant.byWeekday.map((d) => (
              <Cell key={d.day} fill={d.avgEngagement === best && best > 0 ? BRAND : BRAND_SOFT} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
