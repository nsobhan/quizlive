import type { Answer, GameConfig, PauseSpan, Question, Result } from '../types';

export const STREAK_STEP = 100;
export const STREAK_CAP = 500;

/** Milliseconds the player actually spent answering, with paused time removed. */
export function responseTimeMs(answeredAt: number, startedAt: number, pauses: PauseSpan[] = []): number {
  let paused = 0;
  for (const p of pauses) {
    const from = Math.max(p.from, startedAt);
    const to = Math.min(p.to, answeredAt);
    if (to > from) paused += to - from;
  }
  return Math.max(0, answeredAt - startedAt - paused);
}

/**
 * Correct: basePoints × (speedBonus ? 1 − (responseTime / timeLimit) / 2 : 1)
 * Streak: +100 per consecutive correct answer after the first, capped at +500.
 * Wrong / no answer: 0 points and the streak resets.
 */
export function scoreAnswer(
  q: Pick<Question, 'correct' | 'points' | 'timeLimit'>,
  answer: Answer | undefined,
  prevStreak: number,
  cfg: Pick<GameConfig, 'speedBonus' | 'streakBonus'>,
  startedAt: number,
  pauses: PauseSpan[] = [],
): { result: Result; streak: number } {
  if (!answer || !q.correct.includes(answer.option)) {
    return {
      result: { option: answer ? answer.option : null, correct: false, points: 0, streakBonus: 0, by: answer?.by },
      streak: 0,
    };
  }
  const limitMs = q.timeLimit * 1000;
  const rt = Math.min(responseTimeMs(answer.answeredAt, startedAt, pauses), limitMs);
  const factor = cfg.speedBonus ? 1 - rt / limitMs / 2 : 1;
  const streak = prevStreak + 1;
  const streakBonus = cfg.streakBonus ? Math.min((streak - 1) * STREAK_STEP, STREAK_CAP) : 0;
  const base = Math.round(q.points * factor);
  return {
    result: { option: answer.option, correct: true, points: base + streakBonus, streakBonus, by: answer.by },
    streak,
  };
}
