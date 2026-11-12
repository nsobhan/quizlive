import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnswerTile } from '../components/AnswerTile';
import { ChatPanel } from '../components/ChatPanel';
import { fireConfetti } from '../components/Confetti';
import { CountdownRing } from '../components/CountdownRing';
import { Banner, FullScreenMessage, MuteToggle, Screen, Spinner } from '../components/ui';
import { usePlayerSession } from '../hooks/usePlayerSession';
import { useTimer } from '../hooks/useTimer';
import { useValue } from '../hooks/useValue';
import { useConnected } from '../hooks/useServerTime';
import { submitAnswer } from '../lib/game';
import { P } from '../lib/paths';
import { playerRankings, rankingsFor } from '../lib/rankings';
import { play } from '../lib/sound';
import type { Answer, Game, Player, Result } from '../types';
import { Kicked } from './Lobby';

export default function Play() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { game, player, uid, state } = usePlayerSession(code);
  const connected = useConnected();

  useEffect(() => {
    if (state === 'ok' && game?.status === 'lobby') navigate(`/lobby/${code}`, { replace: true });
  }, [state, game?.status, code, navigate]);

  if (state === 'kicked') return <Kicked />;
  if (state === 'notfound') return <FullScreenMessage emoji="🔍" title="Game not found"><Link to="/" className="btn-dark">Home</Link></FullScreenMessage>;
  if (state !== 'ok' || !game || !player || !uid) return <Screen><Spinner /></Screen>;

  const isTeam = game.config.mode === 'team';
  const team = player.teamId ? game.teams?.[player.teamId] : undefined;
  const chatOn = isTeam && game.config.chatEnabled && !!team;

  return (
    <Screen className="flex flex-col">
      {!connected && <Banner>Reconnecting…</Banner>}
      {connected && game.hostOnline === false && game.status !== 'ended' && <Banner>Host disconnected — hang tight…</Banner>}
      <TopBar game={game} player={player} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-4 px-3 pb-24 lg:px-4 lg:pb-4">
        <main className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={`${game.status}-${game.currentQuestionIndex}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Stage code={code} game={game} player={player} uid={uid} />
            </motion.div>
          </AnimatePresence>
        </main>
        {chatOn && (
          <ChatPanel code={code} teamId={player.teamId} teamName={team!.name} teamColor={team!.color} uid={uid} name={player.name} />
        )}
      </div>
    </Screen>
  );
}

function TopBar({ game, player }: { game: Game; player: Player }) {
  const team = player.teamId ? game.teams?.[player.teamId] : undefined;
  return (
    <header className="flex items-center gap-2 px-3 py-3 sm:px-4">
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-lg font-bold">{player.name}</div>
        {team && (
          <div className="flex items-center gap-1 text-sm text-white/80">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: team.color }} aria-hidden /> {team.name}
          </div>
        )}
      </div>
      {game.status !== 'ended' && game.currentQuestionIndex >= 0 && (
        <span className="chip bg-white/15">
          Q {game.currentQuestionIndex + 1}/{game.totalQuestions}
        </span>
      )}
      <motion.span key={team && game.config.teamAnswerRule !== 'all' ? team.score : player.score} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="chip bg-amber-300 font-display text-lg text-slate-900">
        {(team && game.config.teamAnswerRule !== 'all' ? team.score : player.score).toLocaleString()}
      </motion.span>
      <MuteToggle />
    </header>
  );
}

function Stage({ code, game, player, uid }: { code: string; game: Game; player: Player; uid: string }) {
  const cfg = game.config;
  const isTeam = cfg.mode === 'team';
  const single = isTeam && cfg.teamAnswerRule !== 'all';
  const answerId = single ? player.teamId : uid;
  const qi = game.currentQuestionIndex;
  const q = game.question;
  const { remaining, total, paused } = useTimer(game);
  const myAnswer = useValue<Answer>(answerId && qi >= 0 ? P.answer(code, qi, answerId) : null);
  const [pending, setPending] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const team = player.teamId ? game.teams?.[player.teamId] : undefined;
  const isCaptain = team?.captainId === uid;
  const result: Result | undefined = answerId ? game.results?.[qi]?.[answerId] : undefined;

  useEffect(() => {
    setPending(null);
    setErr(null);
  }, [qi, game.status]);

  // Sound cues
  const prev = useRef(game.status);
  useEffect(() => {
    if (prev.current !== game.status) {
      if (game.status === 'question' || game.status === 'discussion') play('start');
      if (game.status === 'reveal') play(result?.correct ? 'correct' : 'wrong');
      if (game.status === 'ended') play('win');
      prev.current = game.status;
    }
  }, [game.status, result?.correct]);
  const secs = Math.ceil(remaining);
  useEffect(() => {
    if (game.status === 'question' && !paused && secs > 0 && secs <= 5) play('tick');
  }, [secs, game.status, paused]);

  if (game.status === 'ended') return <FinalStage code={code} game={game} uid={uid} />;
  if (game.status === 'leaderboard') return <RankStage game={game} uid={uid} />;
  if (!q) return <Spinner label="Get ready…" />;

  if (isTeam && !player.teamId) {
    return <Notice emoji="⏳" title="Waiting for a team" text="The host hasn't put you on a team yet." />;
  }

  const chosen = myAnswer?.option ?? pending;
  const canAnswer =
    game.status === 'question' && !paused && remaining > 0 && myAnswer == null && pending == null && (!single || cfg.teamAnswerRule === 'first' || isCaptain);

  async function answer(i: number) {
    if (!canAnswer || !answerId) return;
    setPending(i);
    play('tap');
    try {
      await submitAnswer(code, qi, answerId, uid, i);
    } catch {
      setPending(null);
      setErr(single ? 'A teammate already answered, or time ran out.' : 'Too late — time is up!');
    }
  }

  const reveal = game.status === 'reveal' && game.reveal?.index === qi ? game.reveal : null;
  const tileState = (i: number) => {
    if (reveal) return reveal.correct.includes(i) ? 'correct' : chosen === i ? 'wrong' : 'dimmed';
    if (chosen != null) return chosen === i ? 'selected' : 'dimmed';
    return 'idle';
  };
  const answeredByTeammate = single && myAnswer && myAnswer.by !== uid;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="card flex-1 p-4 sm:p-6">
          {game.status === 'discussion' && <p className="mb-1 font-bold text-violet-600">💬 Discuss with your team — answers open soon</p>}
          <h1 className="text-xl font-bold sm:text-3xl">{q.text}</h1>
        </div>
        {(game.status === 'question' || game.status === 'discussion') && <CountdownRing remaining={remaining} total={total} paused={paused} size={80} />}
      </div>
      {q.imageUrl && (
        <img src={q.imageUrl} alt="" className="mx-auto max-h-48 rounded-2xl object-contain sm:max-h-72" onError={(e) => (e.currentTarget.style.display = 'none')} />
      )}

      {paused && <Notice emoji="⏸️" title="Paused" text="The host paused the timer." />}

      {single && cfg.teamAnswerRule === 'captain' && !isCaptain && game.status === 'question' && !myAnswer && (
        <p className="rounded-2xl bg-white/10 p-3 text-center font-bold">👑 Your captain submits the team's answer — help them in chat!</p>
      )}
      {single && cfg.teamAnswerRule === 'first' && game.status === 'question' && !myAnswer && (
        <p className="rounded-2xl bg-white/10 p-3 text-center text-sm">⚡ One answer per team — the first teammate to tap locks it in.</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {q.options.map((o, i) => (
          <AnswerTile key={i} index={i} label={o} onClick={() => answer(i)} disabled={!canAnswer} state={tileState(i)} />
        ))}
      </div>

      {err && <p className="text-center font-bold text-rose-200" role="alert">{err}</p>}

      {game.status === 'question' && chosen != null && (
        <motion.p initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center font-display text-2xl">
          {answeredByTeammate ? `🔒 ${game.players?.[myAnswer!.by]?.name ?? 'A teammate'} locked in your team's answer` : '🔒 Answer locked in! Waiting for others…'}
        </motion.p>
      )}

      {reveal && <ResultCard result={result} single={single} />}
    </div>
  );
}

function ResultCard({ result, single }: { result?: Result; single: boolean }) {
  const ok = !!result?.correct;
  const none = !result || result.option == null;
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 14 }}
      className={`mx-auto max-w-md rounded-3xl p-6 text-center shadow-chunky ${ok ? 'bg-emerald-500' : 'bg-rose-600'}`}
      role="status"
    >
      <div className="text-5xl" aria-hidden>{ok ? '🎉' : none ? '⏰' : '😬'}</div>
      <h2 className="font-display text-4xl font-bold">{ok ? 'Correct!' : none ? "Time's up!" : 'Incorrect'}</h2>
      <p className="mt-2 font-display text-3xl">+{(result?.points ?? 0).toLocaleString()}</p>
      {ok && !!result?.streakBonus && <p className="mt-1 font-bold">🔥 Streak bonus +{result.streakBonus}</p>}
      {!ok && <p className="mt-1 text-white/80">{single ? "Your team's streak resets." : 'Streak reset — get the next one!'}</p>}
    </motion.div>
  );
}

function RankStage({ game, uid }: { game: Game; uid: string }) {
  const isTeam = game.config.mode === 'team';
  const ranks = rankingsFor(game);
  const myId = isTeam ? game.players?.[uid]?.teamId : uid;
  const idx = ranks.findIndex((r) => r.id === myId);
  const me = ranks[idx];
  const ahead = idx > 0 ? ranks[idx - 1] : null;
  return (
    <div className="flex flex-col items-center gap-6 pt-8 text-center">
      <p className="text-white/70">{isTeam ? 'Your team is' : 'You are'}</p>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="font-display text-8xl font-bold text-amber-300">
        #{idx + 1}
      </motion.div>
      <p className="font-display text-2xl">{me?.score.toLocaleString()} points</p>
      {ahead && <p className="text-white/80">{(ahead.score - (me?.score ?? 0)).toLocaleString()} points behind {ahead.name}</p>}
      {idx === 0 && <p className="text-xl font-bold">👑 In the lead!</p>}
    </div>
  );
}

function FinalStage({ code, game, uid }: { code: string; game: Game; uid: string }) {
  const isTeam = game.config.mode === 'team';
  const ranks = rankingsFor(game);
  const myId = isTeam ? game.players?.[uid]?.teamId : uid;
  const idx = ranks.findIndex((r) => r.id === myId);
  const indiv = playerRankings(game);
  const myIndiv = indiv.findIndex((r) => r.id === uid);
  const fired = useRef(false);
  useEffect(() => {
    if (!fired.current && idx >= 0 && idx < 3) {
      fired.current = true;
      fireConfetti();
    }
  }, [idx]);
  const medal = ['🥇', '🥈', '🥉'][idx] ?? '🏁';
  return (
    <div className="flex flex-col items-center gap-4 pt-8 text-center">
      <div className="text-7xl" aria-hidden>{medal}</div>
      <h1 className="font-display text-4xl font-bold">Game over!</h1>
      <p className="text-xl">
        {isTeam ? `${ranks[idx]?.name ?? 'Your team'} finished` : 'You finished'} <b className="text-amber-300">#{idx + 1}</b> of {ranks.length}
      </p>
      {isTeam && myIndiv >= 0 && <p className="text-white/80">Your personal score: {indiv[myIndiv].score.toLocaleString()}</p>}
      <div className="flex flex-wrap justify-center gap-2 pt-4">
        <Link to={`/leaderboard/${code}`} className="btn-primary">See full results</Link>
        <Link to="/" className="btn-ghost">Play another</Link>
      </div>
    </div>
  );
}

function Notice({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="card-glass mx-auto max-w-md p-6 text-center">
      <div className="text-4xl" aria-hidden>{emoji}</div>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="text-white/80">{text}</p>
    </div>
  );
}
