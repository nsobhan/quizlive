import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { setMuted } from '../lib/sound';
import { useMuted } from '../hooks/useMuted';

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-brand min-h-[100dvh] w-full ${className}`}>{children}</div>;
}

export function Logo({ size = 'md', link = true }: { size?: 'sm' | 'md' | 'xl'; link?: boolean }) {
  const cls = { sm: 'text-2xl', md: 'text-4xl', xl: 'text-6xl sm:text-7xl' }[size];
  const inner = (
    <span className={`font-display font-bold tracking-tight ${cls}`}>
      Quiz<span className="text-amber-300">Live</span>
      <span className="ml-1 inline-block h-3 w-3 animate-pulse rounded-full bg-rose-500 align-super" aria-hidden />
    </span>
  );
  return link ? <Link to="/" aria-label="QuizLive home">{inner}</Link> : inner;
}

export function MuteToggle({ className = '' }: { className?: string }) {
  const muted = useMuted();
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      className={`btn-ghost btn-sm ${className}`}
      aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
      aria-pressed={muted}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16" role="status">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-amber-300" />
      <p className="font-display text-xl text-white/80">{label}</p>
    </div>
  );
}

export function FullScreenMessage({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <Screen className="flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card w-full max-w-md p-8 text-center">
        <div className="mb-3 text-6xl" aria-hidden>{emoji}</div>
        <h1 className="mb-2 text-3xl font-bold">{title}</h1>
        <div className="space-y-4 text-slate-600">{children}</div>
      </motion.div>
    </Screen>
  );
}

export function Banner({ children, tone = 'warn' }: { children: ReactNode; tone?: 'warn' | 'info' }) {
  return (
    <div
      role="status"
      className={`fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full px-5 py-2 text-sm font-bold shadow-lg ${
        tone === 'warn' ? 'bg-rose-600 text-white' : 'bg-white text-slate-900'
      }`}
    >
      {children}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl p-3 hover:bg-slate-50">
      <span>
        <span className="block font-bold text-slate-800">{label}</span>
        {hint && <span className="block text-sm text-slate-500">{hint}</span>}
      </span>
      <span className="relative mt-1 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-violet-600 peer-focus-visible:ring-4 peer-focus-visible:ring-amber-300" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  name,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${
            value === o.value ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
