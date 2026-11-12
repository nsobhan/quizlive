import type { GameConfig } from '../types';

export const TILE_STYLES = [
  { name: 'Red', shape: 'triangle', bg: 'bg-tile-red', fg: 'text-white', hex: '#d83b01' },
  { name: 'Blue', shape: 'diamond', bg: 'bg-tile-blue', fg: 'text-white', hex: '#0078d4' },
  { name: 'Yellow', shape: 'circle', bg: 'bg-tile-yellow', fg: 'text-slate-900', hex: '#ffb900' },
  { name: 'Green', shape: 'square', bg: 'bg-tile-green', fg: 'text-white', hex: '#107c10' },
] as const;

export const TEAM_PRESETS = [
  { name: 'Team A', color: '#d83b01' },
  { name: 'Team B', color: '#50e6ff' },
  { name: 'Team C', color: '#ffb900' },
  { name: 'Team D', color: '#6bb700' },
  { name: 'Team E', color: '#8764b8' },
  { name: 'Team F', color: '#e3008c' },
  { name: 'Team G', color: '#00b7c3' },
  { name: 'Team H', color: '#ca5010' },
];

export const TIME_LIMITS = [10, 20, 30, 60];
export const POINT_PRESETS = [500, 1000, 2000];

export const DEFAULT_CONFIG: GameConfig = {
  mode: 'individual',
  teamAssignment: 'choose',
  teamAnswerRule: 'all',
  discussionSeconds: 0,
  speedBonus: true,
  streakBonus: true,
  showLeaderboardEachQuestion: true,
  chatEnabled: true,
};

export const QUIZ_COLORS = ['#0078d4', '#d83b01', '#107c10', '#ffb900', '#5c2d91', '#008575', '#e3008c', '#004e8c'];
export const QUIZ_EMOJIS = ['🧠', '🚀', '🌍', '🎬', '🎵', '🔬', '⚽', '🍕', '📚', '🐾', '💡', '🎨'];

/** Games older than this (and not ended) are treated as expired. */
export const GAME_TTL_MS = 24 * 60 * 60 * 1000;
