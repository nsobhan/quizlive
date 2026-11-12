import { motion } from 'framer-motion';
import { TILE_STYLES } from '../lib/constants';
import { Shape } from './Shape';

export function DistributionChart({ options, distribution, correct }: { options: string[]; distribution: number[]; correct: number[] }) {
  const max = Math.max(1, ...distribution);
  return (
    <div className="flex h-64 items-end justify-center gap-4 sm:gap-8" role="img" aria-label={options.map((o, i) => `${o}: ${distribution[i] ?? 0}`).join(', ')}>
      {options.map((_, i) => {
        const n = distribution[i] ?? 0;
        const ok = correct.includes(i);
        return (
          <div key={i} className="flex w-20 flex-col items-center gap-2 sm:w-28">
            <span className="font-display text-3xl font-bold">{n}</span>
            <motion.div
              initial={{ height: 4 }}
              animate={{ height: 4 + (n / max) * 160 }}
              transition={{ type: 'spring', stiffness: 80, damping: 15, delay: i * 0.08 }}
              className={`w-full rounded-t-xl ${TILE_STYLES[i].bg} ${ok ? '' : 'opacity-40'}`}
            />
            <div className={`flex w-full items-center justify-center gap-1 rounded-xl py-2 ${TILE_STYLES[i].bg} ${ok ? '' : 'opacity-40'}`}>
              <Shape shape={TILE_STYLES[i].shape} className="h-6 w-6" />
              {ok && <span className="text-xl font-bold" aria-label="correct">✓</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
