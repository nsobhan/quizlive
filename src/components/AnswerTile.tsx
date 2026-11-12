import { motion } from 'framer-motion';
import { TILE_STYLES } from '../lib/constants';
import { Shape } from './Shape';

interface Props {
  index: number;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  state?: 'idle' | 'selected' | 'dimmed' | 'correct' | 'wrong';
  size?: 'lg' | 'xl';
  count?: number;
}

export function AnswerTile({ index, label, onClick, disabled, state = 'idle', size = 'lg', count }: Props) {
  const s = TILE_STYLES[index];
  const dim = state === 'dimmed' || state === 'wrong';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${s.name} ${s.shape}: ${label}`}
      aria-pressed={state === 'selected'}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: dim ? 0.35 : 1, y: 0, scale: state === 'correct' ? 1.02 : 1 }}
      transition={{ delay: index * 0.05 }}
      className={`${s.bg} ${s.fg} relative flex w-full items-center gap-4 rounded-2xl text-left font-bold shadow-chunky
        transition-[filter] enabled:hover:brightness-110 disabled:cursor-default
        ${size === 'xl' ? 'min-h-[7.5rem] px-6 py-5 text-3xl' : 'min-h-[5.5rem] px-4 py-4 text-xl sm:min-h-[7rem] sm:text-2xl'}
        ${state === 'selected' || state === 'correct' ? 'outline outline-4 outline-offset-4 outline-white' : ''}`}
    >
      <Shape shape={s.shape} className={size === 'xl' ? 'h-12 w-12 shrink-0' : 'h-9 w-9 shrink-0 sm:h-11 sm:w-11'} />
      <span className="flex-1 break-words leading-tight">{label}</span>
      {state === 'correct' && <span className="text-3xl" aria-label="correct">✓</span>}
      {state === 'wrong' && <span className="text-3xl" aria-label="incorrect">✗</span>}
      {count !== undefined && <span className="rounded-xl bg-black/25 px-3 py-1 text-2xl">{count}</span>}
    </motion.button>
  );
}
