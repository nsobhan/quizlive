import { get, increment, push, ref, serverTimestamp, set, update } from 'firebase/database';
import { db } from './firebase';
import { P } from './paths';
import { isCorrect, scoreAnswer } from './scoring';
import { filterProfanity } from './names';
import { normalizeAnswer } from './matching';
import type { Answer, Game, GameConfig, PublicQuestion, Question, Result, ScoreLogEntry, Team, TopAnswer } from '../types';

const r = (path: string) => ref(db, path);

// ============================================================================
// Host: create a game
// ============================================================================

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createGame(opts: {
  quizId: string;
  quizTitle: string;
  questions: Question[];
  hostUid: string;
  config: GameConfig;
  teams: Pick<Team, 'name' | 'color'>[];
}): Promise<string> {
  const teams: Record<string, Team> = {};
  if (opts.config.mode === 'team') {
    opts.teams.forEach((t, i) => {
      teams[`t${i + 1}`] = { name: t.name, color: t.color, score: 0, streak: 0 };
    });
  }
  for (let attempt = 0; attempt < 15; attempt++) {
    const code = randomCode();
    const existing = await get(r(P.game(code))).catch(() => null);
    if (existing?.exists()) continue;
    try {
      // The rules reject this write if the code is already taken (race-safe).
      await set(r(P.game(code)), {
        quizId: opts.quizId,
        quizTitle: opts.quizTitle,
        hostUid: opts.hostUid,
        hostOnline: true,
        createdAt: serverTimestamp(),
        status: 'lobby',
        config: opts.config,
        totalQuestions: opts.questions.length,
        currentQuestionIndex: -1,
        ...(opts.config.mode === 'team' ? { teams } : {}),
      });
    } catch {
      continue;
    }
    // The answer key lives in a host-only path, never under /games.
    await set(r(P.gameKey(code)), { questions: opts.questions });
    return code;
  }
  throw new Error('Could not allocate a game code, please try again.');
}

export async function loadGameKey(code: string): Promise<Question[]> {
  const snap = await get(r(P.gameKey(code)));
  return (snap.val()?.questions ?? []) as Question[];
}

// ============================================================================
// Player actions
// ============================================================================

export async function isNameTaken(code: string, name: string, uid: string) {
  const snap = await get(r(P.nameKey(code, name)));
  return snap.exists() && snap.val() !== uid;
}

export async function joinGame(code: string, uid: string, name: string, teamId: string) {
  await update(ref(db), {
    [P.nameKey(code, name)]: uid,
    [P.player(code, uid)]: { name, teamId, score: 0, streak: 0, joinedAt: serverTimestamp() },
  });
}

export async function leaveGame(code: string, uid: string, name: string) {
  await update(ref(db), { [P.player(code, uid)]: null, [P.nameKey(code, name)]: null });
}

/** `choice` is an option index for choice questions, or the typed text for text questions. */
export async function submitAnswer(code: string, qIndex: number, answerId: string, uid: string, choice: number | string) {
  const value = typeof choice === 'number' ? { option: choice } : { text: choice.trim().slice(0, 100) };
  await set(r(P.answer(code, qIndex, answerId)), { ...value, answeredAt: serverTimestamp(), by: uid });
}

export async function sendChat(code: string, teamId: string, uid: string, name: string, text: string) {
  await push(r(P.chat(code, teamId)), { playerId: uid, name, text, sentAt: serverTimestamp() });
}

/** Team with the fewest players (ties → first). */
export function smallestTeam(game: Game): string {
  const teams = Object.keys(game.teams ?? {});
  const counts = Object.fromEntries(teams.map((t) => [t, 0]));
  Object.values(game.players ?? {}).forEach((p) => {
    if (p.teamId in counts) counts[p.teamId]++;
  });
  return teams.sort((a, b) => counts[a] - counts[b] || a.localeCompare(b))[0] ?? '';
}

// ============================================================================
// Host: game flow
// ============================================================================

const toPublic = (q: Question, index: number): PublicQuestion => ({
  index,
  type: q.type,
  text: q.text,
  ...(q.textSize && q.textSize !== 'auto' ? { textSize: q.textSize } : {}),
  ...(q.imageUrl ? { imageUrl: q.imageUrl } : {}),
  options: q.type === 'text' ? [] : q.options ?? [],
  timeLimit: q.timeLimit,
  points: q.points,
});

/** Entry point for every question: discussion phase first if configured. */
export async function startQuestion(code: string, game: Game, questions: Question[], qIndex: number, now: number) {
  const q = questions[qIndex];
  if (!q) return endGame(code);
  const discuss = game.config.mode === 'team' && game.config.discussionSeconds > 0;
  if (discuss) {
    await update(r(P.game(code)), {
      status: 'discussion',
      currentQuestionIndex: qIndex,
      question: toPublic(q, qIndex),
      reveal: null,
      timer: { discussionEndsAt: now + game.config.discussionSeconds * 1000 },
    });
  } else {
    await openQuestion(code, questions, qIndex, now);
  }
}

export async function openQuestion(code: string, questions: Question[], qIndex: number, now: number) {
  const q = questions[qIndex];
  await update(r(P.game(code)), {
    status: 'question',
    currentQuestionIndex: qIndex,
    question: toPublic(q, qIndex),
    reveal: null,
    timer: { startedAt: now, endsAt: now + q.timeLimit * 1000 },
  });
}

export async function pauseTimer(code: string, now: number) {
  await update(r(P.game(code)), { 'timer/pausedAt': now });
}

export async function resumeTimer(code: string, game: Game, now: number) {
  const t = game.timer;
  if (!t?.pausedAt) return;
  const shift = now - t.pausedAt;
  const upd: Record<string, unknown> = { 'timer/pausedAt': null };
  if (game.status === 'discussion' && t.discussionEndsAt) {
    upd['timer/discussionEndsAt'] = t.discussionEndsAt + shift;
  } else if (t.endsAt) {
    upd['timer/endsAt'] = t.endsAt + shift;
    upd['timer/pauses'] = [...(t.pauses ?? []), { from: t.pausedAt, to: now }];
  }
  await update(r(P.game(code)), upd);
}

/** Who is expected to answer this question (player ids or team ids). */
export function expectedAnswerers(game: Game): string[] {
  const players = Object.entries(game.players ?? {});
  if (game.config.mode === 'team' && game.config.teamAnswerRule !== 'all') {
    const withMembers = new Set(players.map(([, p]) => p.teamId).filter(Boolean));
    return Object.keys(game.teams ?? {}).filter((t) => withMembers.has(t));
  }
  return players.map(([id]) => id);
}

/** Score the current question. The host is the single authority for points. */
export async function finishQuestion(code: string, game: Game, questions: Question[]) {
  const qIndex = game.currentQuestionIndex;
  const q = questions[qIndex];
  const t = game.timer ?? {};
  if (!q || t.startedAt == null) return;

  const answers = ((await get(r(P.answers(code, qIndex)))).val() ?? {}) as Record<string, Answer>;
  const cfg = game.config;
  const singleAnswer = cfg.mode === 'team' && cfg.teamAnswerRule !== 'all';
  const upd: Record<string, unknown> = {};
  const g = `games/${code}`;
  const distribution = (q.options ?? []).map(() => 0);
  Object.values(answers).forEach((a) => {
    if (typeof a.option === 'number' && a.option >= 0 && a.option < distribution.length) distribution[a.option]++;
  });
  const expected = expectedAnswerers(game);

  if (singleAnswer) {
    for (const teamId of expected) {
      const team = game.teams?.[teamId];
      if (!team) continue;
      const { result, streak } = scoreAnswer(q, answers[teamId], team.streak ?? 0, cfg, t.startedAt, t.pauses);
      upd[`${g}/results/${qIndex}/${teamId}`] = stripUndefined(result);
      upd[`${g}/teams/${teamId}/streak`] = streak;
      if (result.points) {
        upd[`${g}/teams/${teamId}/score`] = increment(result.points);
        // Credit the member who submitted, so the member breakdown shows contributions.
        if (result.by && game.players?.[result.by]) upd[`${g}/players/${result.by}/score`] = increment(result.points);
      }
    }
  } else {
    const teamTotals: Record<string, number> = {};
    for (const [uid, p] of Object.entries(game.players ?? {})) {
      const { result, streak } = scoreAnswer(q, answers[uid], p.streak ?? 0, cfg, t.startedAt, t.pauses);
      upd[`${g}/results/${qIndex}/${uid}`] = stripUndefined(result);
      upd[`${g}/players/${uid}/streak`] = streak;
      if (result.points) {
        upd[`${g}/players/${uid}/score`] = increment(result.points);
        if (cfg.mode === 'team' && p.teamId) teamTotals[p.teamId] = (teamTotals[p.teamId] ?? 0) + result.points;
      }
    }
    for (const [teamId, pts] of Object.entries(teamTotals)) {
      if (game.teams?.[teamId]) upd[`${g}/teams/${teamId}/score`] = increment(pts);
    }
  }

  upd[`${g}/status`] = 'reveal';
  upd[`${g}/timer/pausedAt`] = null;
  upd[`${g}/reveal`] = {
    index: qIndex,
    correct: q.correct ?? [],
    distribution,
    answered: Object.keys(answers).length,
    expected: expected.length,
    ...(q.type === 'text' ? { accepted: (q.answers ?? []).filter(Boolean), top: topAnswers(q, Object.values(answers)) } : {}),
  };
  await update(ref(db), upd);
}

/** Group typed answers (by normalised form) and return the most common ones. */
function topAnswers(q: Question, answers: Answer[], limit = 6): TopAnswer[] {
  const groups = new Map<string, TopAnswer>();
  for (const a of answers) {
    if (typeof a.text !== 'string' || !a.text.trim()) continue;
    const key = normalizeAnswer(a.text) || a.text.trim().toLowerCase();
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { text: filterProfanity(a.text.trim()).slice(0, 60), count: 1, correct: isCorrect(q, a) });
  }
  return [...groups.values()].sort((x, y) => y.count - x.count || Number(y.correct) - Number(x.correct)).slice(0, limit);
}

function stripUndefined(res: Result): Result {
  return Object.fromEntries(Object.entries(res).filter(([, v]) => v !== undefined)) as unknown as Result;
}

export async function showLeaderboard(code: string) {
  await update(r(P.game(code)), { status: 'leaderboard' });
}

/** "Next" button: reveal → (leaderboard) → next question → … → ended */
export async function nextStep(code: string, game: Game, questions: Question[], now: number) {
  const last = game.currentQuestionIndex >= questions.length - 1;
  if (game.status === 'lobby') return startQuestion(code, game, questions, 0, now);
  if (game.status === 'reveal' && game.config.showLeaderboardEachQuestion && !last) return showLeaderboard(code);
  if (last) return endGame(code);
  return startQuestion(code, game, questions, game.currentQuestionIndex + 1, now);
}

/** Skip the current question entirely: no points, streaks untouched. */
export async function skipQuestion(code: string, game: Game, questions: Question[], now: number) {
  const qIndex = game.currentQuestionIndex;
  await set(r(P.answers(code, qIndex)), null);
  if (qIndex >= questions.length - 1) return endGame(code);
  return startQuestion(code, game, questions, qIndex + 1, now);
}

export async function endGame(code: string) {
  await update(r(P.game(code)), { status: 'ended', timer: null });
}

// ============================================================================
// Host: players & teams
// ============================================================================

export async function kickPlayer(code: string, uid: string, name: string) {
  await update(ref(db), {
    [P.player(code, uid)]: null,
    [P.nameKey(code, name)]: null,
    [`games/${code}/kicked/${uid}`]: true,
  });
}

export async function assignTeam(code: string, uid: string, teamId: string) {
  await set(r(`${P.player(code, uid)}/teamId`), teamId);
}

export async function setCaptain(code: string, teamId: string, uid: string) {
  await set(r(`${P.team(code, teamId)}/captainId`), uid);
}

export async function autoAssignUnassigned(code: string, game: Game) {
  const teamIds = Object.keys(game.teams ?? {});
  if (!teamIds.length) return;
  const counts: Record<string, number> = Object.fromEntries(teamIds.map((t) => [t, 0]));
  const players = Object.entries(game.players ?? {});
  players.forEach(([, p]) => p.teamId in counts && counts[p.teamId]++);
  const upd: Record<string, string> = {};
  players
    .filter(([, p]) => !p.teamId)
    .forEach(([uid]) => {
      const t = teamIds.sort((a, b) => counts[a] - counts[b] || a.localeCompare(b))[0];
      counts[t]++;
      upd[`${P.player(code, uid)}/teamId`] = t;
    });
  if (Object.keys(upd).length) await update(ref(db), upd);
}

export async function adjustScore(
  code: string,
  game: Game,
  targetType: 'player' | 'team',
  target: string,
  delta: number,
  reason: string,
) {
  const g = `games/${code}`;
  const upd: Record<string, unknown> = {};
  let targetName = target;
  if (targetType === 'player') {
    const p = game.players?.[target];
    if (!p) return;
    targetName = p.name;
    upd[`${g}/players/${target}/score`] = increment(delta);
    // In "everyone answers" team mode the team score is the sum of member scores.
    if (game.config.mode === 'team' && game.config.teamAnswerRule === 'all' && p.teamId && game.teams?.[p.teamId]) {
      upd[`${g}/teams/${p.teamId}/score`] = increment(delta);
    }
  } else {
    const t = game.teams?.[target];
    if (!t) return;
    targetName = t.name;
    upd[`${g}/teams/${target}/score`] = increment(delta);
  }
  const logId = push(r(P.scoreLog(code))).key!;
  const entry: Omit<ScoreLogEntry, 'at'> & { at: object } = {
    targetType,
    target,
    targetName,
    delta,
    reason: reason.slice(0, 200),
    at: serverTimestamp(),
  };
  upd[`${P.scoreLog(code)}/${logId}`] = entry;
  await update(ref(db), upd);
}
