import { useEffect, useRef } from 'react';
import { expectedAnswerers, finishQuestion, openQuestion, setCaptain } from '../lib/game';
import { P } from '../lib/paths';
import type { Answer, Game, Question } from '../types';
import { serverNow, useServerNow } from './useServerTime';
import { useValue } from './useValue';

/** Late answers can still be in flight when the clock hits zero; wait a moment before scoring. */
const GRACE_MS = 800;

/**
 * The host's browser is the game engine: it advances discussion → question → reveal
 * when timers run out (or everyone has answered) and computes the scores.
 */
export function useHostEngine(code: string, game: Game | null, questions: Question[]) {
  const now = useServerNow(250);
  const qi = game?.currentQuestionIndex ?? -1;
  const answers = useValue<Record<string, Answer>>(game && game.status === 'question' && qi >= 0 ? P.answers(code, qi) : null);
  const inFlight = useRef<string | null>(null);

  const expected = game ? expectedAnswerers(game) : [];
  const answeredCount = expected.filter((id) => answers?.[id]).length;

  useEffect(() => {
    if (!game || !questions.length || game.timer?.pausedAt) return;
    const key = `${game.status}:${qi}`;
    if (inFlight.current === key) return;
    const t = game.timer;
    const run = (fn: () => Promise<unknown>) => {
      inFlight.current = key;
      fn().catch((e) => {
        console.error(e);
        inFlight.current = null;
      });
    };
    if (game.status === 'discussion' && t?.discussionEndsAt && now >= t.discussionEndsAt) {
      run(() => openQuestion(code, questions, qi, serverNow()));
    } else if (game.status === 'question' && t?.endsAt) {
      const allIn = expected.length > 0 && answeredCount >= expected.length;
      if (allIn || now >= t.endsAt + GRACE_MS) run(() => finishQuestion(code, game, questions));
    }
  }, [now, game, questions, code, qi, expected.length, answeredCount]);

  // Captain mode: make sure every team with members has a captain who is still on the team.
  useEffect(() => {
    if (!game || game.config.mode !== 'team' || game.config.teamAnswerRule !== 'captain') return;
    const players = Object.entries(game.players ?? {}).sort(([, a], [, b]) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0));
    for (const [teamId, team] of Object.entries(game.teams ?? {})) {
      const members = players.filter(([, p]) => p.teamId === teamId);
      if (members.length && !members.some(([id]) => id === team.captainId)) {
        setCaptain(code, teamId, members[0][0]).catch(() => {});
      }
    }
  }, [game, code]);

  return { answeredCount, expectedCount: expected.length };
}
