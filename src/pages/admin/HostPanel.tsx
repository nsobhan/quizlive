import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HostStage, joinUrl } from '../../components/host/Stage';
import { ChatsPanel, PlayersPanel, ScoresPanel, TeamsPanel } from '../../components/host/Panels';
import { Banner, FullScreenMessage, Logo, MuteToggle, Screen, Spinner } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useGame } from '../../hooks/useGame';
import { useHostEngine } from '../../hooks/useHostEngine';
import { usePresence } from '../../hooks/usePresence';
import { serverNow, useConnected } from '../../hooks/useServerTime';
import { endGame, loadGameKey, nextStep, openQuestion, pauseTimer, resumeTimer, showLeaderboard, skipQuestion, finishQuestion } from '../../lib/game';
import { P } from '../../lib/paths';
import { play } from '../../lib/sound';
import type { Game, Question } from '../../types';

type Tab = 'players' | 'teams' | 'scores' | 'chats';

export default function HostPanel() {
  const { code = '' } = useParams();
  const { user } = useAuth();
  const { game, loading } = useGame(code);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const isHost = !!game && game.hostUid === user?.uid;

  useEffect(() => {
    if (isHost) loadGameKey(code).then(setQuestions).catch(() => setQuestions([]));
  }, [isHost, code]);

  usePresence(isHost ? `${P.game(code)}/hostOnline` : null);

  if (loading) return <Screen><Spinner /></Screen>;
  if (!game) return <FullScreenMessage emoji="🔍" title="Game not found"><Link to="/admin" className="btn-dark">Dashboard</Link></FullScreenMessage>;
  if (!isHost) return <FullScreenMessage emoji="🙅" title="Not your game"><p>Only the admin who created this game can host it.</p><Link to="/admin" className="btn-dark">Dashboard</Link></FullScreenMessage>;
  if (!questions) return <Screen><Spinner label="Loading questions…" /></Screen>;
  return <HostPanelInner code={code} game={game} questions={questions} />;
}

function HostPanelInner({ code, game, questions }: { code: string; game: Game; questions: Question[] }) {
  const { answeredCount, expectedCount } = useHostEngine(code, game, questions);
  const connected = useConnected();
  const isTeam = game.config.mode === 'team';
  const [tab, setTab] = useState<Tab>(isTeam && game.config.teamAssignment === 'manual' ? 'teams' : 'players');
  const [busy, setBusy] = useState(false);
  const playerCount = Object.keys(game.players ?? {}).length;
  const unassigned = isTeam ? Object.values(game.players ?? {}).filter((p) => !p.teamId).length : 0;
  const paused = !!game.timer?.pausedAt;
  const last = game.currentQuestionIndex >= questions.length - 1;

  const act = (fn: () => Promise<unknown>, sfx?: Parameters<typeof play>[0]) => async () => {
    setBusy(true);
    try {
      await fn();
      if (sfx) play(sfx);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const nextLabel =
    game.status === 'reveal'
      ? last ? 'Final results 🏆' : game.config.showLeaderboardEachQuestion ? 'Leaderboard ▶' : 'Next question ▶'
      : game.status === 'leaderboard'
        ? last ? 'Final results 🏆' : 'Next question ▶'
        : 'Next ▶';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'players', label: `Players (${playerCount})` },
    ...(isTeam ? [{ id: 'teams' as Tab, label: 'Teams' }] : []),
    { id: 'scores', label: 'Scores' },
    ...(isTeam ? [{ id: 'chats' as Tab, label: 'Chats' }] : []),
  ];

  return (
    <Screen className="flex flex-col">
      {!connected && <Banner>Connection lost — reconnecting…</Banner>}
      <header className="flex flex-wrap items-center gap-3 px-4 py-3 xl:px-6">
        <Link to="/admin" className="btn-ghost btn-sm">← Dashboard</Link>
        <Logo size="sm" link={false} />
        <span className="chip bg-white px-4 py-1.5 font-display text-2xl text-slate-900" aria-label={`Game PIN ${code}`}>PIN {code}</span>
        <span className="hidden truncate text-white/70 md:inline">{game.quizTitle}</span>
        <span className="flex-1" />
        <button className="btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(joinUrl(code))}>Copy join link</button>
        <a className="btn-ghost btn-sm" href={`#/leaderboard/${code}`} target="_blank" rel="noreferrer">Projector leaderboard ↗</a>
        <MuteToggle />
      </header>

      {/* ---- Control bar ---- */}
      <nav aria-label="Game controls" className="mx-4 flex flex-wrap items-center gap-2 rounded-2xl bg-black/20 p-2 xl:mx-6">
        <StatusPill game={game} />
        <span className="flex-1" />
        {game.status === 'lobby' && (
          <>
            {unassigned > 0 && <span className="text-sm text-amber-200">{unassigned} player(s) without a team</span>}
            <button className="btn-primary" disabled={busy || playerCount === 0} onClick={act(() => nextStep(code, game, questions, serverNow()), 'start')}>
              Start game ▶
            </button>
          </>
        )}
        {(game.status === 'question' || game.status === 'discussion') && (
          <>
            <button className="btn-light btn-sm" disabled={busy} onClick={act(() => (paused ? resumeTimer(code, game, serverNow()) : pauseTimer(code, serverNow())))}>
              {paused ? '▶ Resume' : '❚❚ Pause'}
            </button>
            {game.status === 'discussion' ? (
              <button className="btn-light btn-sm" disabled={busy} onClick={act(() => openQuestion(code, questions, game.currentQuestionIndex, serverNow()))}>Open answers now</button>
            ) : (
              <button className="btn-light btn-sm" disabled={busy} onClick={act(() => finishQuestion(code, game, questions))}>Stop & reveal</button>
            )}
            <button className="btn-dark btn-sm" disabled={busy} onClick={act(() => skipQuestion(code, game, questions, serverNow()))}>Skip question ⏭</button>
          </>
        )}
        {(game.status === 'reveal' || game.status === 'leaderboard') && (
          <>
            {game.status === 'reveal' && !game.config.showLeaderboardEachQuestion && !last && (
              <button className="btn-light btn-sm" disabled={busy} onClick={act(() => showLeaderboard(code))}>Show leaderboard</button>
            )}
            <button className="btn-primary" disabled={busy} onClick={act(() => nextStep(code, game, questions, serverNow()))}>{nextLabel}</button>
          </>
        )}
        {game.status !== 'ended' && game.status !== 'lobby' && (
          <button className="btn-danger btn-sm" disabled={busy} onClick={() => confirm('End the game now and show final results?') && act(() => endGame(code))()}>
            End game
          </button>
        )}
        {game.status === 'ended' && <Link to="/admin" className="btn-light btn-sm">Back to dashboard</Link>}
      </nav>

      <div className="grid flex-1 gap-4 p-4 xl:grid-cols-[1fr_400px] xl:p-6">
        <main className="min-w-0">
          <HostStage code={code} game={game} answeredCount={answeredCount} expectedCount={expectedCount} />
        </main>
        <aside className="card flex flex-col self-start p-3">
          <div role="tablist" className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
            {tabs.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-lg px-2 py-1.5 ${tab === t.id ? 'bg-white shadow' : 'text-slate-500'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="max-h-[70vh] overflow-y-auto">
            {tab === 'players' && <PlayersPanel code={code} game={game} />}
            {tab === 'teams' && <TeamsPanel code={code} game={game} />}
            {tab === 'scores' && <ScoresPanel code={code} game={game} />}
            {tab === 'chats' && <ChatsPanel code={code} game={game} />}
          </div>
        </aside>
      </div>
    </Screen>
  );
}

function StatusPill({ game }: { game: Game }) {
  const label: Record<Game['status'], string> = {
    lobby: '🟢 Lobby open',
    discussion: '💬 Discussion',
    question: '❓ Question live',
    reveal: '✅ Answer revealed',
    leaderboard: '📊 Leaderboard',
    ended: '🏁 Game over',
  };
  return (
    <span className="chip bg-white/15">
      {label[game.status]}
      {game.timer?.pausedAt ? ' · paused' : ''}
      {game.currentQuestionIndex >= 0 && game.status !== 'ended' && ` · Q${game.currentQuestionIndex + 1}/${game.totalQuestions}`}
    </span>
  );
}
