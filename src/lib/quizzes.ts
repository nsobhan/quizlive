import { push, ref, remove, serverTimestamp, set, update } from 'firebase/database';
import { db } from './firebase';
import { P } from './paths';
import type { Question, Quiz } from '../types';

export const newQuestionId = () => Math.random().toString(36).slice(2, 10);

export function blankQuestion(type: Question['type'] = 'multiple'): Question {
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
    color: raw.color || '#7c3aed',
    ownerUid,
    questions: (raw.questions ?? []).map((q) => {
      const options = (Array.isArray(q.options) ? q.options : []).map(String).slice(0, 4);
      const correct = Array.isArray(q.correct) ? (q.correct as unknown[]).map(Number) : [0];
      return {
        id: typeof q.id === 'string' && q.id ? q.id : newQuestionId(),
        type: (q.type === 'truefalse' ? 'truefalse' : 'multiple') as Question['type'],
        text: String(q.text ?? ''),
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
    if (x.options.length < 2) errs.push(`${n}: needs at least 2 answers.`);
    if (x.options.some((o) => !o.trim())) errs.push(`${n}: fill in every answer (or remove empty ones).`);
    if (!x.correct.length) errs.push(`${n}: mark at least one correct answer.`);
  });
  return errs;
}
