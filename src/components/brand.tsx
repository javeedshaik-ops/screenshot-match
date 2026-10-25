import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
      <span className="grid size-9 place-items-center rounded-xl bg-brand shadow-[var(--shadow-glow)]">
        <Sparkles className="size-4.5 text-primary-foreground" />
      </span>
      <span>
        Interview<span className="text-gradient">AI</span>
      </span>
    </Link>
  );
}

export function Ambient() {
  return (
    <div className="ambient" aria-hidden>
      <div className="orb size-[420px] bg-violet left-[-120px] top-[10%]" />
      <div className="orb size-[360px] bg-cyan right-[-100px] top-[45%] [animation-delay:-6s]" />
    </div>
  );
}

export function ScoreRing({ value, size = 140, label }: { value: number; size?: number; label?: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-${size}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--violet)" />
            <stop offset="100%" stopColor="var(--cyan)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#ring-${size})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-3xl font-semibold">{Math.round(pct)}%</div>
        {label && <div className="text-xs text-muted-foreground">{label}</div>}
      </div>
    </div>
  );
}
