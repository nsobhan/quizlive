import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fireConfetti } from '../components/Confetti';
import { Podium, RankList } from '../components/Leaderboard';
import { FullScreenMessage, Logo, MuteToggle, Screen, Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useGame } from '../hooks/useGame';
import { downloadCsv } from '../lib/csv';
import { playerRankings, rankingsFor } from '../lib/rankings';
import { play } from '../lib/sound';
import type { Game } from '../types';

export default function LeaderboardPage() {
  const { code = '' } = useParams();
  const { game, loading } = useGame(code);
  const { user } = useAuth();
  if (loading) return <Screen><Spinner /></Screen>;
  if (!game)
    return (
      <FullScreenMessage emoji="🔍" title="Game not found">
        <Link to="/" className="btn-dark">Home</Link>
      </FullScreenMessage>
    );
  return (
    <Screen className="flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <Logo />
        <div className="flex-1 text-center">
          <div className="font-display text-2xl font-bold sm:text-3xl">{game.quizTitle}</div>
          <div className="text-white/70">
            {game.status === 'ended' ? 'Final results' : game.currentQuestionIndex >= 0 ? `Question ${game.currentQuestionIndex + 1} of ${game.totalQuestions}` : 'Waiting to start'}
          </div>
        </div>
        <span className="chip hidden bg-white/15 px-4 py-2 text-xl sm:inline-flex">PIN {code}</span>
        <MuteToggle />
      </header>
      <LeaderboardView game={game} code={code} isHost={user?.uid === game.hostUid} />
    </Screen>
  );
}

export function LeaderboardView({ game, code, isHost, compact }: { game: Game; code: string; isHost?: boolean; compact?: boolean }) {
  const isTeam = game.config.mode === 'team';
  const ranks = rankingsFor(game);
  const ended = game.status === 'ended';
  const leader = ranks[0];
  const fired = useRef(false);

  useEffect(() => {
    if (ended && !fired.current && ranks.length) {
      fired.current = true;
      fireConfetti(5000);
      play('win');
    }
  }, [ended, ranks.length]);

  function exportCsv() {
    const players = playerRankings(game);
    const rows: (string | number)[][] = [['Rank', 'Player', ...(isTeam ? ['Team'] : []), 'Score', ...(isTeam ? ['Team score'] : [])]];
    players.forEach((p, i) => {
      const pl = game.players![p.id];
      const t = game.teams?.[pl.teamId];
      rows.push([i + 1, p.name, ...(isTeam ? [t?.name ?? ''] : []), p.score, ...(isTeam ? [t?.score ?? 0] : [])]);
    });
    downloadCsv(`quizlive-${code}-results.csv`, rows);
  }

  if (!ranks.length) {
    return <p className="p-12 text-center font-display text-3xl text-white/70">No {isTeam ? 'teams' : 'players'} yet — join with PIN {code}</p>;
  }

  return (
    <div className={`mx-auto w-full flex-1 px-4 pb-8 ${compact ? 'max-w-4xl' : 'max-w-6xl'}`}>
      <AnimatePresence mode="wait">
        {leader && leader.score > 0 && (
          <motion.div
            key={leader.id}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="mx-auto mb-6 w-fit rounded-full bg-gradient-to-r from-accent-300 to-yellow-200 px-6 py-2 text-center font-display text-xl font-bold text-slate-900 shadow-chunky sm:text-2xl"
            role="status"
          >
            {ended ? '🏆 Winner' : '👑 Live leader'}: {leader.name} · {leader.score.toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <Podium entries={ranks.slice(0, 3)} big={!compact} />
      </div>

      {ranks.length > 3 && <RankList entries={ranks} start={3} max={ended ? undefined : 12} big={!compact} expandable={isTeam} />}
      {isTeam && (
        <details className="mt-6 rounded-2xl bg-white/10 p-4">
          <summary className="cursor-pointer font-display text-xl font-bold">Team members breakdown</summary>
          <div className="mt-3">
            <RankList entries={ranks} expandable />
          </div>
        </details>
      )}

      {ended && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Full results</h2>
            {isHost && <button className="btn-primary btn-sm" onClick={exportCsv}>⬇ Export CSV</button>}
          </div>
          <div className="overflow-x-auto rounded-2xl bg-white text-slate-900">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-sm uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Player</th>
                  {isTeam && <th className="px-4 py-2">Team</th>}
                  <th className="px-4 py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {playerRankings(game).map((p, i) => {
                  const t = game.teams?.[game.players![p.id].teamId];
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-2 font-bold">{i + 1}</td>
                      <td className="px-4 py-2">{p.name}</td>
                      {isTeam && (
                        <td className="px-4 py-2">
                          {t && <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: t.color }} />}
                          {t?.name ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-2 text-right font-bold tabular-nums">{p.score.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
