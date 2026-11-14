import { push, ref, remove, serverTimestamp, set, update } from 'firebase/database';
import { db } from './firebase';
import { P } from './paths';
import type { Question, Quiz } from '../types';

export const newQuestionId = () => Math.random().toString(36).slice(2, 10);

export function blankQuestion(type: Question['type'] = 'multiple'): Question {
  if (type === 'text') {
    return { id: newQuestionId(), type, text: '', options: [], correct: [], answers: [''], fuzzy: true, timeLimit: 30, points: 1000 };
  }
  return {
    id: newQuestionId(),
    type,
    text: '',
    options: type === 'truefalse' ? ['True', 'False'] : ['', '', '', ''],
    correct: [0],
    timeLimit: 20,
    points: 1000,
  };
}

/** Normalise anything that looks like a quiz (e.g. an imported JSON file). */
export function normalizeQuiz(input: unknown, ownerUid: string): Omit<Quiz, 'createdAt' | 'updatedAt'> {
  const raw = (input ?? {}) as Partial<Omit<Quiz, 'questions'>> & { questions?: Partial<Record<keyof Question, unknown>>[] };
  if (typeof raw !== 'object' || (raw.questions && !Array.isArray(raw.questions))) throw new Error('Invalid quiz');
  return {
    title: String(raw.title || 'Untitled quiz').slice(0, 120),
    description: String(raw.description ?? ''),
    emoji: raw.emoji || '🧠',
    color: raw.color || '#0078d4',
    ownerUid,
    questions: (raw.questions ?? []).map((q) => {
      const type: Question['type'] = q.type === 'truefalse' ? 'truefalse' : q.type === 'text' ? 'text' : 'multiple';
      const options = type === 'text' ? [] : (Array.isArray(q.options) ? q.options : []).map(String).slice(0, 4);
      const correct = type === 'text' ? [] : Array.isArray(q.correct) ? (q.correct as unknown[]).map(Number) : [0];
      const answers = type === 'text' && Array.isArray(q.answers) ? (q.answers as unknown[]).map(String).filter(Boolean).slice(0, 10) : undefined;
      return {
        id: typeof q.id === 'string' && q.id ? q.id : newQuestionId(),
        type,
        ...(answers ? { answers, fuzzy: q.fuzzy !== false } : {}),
        text: String(q.text ?? '').replace(/\r\n?/g, '\n'),
        ...(typeof q.textSize === 'string' && ['s', 'm', 'l', 'xl'].includes(q.textSize) ? { textSize: q.textSize as Question['textSize'] } : {}),
        ...(q.imageUrl ? { imageUrl: String(q.imageUrl) } : {}),
        options,
        correct: correct.filter((i) => Number.isInteger(i) && i >= 0 && i < options.length),
        timeLimit: Number(q.timeLimit) || 20,
        points: Number(q.points) || 1000,
      };
    }),
  };
}

export async function createQuiz(data: Omit<Quiz, 'createdAt' | 'updatedAt'>): Promise<string> {
  const node = push(ref(db, P.quizzes()));
  await set(node, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return node.key!;
}

export async function saveQuiz(id: string, data: Omit<Quiz, 'createdAt' | 'updatedAt' | 'ownerUid'>) {
  // Strip undefined values (Firebase rejects them).
  const clean = JSON.parse(JSON.stringify(data));
  await update(ref(db, P.quiz(id)), { ...clean, updatedAt: serverTimestamp() });
}

export const deleteQuiz = (id: string) => remove(ref(db, P.quiz(id)));

export function validateQuiz(q: Pick<Quiz, 'title' | 'questions'>): string[] {
  const errs: string[] = [];
  if (!q.title.trim()) errs.push('The quiz needs a title.');
  if (!q.questions.length) errs.push('Add at least one question.');
  q.questions.forEach((x, i) => {
    const n = `Question ${i + 1}`;
    if (!x.text.trim()) errs.push(`${n}: missing question text.`);
    if (x.type === 'text') {
      if (!(x.answers ?? []).some((a) => a.trim())) errs.push(`${n}: add at least one accepted answer.`);
      return;
    }
    if (x.options.length < 2) errs.push(`${n}: needs at least 2 answers.`);
    if (x.options.some((o) => !o.trim())) errs.push(`${n}: fill in every answer (or remove empty ones).`);
    if (!x.correct.length) errs.push(`${n}: mark at least one correct answer.`);
  });
  return errs;
}
