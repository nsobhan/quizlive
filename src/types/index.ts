// ---------- Quizzes (admin-only, /quizzes/{quizId}) ----------
/** multiple = 2–4 choices, truefalse = True/False, text = players type their answer */
export type QuestionType = 'multiple' | 'truefalse' | 'text';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  options: string[]; // 2–4 (empty for text questions)
  correct: number[]; // indexes into options (one or more; empty for text questions)
  /** text questions: accepted answers (any one matches) */
  answers?: string[];
  /** text questions: tolerate small typos */
  fuzzy?: boolean;
  timeLimit: number; // seconds
  points: number; // base points
}

export interface Quiz {
  title: string;
  description: string;
  emoji: string;
  color: string;
  ownerUid: string;
  createdAt: number;
  updatedAt: number;
  questions: Question[];
}

// ---------- Games (/games/{code}) ----------
export type GameStatus = 'lobby' | 'discussion' | 'question' | 'reveal' | 'leaderboard' | 'ended';
export type GameMode = 'individual' | 'team';
export type TeamAssignment = 'choose' | 'auto' | 'manual';
/** all = every member answers, team score is the sum; first/captain = one answer per team */
export type TeamAnswerRule = 'all' | 'first' | 'captain';

export interface GameConfig {
  mode: GameMode;
  teamAssignment: TeamAssignment;
  teamAnswerRule: TeamAnswerRule;
  discussionSeconds: number;
  speedBonus: boolean;
  streakBonus: boolean;
  showLeaderboardEachQuestion: boolean;
  chatEnabled: boolean;
}

export interface Player {
  name: string;
  teamId: string; // '' when not on a team
  score: number;
  streak: number;
  joinedAt: number;
  online?: boolean;
}

export interface Team {
  name: string;
  color: string;
  score: number;
  streak: number;
  captainId?: string;
}

/** The question as published to players: no answer key. */
export interface PublicQuestion {
  index: number;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  options: string[];
  timeLimit: number;
  points: number;
}

export interface PauseSpan {
  from: number;
  to: number;
}

export interface Timer {
  discussionEndsAt?: number;
  startedAt?: number; // question phase start (server ms)
  endsAt?: number; // question phase end (server ms), shifted on resume
  pausedAt?: number | null;
  pauses?: PauseSpan[];
}

export interface TopAnswer {
  text: string;
  count: number;
  correct: boolean;
}

export interface Reveal {
  index: number;
  correct: number[];
  distribution: number[];
  /** text questions: accepted answers and the most common submissions */
  accepted?: string[];
  top?: TopAnswer[];
  answered: number;
  expected: number;
}

export interface Result {
  option: number | null;
  text?: string;
  correct: boolean;
  points: number;
  streakBonus: number;
  by?: string;
}

export interface Game {
  quizId: string;
  quizTitle: string;
  hostUid: string;
  hostOnline?: boolean;
  createdAt: number;
  status: GameStatus;
  config: GameConfig;
  totalQuestions: number;
  currentQuestionIndex: number;
  question?: PublicQuestion | null;
  timer?: Timer | null;
  reveal?: Reveal | null;
  players?: Record<string, Player>;
  teams?: Record<string, Team>;
  names?: Record<string, string>;
  kicked?: Record<string, boolean>;
  results?: Record<string, Record<string, Result>>; // results/{qIndex}/{playerId|teamId}
}

// ---------- Separate top-level trees (see README "Data model") ----------
/** /answers/{code}/{qIndex}/{playerId|teamId} */
export interface Answer {
  option?: number; // choice questions
  text?: string; // text questions
  answeredAt: number;
  by: string;
}

/** /chats/{code}/{teamId}/{msgId} */
export interface ChatMessage {
  playerId: string;
  name: string;
  text: string;
  sentAt: number;
}

/** /scoreLog/{code}/{id} */
export interface ScoreLogEntry {
  targetType: 'player' | 'team';
  target: string;
  targetName: string;
  delta: number;
  reason: string;
  at: number;
}
