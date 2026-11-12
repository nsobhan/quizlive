import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { RankEntry } from '../lib/rankings';

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_H = ['h-44 sm:h-56', 'h-56 sm:h-72', 'h-32 sm:h-44']; // silver, gold, bronze columns
const PODIUM_BG = ['from-yellow-300 to-accent-500', 'from-slate-200 to-slate-400', 'from-orange-300 to-orange-600'];

export function Podium({ entries, big }: { entries: RankEntry[]; big?: boolean }) {
  const order = [1, 0, 2]; // silver, gold, bronze
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6" aria-label="Top three">
      {order.map((i, col) => {
        const e = entries[i];
        if (!e) return <div key={i} className={big ? 'w-32 sm:w-64' : 'w-28 sm:w-44'} />;
        return (
          <motion.div
            key={e.id}
            layout
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: [0.4, 0.8, 0.1][col], type: 'spring', stiffness: 120, damping: 14 }}
            className={`flex flex-col items-center ${big ? 'w-32 sm:w-64' : 'w-28 sm:w-44'}`}
          >
            <div className={`${big ? 'text-6xl' : 'text-4xl'} mb-1`} aria-hidden>{MEDALS[i]}</div>
            <div className={`mb-2 line-clamp-2 w-full break-words text-center font-display font-bold ${big ? 'text-2xl leading-tight' : 'text-lg sm:text-2xl'}`}>
              {e.name}
            </div>
            <div
              className={`flex w-full flex-col items-center justify-start rounded-t-2xl bg-gradient-to-b pt-3 shadow-chunky ${PODIUM_BG[i]} ${PODIUM_H[col]}`}
              style={e.color ? { boxShadow: `inset 0 6px 0 ${e.color}` } : undefined}
            >
              <span className="font-display text-4xl font-bold text-slate-900/80 sm:text-6xl">{i + 1}</span>
              <span className="mt-1 font-display text-lg font-bold text-slate-900/80 sm:text-2xl">{e.score.toLocaleString()}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function RankList({
  entries,
  highlightId,
  start = 0,
  max,
  big,
  expandable,
}: {
  entries: RankEntry[];
  highlightId?: string;
  start?: number;
  max?: number;
  big?: boolean;
  expandable?: boolean;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const list = entries.slice(start, max ? start + max : undefined);
  return (
    <ol className="space-y-2" aria-label="Rankings">
      <AnimatePresence initial={false}>
        {list.map((e, i) => {
          const rank = start + i + 1;
          const isOpen = !!open[e.id];
          return (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`overflow-hidden rounded-2xl ${e.id === highlightId ? 'bg-accent-300 text-slate-900' : 'bg-white/10'}`}
            >
              <button
                type="button"
                disabled={!expandable || !e.members?.length}
                onClick={() => setOpen((o) => ({ ...o, [e.id]: !o[e.id] }))}
                aria-expanded={expandable ? isOpen : undefined}
                className={`flex w-full items-center gap-3 text-left ${big ? 'px-6 py-4 text-3xl' : 'px-4 py-3 text-lg'}`}
              >
                <span className={`font-display font-bold opacity-70 ${big ? 'w-14' : 'w-8'}`}>{rank}</span>
                {e.color && <span className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white/60" style={{ background: e.color }} aria-hidden />}
                <span className="flex-1 truncate font-bold">{e.name}</span>
                {expandable && !!e.members?.length && (
                  <span className="text-sm opacity-70">{e.members.length} 👤 {isOpen ? '▲' : '▼'}</span>
                )}
                <motion.span key={e.score} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-display font-bold tabular-nums">
                  {e.score.toLocaleString()}
                </motion.span>
              </button>
              {expandable && isOpen && e.members && (
                <ul className={`border-t border-white/10 bg-black/10 ${big ? 'px-20 py-3 text-2xl' : 'px-12 py-2 text-base'}`}>
                  {e.members.map((m) => (
                    <li key={m.id} className="flex justify-between py-1">
                      <span>{m.name}</span>
                      <span className="tabular-nums opacity-80">{m.score.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
