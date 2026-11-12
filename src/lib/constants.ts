import type { GameConfig } from '../types';

export const TILE_STYLES = [
  { name: 'Red', shape: 'triangle', bg: 'bg-tile-red', hex: '#e21b3c' },
  { name: 'Blue', shape: 'diamond', bg: 'bg-tile-blue', hex: '#1368ce' },
  { name: 'Yellow', shape: 'circle', bg: 'bg-tile-yellow', hex: '#c79200' },
  { name: 'Green', shape: 'square', bg: 'bg-tile-green', hex: '#26890c' },
] as const;

export const TEAM_PRESETS = [
  { name: 'Team A', color: '#ef4444' },
  { name: 'Team B', color: '#3b82f6' },
  { name: 'Team C', color: '#eab308' },
  { name: 'Team D', color: '#22c55e' },
  { name: 'Team E', color: '#a855f7' },
  { name: 'Team F', color: '#f97316' },
  { name: 'Team G', color: '#14b8a6' },
  { name: 'Team H', color: '#ec4899' },
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

export const QUIZ_COLORS = ['#7c3aed', '#2563eb', '#db2777', '#059669', '#ea580c', '#0891b2', '#ca8a04', '#4f46e5'];
export const QUIZ_EMOJIS = ['🧠', '🚀', '🌍', '🎬', '🎵', '🔬', '⚽', '🍕', '📚', '🐾', '💡', '🎨'];

/** Games older than this (and not ended) are treated as expired. */
export const GAME_TTL_MS = 24 * 60 * 60 * 1000;
