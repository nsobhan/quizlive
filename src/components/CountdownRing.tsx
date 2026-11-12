import { motion } from 'framer-motion';

export function CountdownRing({ remaining, total, size = 96, paused }: { remaining: number; total: number; size?: number; paused?: boolean }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const secs = Math.ceil(remaining);
  const urgent = secs <= 5 && !paused;
  return (
    <div className="relative" style={{ width: size, height: size }} role="timer" aria-live="off" aria-label={`${secs} seconds left`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.18)" strokeWidth="10" fill="rgba(0,0,0,0.2)" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={urgent ? '#f43f5e' : '#fbbf24'}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s' }}
        />
      </svg>
      <motion.div
        key={secs}
        initial={{ scale: urgent ? 1.4 : 1 }}
        animate={{ scale: 1 }}
        className="absolute inset-0 flex items-center justify-center font-display font-bold"
        style={{ fontSize: size * 0.36 }}
      >
        {paused ? '❚❚' : secs}
      </motion.div>
    </div>
  );
}
