import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, ref } from 'firebase/database';
import { db } from '../../lib/firebase';
import { P } from '../../lib/paths';
import { createGame } from '../../lib/game';
import { validateQuiz } from '../../lib/quizzes';
import { DEFAULT_CONFIG, TEAM_PRESETS } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import { FullScreenMessage, Logo, Screen, Segmented, Spinner, Toggle } from '../../components/ui';
import type { GameConfig, Quiz } from '../../types';
import { RECENT_GAMES_KEY, recentGames } from './Dashboard';

const CONFIG_KEY = 'quizlive:lastConfig';

export default function HostSetup() {
  const { quizId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null | undefined>(undefined);
  const [cfg, setCfg] = useState<GameConfig>(() => {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}') };
    } catch {
      return DEFAULT_CONFIG;
    }
  });
  const [teams, setTeams] = useState(TEAM_PRESETS.slice(0, 2));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    get(ref(db, P.quiz(quizId))).then((s) => setQuiz(s.exists() ? (s.val() as Quiz) : null));
  }, [quizId]);

  if (quiz === undefined) return <Screen><Spinner /></Screen>;
  if (quiz === null) return <FullScreenMessage emoji="🤷" title="Quiz not found"><Link to="/admin" className="btn-dark">Back</Link></FullScreenMessage>;

  const problems = validateQuiz({ title: quiz.title, questions: quiz.questions ?? [] });
  const set = (p: Partial<GameConfig>) => setCfg((c) => ({ ...c, ...p }));
  const setTeamCount = (n: number) =>
    setTeams((ts) => Array.from({ length: n }, (_, i) => ts[i] ?? TEAM_PRESETS[i]));
  const isTeam = cfg.mode === 'team';

  async function start() {
    if (!user || !quiz) return;
    if (isTeam && teams.some((t) => !t.name.trim())) return setErr('Every team needs a name.');
    setBusy(true);
    setErr(null);
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
      const config: GameConfig = { ...cfg, discussionSeconds: isTeam ? cfg.discussionSeconds : 0 };
      const code = await createGame({
        quizId,
        quizTitle: quiz.title,
        questions: quiz.questions,
        hostUid: user.uid,
        config,
        teams: teams.map((t) => ({ ...t, name: t.name.trim().slice(0, 30) })),
      });
      localStorage.setItem(RECENT_GAMES_KEY, JSON.stringify([{ code, title: quiz.title, at: Date.now() }, ...recentGames()].slice(0, 10)));
      navigate(`/admin/host/${code}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Screen>
      <header className="flex items-center gap-3 px-6 py-4">
        <Link to="/admin" className="btn-ghost btn-sm">← Quizzes</Link>
        <Logo size="sm" />
      </header>
      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-16">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-4xl" style={{ background: quiz.color }} aria-hidden>{quiz.emoji}</div>
          <div>
            <h1 className="font-display text-3xl font-bold">{quiz.title}</h1>
            <p className="text-white/70">{quiz.questions?.length ?? 0} questions · Game setup</p>
          </div>
        </div>

        {problems.length > 0 && (
          <div className="rounded-2xl bg-rose-600 p-4 font-bold" role="alert">
            Fix this quiz before hosting:
            <ul className="mt-1 text-sm font-normal">{problems.map((p) => <li key={p}>• {p}</li>)}</ul>
            <Link to={`/admin/quiz/${quizId}`} className="btn-light btn-sm mt-3">Open editor</Link>
          </div>
        )}

        <section className="card space-y-4 p-5">
          <h2 className="text-xl font-bold">Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['individual', 'team'] as const).map((m) => (
              <button key={m} type="button" onClick={() => set({ mode: m })} aria-pressed={cfg.mode === m}
                className={`rounded-2xl border-4 p-4 text-left transition ${cfg.mode === m ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-brand-300'}`}>
                <div className="text-3xl" aria-hidden>{m === 'individual' ? '🙋' : '👥'}</div>
                <div className="font-display text-xl font-bold">{m === 'individual' ? 'Individual' : 'Team mode'}</div>
                <div className="text-sm text-slate-500">{m === 'individual' ? 'Everyone plays for themselves.' : 'Players compete in teams with private chat.'}</div>
              </button>
            ))}
          </div>
        </section>

        {isTeam && (
          <section className="card space-y-5 p-5">
            <h2 className="text-xl font-bold">Teams</h2>
            <div>
              <span className="label">Number of teams</span>
              <Segmented name="Number of teams" value={teams.length} onChange={setTeamCount} options={[2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: n, label: String(n) }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {teams.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="color" aria-label={`Team ${i + 1} color`} value={t.color} onChange={(e) => setTeams(teams.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} className="h-11 w-11 cursor-pointer rounded-xl border-0 bg-transparent" />
                  <input aria-label={`Team ${i + 1} name`} className="input py-2" maxLength={30} value={t.name} onChange={(e) => setTeams(teams.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                </div>
              ))}
            </div>
            <div>
              <span className="label">Team assignment</span>
              <Segmented name="Team assignment" value={cfg.teamAssignment} onChange={(v) => set({ teamAssignment: v })}
                options={[{ value: 'choose', label: 'Players choose' }, { value: 'auto', label: 'Auto-balance' }, { value: 'manual', label: 'I assign manually' }]} />
            </div>
            <div>
              <span className="label">Team answers</span>
              <Segmented name="Team answer rule" value={cfg.teamAnswerRule} onChange={(v) => set({ teamAnswerRule: v })}
                options={[{ value: 'all', label: 'Everyone answers (sum)' }, { value: 'first', label: 'One per team: first to submit' }, { value: 'captain', label: 'One per team: captain submits' }]} />
              <p className="mt-1 text-sm text-slate-500">
                {cfg.teamAnswerRule === 'all' ? 'Team score = sum of member scores.' : cfg.teamAnswerRule === 'first' ? "The first teammate to tap locks in the team's answer." : 'Only the team captain (first to join; changeable by you) can answer.'}
              </p>
            </div>
            <div>
              <span className="label">Discussion time before answers open</span>
              <Segmented name="Discussion time" value={cfg.discussionSeconds} onChange={(v) => set({ discussionSeconds: v })}
                options={[0, 10, 15, 30, 45].map((s) => ({ value: s, label: s ? `${s}s` : 'None' }))} />
            </div>
            <Toggle checked={cfg.chatEnabled} onChange={(v) => set({ chatEnabled: v })} label="Team chat" hint="Private chat per team, open for the whole game." />
          </section>
        )}

        <section className="card divide-y p-2">
          <Toggle checked={cfg.speedBonus} onChange={(v) => set({ speedBonus: v })} label="Speed bonus" hint="Faster correct answers earn more (down to 50% at the buzzer)." />
          <Toggle checked={cfg.streakBonus} onChange={(v) => set({ streakBonus: v })} label="Streak bonus" hint="+100 per consecutive correct answer, up to +500." />
          <Toggle checked={cfg.showLeaderboardEachQuestion} onChange={(v) => set({ showLeaderboardEachQuestion: v })} label="Leaderboard after every question" />
        </section>

        {err && <p className="rounded-xl bg-rose-600 px-4 py-2 font-bold" role="alert">{err}</p>}
        <button className="btn-primary w-full py-5 text-2xl" disabled={busy || problems.length > 0} onClick={start}>
          {busy ? 'Creating game…' : 'Create game & open lobby ▶'}
        </button>
      </main>
    </Screen>
  );
}
