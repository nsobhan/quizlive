import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FullScreenMessage, Logo, Screen, Spinner } from '../components/ui';
import { usePlayerSession } from '../hooks/usePlayerSession';
import { isNameTaken, joinGame, smallestTeam } from '../lib/game';
import { cleanName, randomName, validateName } from '../lib/names';
import { play } from '../lib/sound';

export default function Join() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { game, uid, state } = usePlayerSession(code, { redirectIfNotJoined: false });
  const [tab, setTab] = useState<'random' | 'custom'>('random');
  const [random, setRandom] = useState(randomName);
  const [custom, setCustom] = useState('');
  const [teamId, setTeamId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already in this game (e.g. page refresh) → straight back in.
  useEffect(() => {
    if (state === 'ok' && game) navigate(game.status === 'lobby' ? `/lobby/${code}` : `/play/${code}`, { replace: true });
  }, [state, game, code, navigate]);

  const teams = useMemo(() => Object.entries(game?.teams ?? {}), [game?.teams]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    Object.values(game?.players ?? {}).forEach((p) => p.teamId && (c[p.teamId] = (c[p.teamId] ?? 0) + 1));
    return c;
  }, [game?.players]);

  if (state === 'loading') return <Screen><Spinner /></Screen>;
  if (state === 'notfound')
    return (
      <FullScreenMessage emoji="🔍" title="Game not found">
        <p>There's no game with code <b>{code}</b>. Double-check the PIN on the host's screen.</p>
        <Link to="/" className="btn-dark">Try another code</Link>
      </FullScreenMessage>
    );
  if (state === 'expired')
    return (
      <FullScreenMessage emoji="⌛" title="Game expired">
        <p>This game code is no longer active.</p>
        <Link to="/" className="btn-dark">Back home</Link>
      </FullScreenMessage>
    );
  if (state === 'kicked')
    return (
      <FullScreenMessage emoji="🚪" title="You were removed">
        <p>The host removed you from this game.</p>
        <Link to="/" className="btn-dark">Back home</Link>
      </FullScreenMessage>
    );
  if (game?.status === 'ended')
    return (
      <FullScreenMessage emoji="🏁" title="This game has ended">
        <Link to={`/leaderboard/${code}`} className="btn-primary">See final results</Link>
      </FullScreenMessage>
    );
  if (!game || !uid) return null;

  const isTeam = game.config.mode === 'team';
  const assignment = game.config.teamAssignment;
  const name = cleanName(tab === 'random' ? random : custom);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!game || !uid) return;
    const v = validateName(name);
    if (v) return setErr(v);
    if (isTeam && assignment === 'choose' && !teamId) return setErr('Pick a team first.');
    setBusy(true);
    setErr(null);
    try {
      if (await isNameTaken(code, name, uid)) {
        setErr(tab === 'random' ? 'That name was just taken — rolled a new one!' : 'Someone already has that name. Try another.');
        if (tab === 'random') setRandom(randomName());
        return;
      }
      const tid = !isTeam ? '' : assignment === 'choose' ? teamId : assignment === 'auto' ? smallestTeam(game) : '';
      await joinGame(code, uid, name, tid);
      play('join');
      navigate(game.status === 'lobby' ? `/lobby/${code}` : `/play/${code}`, { replace: true });
    } catch (e) {
      console.error(e);
      setErr("Couldn't join. The name may be taken or the game closed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="flex flex-col items-center px-4 py-8">
      <Logo />
      <p className="mb-6 mt-2 text-white/80">
        Joining <b className="text-white">{game.quizTitle}</b> · PIN {code}
      </p>
      <motion.form onSubmit={submit} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card w-full max-w-md space-y-5 p-5">
        <div role="tablist" className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          {(['random', 'custom'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-3 py-2 font-bold transition ${tab === t ? 'bg-white text-violet-700 shadow' : 'text-slate-500'}`}
            >
              {t === 'random' ? '🎲 Random' : '✏️ My name'}
            </button>
          ))}
        </div>

        {tab === 'random' ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-2xl bg-violet-50 px-4 py-4 text-center font-display text-2xl font-bold text-violet-700" aria-live="polite">
              {random}
            </div>
            <button type="button" className="btn-light btn-sm h-14 w-14 text-2xl" onClick={() => { setRandom(randomName()); play('tap'); }} aria-label="Roll another random name">
              🎲
            </button>
          </div>
        ) : (
          <div>
            <label htmlFor="name" className="label">Your name</label>
            <input id="name" className="input text-xl" maxLength={20} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Sam" autoFocus autoComplete="nickname" />
          </div>
        )}

        {isTeam && assignment === 'choose' && (
          <fieldset>
            <legend className="label">Pick your team</legend>
            <div className="grid grid-cols-2 gap-2">
              {teams.map(([id, t]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTeamId(id)}
                  aria-pressed={teamId === id}
                  className={`flex items-center gap-2 rounded-2xl border-4 px-3 py-3 text-left font-bold transition ${teamId === id ? 'border-slate-900' : 'border-transparent'}`}
                  style={{ background: t.color + '22' }}
                >
                  <span className="h-5 w-5 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden />
                  <span className="flex-1 truncate">{t.name}</span>
                  <span className="text-sm text-slate-500">{counts[id] ?? 0}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {isTeam && assignment === 'auto' && <p className="text-center text-sm text-slate-500">You'll be placed on a team automatically.</p>}
        {isTeam && assignment === 'manual' && <p className="text-center text-sm text-slate-500">The host will put you on a team.</p>}

        {err && <p className="text-center text-sm font-bold text-rose-600" role="alert">{err}</p>}
        <button className="btn-dark w-full py-4 text-2xl" disabled={busy}>
          {busy ? 'Joining…' : "Let's go!"}
        </button>
        {game.status !== 'lobby' && <p className="text-center text-sm text-slate-500">The game has already started — you'll jump in from the current question.</p>}
      </motion.form>
    </Screen>
  );
}
