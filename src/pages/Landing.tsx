import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get, ref } from 'firebase/database';
import { Logo, MuteToggle, Screen } from '../components/ui';
import { Shape } from '../components/Shape';
import { LAST_GAME_KEY } from '../hooks/usePlayerSession';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { P } from '../lib/paths';
import type { Game } from '../types';

export default function Landing() {
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejoin, setRejoin] = useState<{ code: string; title: string } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Offer to rejoin the last game this browser played, if it's still running.
  useEffect(() => {
    if (!user) return;
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_GAME_KEY);
    } catch {
      /* ignore */
    }
    if (!last) return;
    get(ref(db, P.game(last)))
      .then((s) => {
        const g = s.val() as Game | null;
        if (g && g.status !== 'ended' && g.players?.[user.uid]) setRejoin({ code: last!, title: g.quizTitle });
      })
      .catch(() => {});
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setErr('Game codes are 6 digits.');
    setBusy(true);
    setErr(null);
    try {
      const s = await get(ref(db, `${P.game(code)}/status`));
      if (!s.exists()) setErr("We couldn't find that game. Check the code?");
      else navigate(`/join/${code}`);
    } catch {
      setErr('Connection problem, please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="relative flex flex-col overflow-hidden">
      <FloatingShapes />
      <header className="relative z-10 flex items-center justify-between p-4">
        <span />
        <MuteToggle />
      </header>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8 text-center">
          <Logo size="xl" link={false} />
          <p className="mt-2 text-lg text-white/80">Live quizzes, played together.</p>
        </motion.div>
        <motion.form
          onSubmit={submit}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="card w-full max-w-sm space-y-3 p-5"
        >
          <label htmlFor="code" className="sr-only">Game code</label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Game PIN"
            className="input text-center font-display text-3xl font-bold tracking-[0.3em] placeholder:tracking-normal"
          />
          {err && <p className="text-center text-sm font-bold text-rose-600" role="alert">{err}</p>}
          <button className="btn-dark w-full py-4 text-2xl" disabled={busy || code.length !== 6}>
            {busy ? 'Checking…' : 'Join'}
          </button>
        </motion.form>
        {rejoin && (
          <Link to={`/lobby/${rejoin.code}`} className="btn-primary mt-4">
            ↩ Rejoin “{rejoin.title}” ({rejoin.code})
          </Link>
        )}
      </main>
      <footer className="relative z-10 p-4 text-center">
        <Link to="/admin/login" className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline">
          Admin Login
        </Link>
      </footer>
    </Screen>
  );
}

function FloatingShapes() {
  const items = [
    { s: 'triangle', c: 'text-tile-red', x: '8%', y: '15%', d: 0 },
    { s: 'diamond', c: 'text-tile-blue', x: '85%', y: '20%', d: 1 },
    { s: 'circle', c: 'text-amber-400', x: '12%', y: '75%', d: 2 },
    { s: 'square', c: 'text-tile-green', x: '80%', y: '70%', d: 1.5 },
  ] as const;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {items.map((it, i) => (
        <motion.div
          key={i}
          className={`absolute opacity-30 ${it.c}`}
          style={{ left: it.x, top: it.y }}
          animate={{ y: [0, -18, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 6, repeat: Infinity, delay: it.d, ease: 'easeInOut' }}
        >
          <Shape shape={it.s} className="h-16 w-16 sm:h-24 sm:w-24" />
        </motion.div>
      ))}
    </div>
  );
}
