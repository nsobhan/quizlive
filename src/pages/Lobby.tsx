import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChatPanel } from '../components/ChatPanel';
import { Banner, FullScreenMessage, Logo, MuteToggle, Screen, Spinner } from '../components/ui';
import { usePlayerSession } from '../hooks/usePlayerSession';
import { leaveGame } from '../lib/game';

export default function Lobby() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { game, player, uid, state } = usePlayerSession(code);

  useEffect(() => {
    if (state === 'ok' && game && game.status !== 'lobby') navigate(`/play/${code}`, { replace: true });
  }, [state, game, code, navigate]);

  const players = useMemo(
    () => Object.entries(game?.players ?? {}).sort(([, a], [, b]) => a.joinedAt - b.joinedAt),
    [game?.players],
  );

  if (state === 'kicked') return <Kicked />;
  if (state === 'notfound') return <FullScreenMessage emoji="🔍" title="Game not found"><Link to="/" className="btn-dark">Home</Link></FullScreenMessage>;
  if (state !== 'ok' || !game || !player || !uid) return <Screen><Spinner /></Screen>;

  const isTeam = game.config.mode === 'team';
  const myTeam = player.teamId ? game.teams?.[player.teamId] : undefined;

  return (
    <Screen className="flex flex-col">
      {game.hostOnline === false && <Banner>Host disconnected — waiting for them to come back…</Banner>}
      <header className="flex items-center justify-between p-4">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <span className="chip bg-white/15">PIN {code}</span>
          <MuteToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-4 px-3 lg:px-4">
      <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col items-center px-1 pb-24 lg:pb-10">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 text-center">
          <p className="text-white/70">You're in as</p>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">{player.name}</h1>
          {isTeam && (
            <div className="mt-3 flex justify-center">
              {myTeam ? (
                <span className="chip px-4 py-2 text-lg text-white" style={{ background: myTeam.color }}>
                  {myTeam.name}
                  {myTeam.captainId === uid && game.config.teamAnswerRule === 'captain' && ' · 👑 Captain'}
                </span>
              ) : (
                <span className="chip bg-white/15 px-4 py-2">Waiting for a team assignment…</span>
              )}
            </div>
          )}
        </motion.div>

        <div className="my-10 flex flex-col items-center gap-3" aria-live="polite">
          <div className="flex gap-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="h-4 w-4 rounded-full bg-amber-300" animate={{ y: [0, -14, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
            ))}
          </div>
          <p className="font-display text-2xl">Waiting for host to start…</p>
          <p className="text-white/70">{game.quizTitle}</p>
        </div>

        <section className="card-glass w-full p-4">
          <h2 className="mb-3 font-display text-xl font-bold">{players.length} player{players.length === 1 ? '' : 's'} joined</h2>
          {isTeam ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(game.teams ?? {}).map(([tid, t]) => (
                <div key={tid} className="rounded-2xl bg-black/15 p-3">
                  <h3 className="mb-2 flex items-center gap-2 font-bold">
                    <span className="h-3 w-3 rounded-full" style={{ background: t.color }} aria-hidden />
                    {t.name}
                  </h3>
                  <PlayerChips players={players.filter(([, p]) => p.teamId === tid)} me={uid} />
                </div>
              ))}
              {players.some(([, p]) => !p.teamId) && (
                <div className="rounded-2xl bg-black/15 p-3">
                  <h3 className="mb-2 font-bold text-white/70">Unassigned</h3>
                  <PlayerChips players={players.filter(([, p]) => !p.teamId)} me={uid} />
                </div>
              )}
            </div>
          ) : (
            <PlayerChips players={players} me={uid} />
          )}
        </section>

        <button
          className="mt-6 text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
          onClick={async () => {
            await leaveGame(code, uid, player.name).catch(() => {});
            try { localStorage.removeItem('quizlive:lastGame'); } catch { /* ignore */ }
            navigate('/');
          }}
        >
          Leave game
        </button>
      </main>
      {isTeam && game.config.chatEnabled && myTeam && (
        <ChatPanel code={code} teamId={player.teamId} teamName={myTeam.name} teamColor={myTeam.color} uid={uid} name={player.name} />
      )}
      </div>
    </Screen>
  );
}

function PlayerChips({ players, me }: { players: [string, { name: string }][]; me: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      <AnimatePresence>
        {players.map(([id, p]) => (
          <motion.li
            key={id}
            layout
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={`rounded-full px-3 py-1 font-bold ${id === me ? 'bg-amber-300 text-slate-900' : 'bg-white/90 text-slate-900'}`}
          >
            {p.name}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

export function Kicked() {
  return (
    <FullScreenMessage emoji="🚪" title="You were removed">
      <p>The host removed you from this game.</p>
      <Link to="/" className="btn-dark">Back home</Link>
    </FullScreenMessage>
  );
}
