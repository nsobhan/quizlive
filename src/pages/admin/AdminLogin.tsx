import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Logo, Screen } from '../../components/ui';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/admin';

  useEffect(() => {
    if (user && !user.isAnonymous && isAdmin) navigate(from, { replace: true });
  }, [user, isAdmin, from, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate(from, { replace: true });
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setErr(
        code.includes('invalid') || code.includes('wrong-password') || code.includes('user-not-found')
          ? 'Wrong email or password.'
          : code.includes('too-many')
            ? 'Too many attempts — try again in a minute.'
            : 'Sign-in failed. Is Email/Password auth enabled in Firebase?',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="flex flex-col items-center justify-center px-4">
      <Logo />
      <form onSubmit={submit} className="card mt-6 w-full max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-bold">Admin login</h1>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <p className="text-sm font-bold text-rose-600" role="alert">{err}</p>}
        <button className="btn-purple w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="text-center text-sm text-slate-500">
          <Link to="/" className="underline">Back to game</Link>
        </p>
      </form>
    </Screen>
  );
}
