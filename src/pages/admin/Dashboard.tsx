import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useValueWithStatus } from '../../hooks/useValue';
import { Logo, Screen, Spinner } from '../../components/ui';
import { P } from '../../lib/paths';
import { createQuiz, deleteQuiz, downloadJson, jsonFileName, normalizeQuiz, quizToJson } from '../../lib/quizzes';
import type { Quiz } from '../../types';
import sample from '../../../seed/sample-quiz.json';

export const RECENT_GAMES_KEY = 'quizlive:hostedGames';
export function recentGames(): { code: string; title: string; at: number }[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_GAMES_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { value: quizzes, loading } = useValueWithStatus<Record<string, Quiz>>(P.quizzes());
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recent = useMemo(() => recentGames().slice(0, 5), []);

  const list = Object.entries(quizzes ?? {}).sort(([, a], [, b]) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  async function create(data: unknown) {
    return createQuiz(normalizeQuiz(data, user!.uid));
  }

  async function importFile(f: File) {
    try {
      const data = JSON.parse(await f.text());
      // A file from "Export all" holds { quizzes: [...] }; a bare array works too.
      const many = Array.isArray(data) ? data : Array.isArray(data?.quizzes) ? data.quizzes : null;
      if (many) {
        if (!many.length) throw new Error('empty');
        for (const q of many) await create(q);
        setMsg(`Imported ${many.length} quiz${many.length > 1 ? 'zes' : ''}.`);
        return;
      }
      const id = await create(data);
      navigate(`/admin/quiz/${id}`);
    } catch {
      setMsg("That file isn't a valid quiz JSON.");
    } finally {
      if (fileRef.current) fileRef.current.value = ''; // allow re-importing the same file
    }
  }

  function exportAll() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`quizlive-quizzes-${stamp}.json`, { quizzes: list.map(([, q]) => quizToJson(q)) });
  }

  return (
    <Screen>
      <header className="flex flex-wrap items-center gap-3 px-6 py-4">
        <Logo />
        <span className="chip bg-white/15">Admin</span>
        <span className="flex-1" />
        <span className="hidden text-sm text-white/70 sm:inline">{user?.email}</span>
        <button className="btn-ghost btn-sm" onClick={() => signOut(auth).then(() => navigate('/'))}>Sign out</button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="flex-1 font-display text-4xl font-bold">Your quizzes</h1>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>⬆ Import JSON</button>
          <button className="btn-ghost" onClick={exportAll} disabled={!list.length} title="Download every quiz as one JSON file">⬇ Export all</button>
          <button className="btn-ghost" onClick={async () => navigate(`/admin/quiz/${await create(sample)}`)}>✨ Add sample quiz</button>
          <button className="btn-primary" onClick={async () => navigate(`/admin/quiz/${await create({ title: 'Untitled quiz', questions: [] })}`)}>
            + New quiz
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        </div>
        {msg && <p className={`mb-4 rounded-xl px-4 py-2 font-bold ${msg.startsWith('Imported') ? 'bg-emerald-600' : 'bg-rose-600'}`} role="alert">{msg}</p>}

        {recent.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/70">Recent games:</span>
            {recent.map((g) => (
              <Link key={g.code} to={`/admin/host/${g.code}`} className="chip bg-white/15 hover:bg-white/25">
                {g.code} · {g.title}
              </Link>
            ))}
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <div className="card-glass p-10 text-center">
            <p className="text-5xl">📝</p>
            <p className="mt-2 font-display text-2xl">No quizzes yet</p>
            <p className="text-white/70">Create one, or add the sample quiz to try things out.</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(([id, q], i) => (
              <motion.li key={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card flex flex-col overflow-hidden">
                <div className="flex h-24 items-center justify-center text-5xl" style={{ background: q.color }} aria-hidden>
                  {q.emoji}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="text-xl font-bold">{q.title}</h2>
                  <p className="line-clamp-2 flex-1 text-sm text-slate-500">{q.description || 'No description'}</p>
                  <p className="mt-2 text-sm font-bold text-slate-400">{q.questions?.length ?? 0} questions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/admin/quiz/${id}/host`} className="btn-purple btn-sm" aria-disabled={!q.questions?.length}>▶ Host</Link>
                    <Link to={`/admin/quiz/${id}`} className="btn-light btn-sm border">Edit</Link>
                    <button className="btn-light btn-sm border" onClick={async () => { await create({ ...q, title: `${q.title} (copy)` }); setMsg(null); }}>
                      Duplicate
                    </button>
                    <button className="btn-light btn-sm border" onClick={() => downloadJson(jsonFileName(q.title), quizToJson(q))} aria-label={`Export ${q.title} as JSON`}>
                      ⬇ Export
                    </button>
                    <button
                      className="btn-light btn-sm border text-rose-600"
                      onClick={() => confirm(`Delete “${q.title}”? This can't be undone.`) && deleteQuiz(id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </main>
    </Screen>
  );
}
