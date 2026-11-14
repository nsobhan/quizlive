import { Reorder, useDragControls } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, ref } from 'firebase/database';
import { db } from '../../lib/firebase';
import { P } from '../../lib/paths';
import { blankQuestion, saveQuiz, validateQuiz } from '../../lib/quizzes';
import { POINT_PRESETS, QUIZ_COLORS, QUIZ_EMOJIS, TILE_STYLES, TIME_LIMITS } from '../../lib/constants';
import { FullScreenMessage, Logo, Screen, Segmented, Spinner, Toggle } from '../../components/ui';
import { QuestionText, TEXT_SIZE_OPTIONS } from '../../components/QuestionText';
import { Shape } from '../../components/Shape';
import type { Question, Quiz } from '../../types';

type Draft = Pick<Quiz, 'title' | 'description' | 'emoji' | 'color' | 'questions'>;

export default function QuizEditor() {
  const { quizId = '' } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [missing, setMissing] = useState(false);
  const [sel, setSel] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    get(ref(db, P.quiz(quizId))).then((s) => {
      if (!s.exists()) return setMissing(true);
      const q = s.val() as Quiz;
      setDraft({
        title: q.title ?? '',
        description: q.description ?? '',
        emoji: q.emoji ?? '🧠',
        color: q.color ?? QUIZ_COLORS[0],
        questions: (q.questions ?? []).map((x) => ({
          ...x,
          options: x.options ?? [],
          correct: x.correct ?? [],
          ...(x.type === 'text' ? { answers: x.answers?.length ? x.answers : [''], fuzzy: x.fuzzy ?? true } : {}),
        })),
      });
    });
  }, [quizId]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (missing) return <FullScreenMessage emoji="🤷" title="Quiz not found"><Link to="/admin" className="btn-dark">Back to dashboard</Link></FullScreenMessage>;
  if (!draft) return <Screen><Spinner /></Screen>;

  const errors = validateQuiz(draft);
  const change = (patch: Partial<Draft>) => {
    setDraft({ ...draft, ...patch });
    setDirty(true);
  };
  const setQ = (i: number, patch: Partial<Question>) => change({ questions: draft.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const addQ = (type: Question['type']) => {
    change({ questions: [...draft.questions, blankQuestion(type)] });
    setSel(draft.questions.length);
  };
  const removeQ = (i: number) => {
    if (!confirm('Delete this question?')) return;
    change({ questions: draft.questions.filter((_, j) => j !== i) });
    setSel(Math.max(0, Math.min(sel, draft.questions.length - 2)));
  };
  const duplicateQ = (i: number) => {
    const qs = [...draft.questions];
    qs.splice(i + 1, 0, { ...qs[i], id: blankQuestion().id });
    change({ questions: qs });
    setSel(i + 1);
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= draft.questions.length) return;
    const qs = [...draft.questions];
    [qs[i], qs[j]] = [qs[j], qs[i]];
    change({ questions: qs });
    setSel(j);
  };

  async function save(thenHost = false) {
    if (!draft) return;
    setSaving(true);
    try {
      await saveQuiz(quizId, draft);
      setDirty(false);
      setSavedAt(Date.now());
      if (thenHost) {
        if (errors.length) return setShowErrors(true);
        navigate(`/admin/quiz/${quizId}/host`);
      }
    } catch (e) {
      alert('Save failed: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const current = draft.questions[sel];
  const selectedId = current?.id;

  return (
    <Screen>
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 bg-brand-900/85 px-4 py-3 backdrop-blur sm:px-6">
        <Link to="/admin" className="btn-ghost btn-sm" onClick={(e) => dirty && !confirm('Discard unsaved changes?') && e.preventDefault()}>
          ← Quizzes
        </Link>
        <Logo size="sm" />
        <span className="flex-1" />
        <span className="text-sm text-white/70" aria-live="polite">
          {saving ? 'Saving…' : dirty ? 'Unsaved changes' : savedAt ? 'All changes saved ✓' : ''}
        </span>
        {errors.length > 0 && (
          <button className="chip bg-rose-600" onClick={() => setShowErrors((s) => !s)}>⚠ {errors.length} issue{errors.length > 1 ? 's' : ''}</button>
        )}
        <button className="btn-light btn-sm" onClick={() => save()} disabled={saving || !dirty}>Save</button>
        <button className="btn-primary btn-sm" onClick={() => save(true)} disabled={saving}>Save & host ▶</button>
      </header>

      {showErrors && errors.length > 0 && (
        <div className="mx-auto mt-4 max-w-6xl px-4">
          <ul className="rounded-2xl bg-rose-600 p-4 text-sm font-bold" role="alert">
            {errors.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        </div>
      )}

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[320px_1fr] sm:px-6">
        {/* ---- Left: quiz details + question list ---- */}
        <aside className="space-y-4">
          <section className="card space-y-3 p-4">
            <div>
              <label className="label" htmlFor="title">Quiz title</label>
              <input id="title" className="input" maxLength={120} value={draft.title} onChange={(e) => change({ title: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="desc">Description</label>
              <textarea id="desc" className="input min-h-[70px]" value={draft.description} onChange={(e) => change({ description: e.target.value })} />
            </div>
            <div>
              <span className="label">Cover</span>
              <div className="flex flex-wrap gap-1">
                {QUIZ_EMOJIS.map((em) => (
                  <button key={em} type="button" onClick={() => change({ emoji: em })} aria-pressed={draft.emoji === em}
                    className={`h-9 w-9 rounded-lg text-xl ${draft.emoji === em ? 'bg-brand-100 ring-2 ring-brand-500' : 'hover:bg-slate-100'}`}>
                    {em}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUIZ_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => change({ color: c })} aria-label={`Cover color ${c}`} aria-pressed={draft.color === c}
                    className={`h-7 w-7 rounded-full ${draft.color === c ? 'ring-4 ring-slate-900 ring-offset-2' : ''}`} style={{ background: c }} />
                ))}
              </div>
            </div>
          </section>

          <section className="card-glass p-3">
            <h2 className="mb-2 px-1 font-display text-lg font-bold">Questions ({draft.questions.length})</h2>
            <Reorder.Group axis="y" values={draft.questions} onReorder={(qs) => { change({ questions: qs }); setSel(Math.max(0, qs.findIndex((q) => q.id === selectedId))); }} className="space-y-2">
              {draft.questions.map((q, i) => (
                <QuestionRow key={q.id} q={q} i={i} active={i === sel} onSelect={() => setSel(i)} onMove={(d) => move(i, d)} last={i === draft.questions.length - 1} />
              ))}
            </Reorder.Group>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn-light btn-sm" onClick={() => addQ('multiple')}>+ Multiple choice</button>
              <button className="btn-light btn-sm" onClick={() => addQ('truefalse')}>+ True / False</button>
              <button className="btn-light btn-sm col-span-2" onClick={() => addQ('text')}>+ Type answer</button>
            </div>
          </section>
        </aside>

        {/* ---- Right: selected question ---- */}
        <section>
          {current ? (
            <QuestionForm
              key={current.id}
              q={current}
              index={sel}
              onChange={(p) => setQ(sel, p)}
              onDelete={() => removeQ(sel)}
              onDuplicate={() => duplicateQ(sel)}
            />
          ) : (
            <div className="card-glass p-10 text-center">
              <p className="text-5xl">➕</p>
              <p className="mt-2 font-display text-2xl">Add your first question</p>
            </div>
          )}
        </section>
      </main>
    </Screen>
  );
}

const TYPE_LABEL: Record<Question['type'], string> = { multiple: 'Multiple choice', truefalse: 'True/False', text: 'Type answer' };

function QuestionRow({ q, i, active, onSelect, onMove, last }: { q: Question; i: number; active: boolean; onSelect: () => void; onMove: (d: -1 | 1) => void; last: boolean }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={q} dragListener={false} dragControls={controls} className="list-none">
      <div className={`flex items-center gap-2 rounded-2xl p-2 ${active ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20'}`}>
        <button
          type="button"
          className="cursor-grab touch-none px-1 text-lg opacity-60 active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
          aria-label={`Drag to reorder question ${i + 1}`}
        >
          ⠿
        </button>
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <span className="block text-xs font-bold opacity-60">
            {i + 1} · {TYPE_LABEL[q.type]} · {q.timeLimit}s
          </span>
          <span className="block truncate font-bold">{q.text || <i className="opacity-60">Untitled question</i>}</span>
        </button>
        <div className="flex flex-col">
          <button type="button" className="px-1 text-xs opacity-60 hover:opacity-100 disabled:opacity-20" disabled={i === 0} onClick={() => onMove(-1)} aria-label="Move up">▲</button>
          <button type="button" className="px-1 text-xs opacity-60 hover:opacity-100 disabled:opacity-20" disabled={last} onClick={() => onMove(1)} aria-label="Move down">▼</button>
        </div>
      </div>
    </Reorder.Item>
  );
}

function QuestionForm({ q, index, onChange, onDelete, onDuplicate }: { q: Question; index: number; onChange: (p: Partial<Question>) => void; onDelete: () => void; onDuplicate: () => void }) {
  const customPoints = !POINT_PRESETS.includes(q.points);
  const setType = (type: Question['type']) => {
    if (type === q.type) return;
    if (type === 'text') {
      // Seed accepted answers from the currently-marked correct option(s), if any.
      const seeded = q.correct.map((i) => q.options[i]).filter((o) => o && o.trim() && q.type === 'multiple');
      return onChange({ type, options: [], correct: [], answers: seeded.length ? seeded : [''], fuzzy: q.fuzzy ?? true, timeLimit: Math.max(q.timeLimit, 30) });
    }
    const base = { answers: undefined, fuzzy: undefined };
    if (type === 'truefalse') onChange({ ...base, type, options: ['True', 'False'], correct: [q.correct[0] === 1 ? 1 : 0] });
    else onChange({ ...base, type, options: q.type === 'text' ? ['', '', '', ''] : [...q.options, '', ''].slice(0, 4), correct: q.type === 'text' ? [0] : q.correct });
  };
  const answers = q.answers ?? [''];
  const setAnswers = (a: string[]) => onChange({ answers: a });
  const toggleCorrect = (i: number) => {
    if (q.type === 'truefalse') return onChange({ correct: [i] });
    const has = q.correct.includes(i);
    onChange({ correct: has ? q.correct.filter((x) => x !== i) : [...q.correct, i].sort() });
  };
  const removeOption = (i: number) => {
    onChange({
      options: q.options.filter((_, j) => j !== i),
      correct: q.correct.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c)),
    });
  };

  return (
    <div className="card space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-2xl font-bold">Question {index + 1}</h2>
        <Segmented name="Question type" value={q.type} onChange={setType} options={[{ value: 'multiple', label: 'Multiple choice' }, { value: 'truefalse', label: 'True / False' }, { value: 'text', label: 'Type answer' }]} />
      </div>

      <div>
        <label className="label" htmlFor="qtext">Question <span className="font-normal opacity-60">— press Enter for a new line</span></label>
        <textarea id="qtext" className="input min-h-[110px] text-lg font-bold" rows={Math.min(8, Math.max(3, q.text.split('\n').length + 1))} maxLength={300} value={q.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Type your question…" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="label mb-0">Font size</span>
          <Segmented name="Font size" value={q.textSize ?? 'auto'} onChange={(v) => onChange({ textSize: v === 'auto' ? undefined : v })} options={TEXT_SIZE_OPTIONS} />
        </div>
        {q.text.trim() && (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide opacity-60">Preview on the big screen</p>
            <QuestionText text={q.text} size={q.textSize} variant="host" />
          </div>
        )}
      </div>

      <div>
        <label className="label" htmlFor="qimg">Image URL (optional)</label>
        <input id="qimg" className="input" type="url" value={q.imageUrl ?? ''} onChange={(e) => onChange({ imageUrl: e.target.value || undefined })} placeholder="https://…" />
        {q.imageUrl && <img src={q.imageUrl} alt="Question preview" className="mt-2 max-h-40 rounded-xl" onError={(e) => (e.currentTarget.style.opacity = '0.2')} />}
      </div>

      {q.type === 'text' ? (
        <fieldset className="space-y-3">
          <legend className="label">Accepted answers — players must type one of these</legend>
          <div className="space-y-2">
            {answers.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-center font-bold text-emerald-600" aria-hidden>✓</span>
                <label className="sr-only" htmlFor={`acc${i}`}>Accepted answer {i + 1}</label>
                <input
                  id={`acc${i}`}
                  className="input py-2 font-bold"
                  maxLength={100}
                  value={a}
                  placeholder={i === 0 ? 'e.g. Canberra' : 'Another accepted spelling or synonym'}
                  onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? e.target.value : x)))}
                />
                {answers.length > 1 && (
                  <button type="button" className="px-2 text-xl text-slate-400 hover:text-rose-600" onClick={() => setAnswers(answers.filter((_, j) => j !== i))} aria-label={`Remove accepted answer ${i + 1}`}>×</button>
                )}
              </div>
            ))}
          </div>
          {answers.length < 10 && (
            <button type="button" className="btn-light btn-sm border" onClick={() => setAnswers([...answers, ''])}>+ Add another accepted answer</button>
          )}
          <div className="rounded-2xl border">
            <Toggle checked={q.fuzzy !== false} onChange={(v) => onChange({ fuzzy: v })} label="Accept close spellings" hint="Allows 1–2 typos on longer answers (e.g. “Canbera”). Numbers and answers of 3 letters or fewer must still be exact." />
          </div>
          <p className="text-sm text-slate-500">Matching always ignores capital letters, accents, punctuation, extra spaces and a leading “the / a / an”. Numbers match by value (7 = 7.0).</p>
        </fieldset>
      ) : (
      <fieldset>
        <legend className="label">Answers — tick the correct one{q.type === 'multiple' ? '(s)' : ''}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {q.options.map((o, i) => {
            const s = TILE_STYLES[i];
            const ok = q.correct.includes(i);
            return (
              <div key={i} className={`flex items-center gap-2 rounded-2xl p-2 ${s.bg}`}>
                <Shape shape={s.shape} className={`h-7 w-7 shrink-0 ${s.fg}`} />
                <label className="sr-only" htmlFor={`opt${i}`}>{s.name} answer</label>
                <input
                  id={`opt${i}`}
                  className="min-w-0 flex-1 rounded-xl border-0 bg-white/95 px-3 py-2 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-white/60 read-only:bg-white/80"
                  value={o}
                  maxLength={120}
                  readOnly={q.type === 'truefalse'}
                  onChange={(e) => onChange({ options: q.options.map((x, j) => (j === i ? e.target.value : x)) })}
                  placeholder={`Answer ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => toggleCorrect(i)}
                  aria-pressed={ok}
                  aria-label={ok ? `${s.name} is correct` : `Mark ${s.name} as correct`}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white text-xl font-bold ${ok ? 'bg-white text-emerald-600' : 'bg-black/10 text-transparent hover:text-white/70'}`}
                >
                  ✓
                </button>
                {q.type === 'multiple' && q.options.length > 2 && (
                  <button type="button" className={`px-1 text-xl opacity-80 hover:opacity-100 ${s.fg}`} onClick={() => removeOption(i)} aria-label={`Remove ${s.name} answer`}>×</button>
                )}
              </div>
            );
          })}
        </div>
        {q.type === 'multiple' && q.options.length < 4 && (
          <button type="button" className="btn-light btn-sm mt-3 border" onClick={() => onChange({ options: [...q.options, ''] })}>+ Add answer</button>
        )}
      </fieldset>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <span className="label">Time limit</span>
          <Segmented name="Time limit" value={q.timeLimit} onChange={(v) => onChange({ timeLimit: v })} options={TIME_LIMITS.map((t) => ({ value: t, label: `${t}s` }))} />
        </div>
        <div>
          <span className="label">Points</span>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              name="Points"
              value={customPoints ? -1 : q.points}
              onChange={(v) => onChange({ points: v === -1 ? 750 : v })}
              options={[...POINT_PRESETS.map((p) => ({ value: p, label: String(p) })), { value: -1, label: 'Custom' }]}
            />
            {customPoints && (
              <input
                aria-label="Custom points"
                type="number"
                min={0}
                max={10000}
                step={50}
                className="input w-28 py-2"
                value={q.points}
                onChange={(e) => onChange({ points: Math.max(0, Math.min(10000, Number(e.target.value) || 0)) })}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <button type="button" className="btn-light btn-sm border" onClick={onDuplicate}>Duplicate</button>
        <button type="button" className="btn-danger btn-sm" onClick={onDelete}>Delete question</button>
      </div>
    </div>
  );
}
