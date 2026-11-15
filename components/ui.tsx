import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-4">
      {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/50">{eyebrow}</p>}
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <p className="mt-1 text-sm text-white/60">{children}</p>}
    </div>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-medium text-white/55">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl ${accent ? "text-gradient" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-white/45">{hint}</p>}
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "good" | "warn" | "bad" | "brand" }) {
  const tones = {
    default: "bg-white/[0.07] text-white/75",
    good: "bg-emerald-400/15 text-emerald-300",
    warn: "bg-amber-400/15 text-amber-300",
    bad: "bg-rose-400/15 text-rose-300",
    brand: "bg-sunset text-white",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Avatar({ src, name, size = 72 }: { src: string | null; name: string; size?: number }) {
  return (
    <div className="ring-story shrink-0" style={{ width: size, height: size }}>
      <div className="h-full w-full rounded-full bg-ink p-[3px]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-white/15 to-white/5 font-bold text-white/80">
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

/** Barra 0-10 */
export function Meter({ value, max = 10, label }: { value: number; max?: number; label?: string }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-white/60">
          <span>{label}</span>
          <span className="font-semibold text-white/85">
            {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}/{max}
          </span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full bg-sunset" style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

export function ScoreRing({ score, size = 140, label }: { score: number; size?: number; label?: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffb347" />
            <stop offset="45%" stopColor="#ff5f6d" />
            <stop offset="75%" stopColor="#e1306c" />
            <stop offset="100%" stopColor="#8a3ab9" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#sg)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-3xl font-extrabold">{score}</p>
          {label && <p className="text-[11px] font-medium uppercase tracking-wider text-white/55">{label}</p>}
        </div>
      </div>
    </div>
  );
}

export function List({ items, icon = "•" }: { items: string[]; icon?: string }) {
  if (!items.length) return <p className="text-sm text-white/45">Nada por aqui.</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm text-white/80">
          <span className="shrink-0 text-white/40">{icon}</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
