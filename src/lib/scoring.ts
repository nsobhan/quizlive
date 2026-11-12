import type { Answer, GameConfig, PauseSpan, Question, Result } from '../types';
import { isTextMatch } from './matching';

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
export function isCorrect(q: Pick<Question, 'type' | 'correct' | 'answers' | 'fuzzy'>, answer: Answer | undefined): boolean {
  if (!answer) return false;
  if (q.type === 'text') return typeof answer.text === 'string' && isTextMatch(answer.text, q.answers, !!q.fuzzy);
  return typeof answer.option === 'number' && (q.correct ?? []).includes(answer.option);
}

export function scoreAnswer(
  q: Pick<Question, 'type' | 'correct' | 'answers' | 'fuzzy' | 'points' | 'timeLimit'>,
  answer: Answer | undefined,
  prevStreak: number,
  cfg: Pick<GameConfig, 'speedBonus' | 'streakBonus'>,
  startedAt: number,
  pauses: PauseSpan[] = [],
): { result: Result; streak: number } {
  const picked = { option: answer?.option ?? null, ...(answer?.text != null ? { text: answer.text } : {}), by: answer?.by };
  if (!isCorrect(q, answer)) {
    return { result: { ...picked, correct: false, points: 0, streakBonus: 0 }, streak: 0 };
  }
  const limitMs = q.timeLimit * 1000;
  const rt = Math.min(responseTimeMs(answer!.answeredAt, startedAt, pauses), limitMs);
  const factor = cfg.speedBonus ? 1 - rt / limitMs / 2 : 1;
  const streak = prevStreak + 1;
  const streakBonus = cfg.streakBonus ? Math.min((streak - 1) * STREAK_STEP, STREAK_CAP) : 0;
  const base = Math.round(q.points * factor);
  return {
    result: { ...picked, correct: true, points: base + streakBonus, streakBonus },
    streak,
  };
}
