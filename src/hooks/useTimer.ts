import type { Game } from '../types';
import { useServerNow } from './useServerTime';

/** Seconds remaining in the current discussion/question phase (respects pause). */
export function useTimer(game: Game | null | undefined) {
  const now = useServerNow(200);
  const t = game?.timer;
  const paused = !!t?.pausedAt;
  const ref = paused ? t!.pausedAt! : now;
  let remaining = 0;
  let total = 0;
  if (game?.status === 'discussion' && t?.discussionEndsAt) {
    remaining = (t.discussionEndsAt - ref) / 1000;
    total = game.config.discussionSeconds;
  } else if (game?.status === 'question' && t?.endsAt) {
    remaining = (t.endsAt - ref) / 1000;
    total = game.question?.timeLimit ?? 0;
  }
  return { remaining: Math.max(0, remaining), total, paused, now };
}
