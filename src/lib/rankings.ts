import type { Game } from '../types';

export interface RankEntry {
  id: string;
  name: string;
  score: number;
  color?: string;
  members?: { id: string; name: string; score: number }[];
}

export function playerRankings(game: Game): RankEntry[] {
  return Object.entries(game.players ?? {})
    .map(([id, p]) => ({ id, name: p.name, score: p.score ?? 0, color: game.teams?.[p.teamId]?.color }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function teamRankings(game: Game): RankEntry[] {
  const players = Object.entries(game.players ?? {});
  return Object.entries(game.teams ?? {})
    .map(([id, t]) => ({
      id,
      name: t.name,
      color: t.color,
      score: t.score ?? 0,
      members: players
        .filter(([, p]) => p.teamId === id)
        .map(([pid, p]) => ({ id: pid, name: p.name, score: p.score ?? 0 }))
        .sort((a, b) => b.score - a.score),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export const rankingsFor = (game: Game) => (game.config.mode === 'team' ? teamRankings(game) : playerRankings(game));
