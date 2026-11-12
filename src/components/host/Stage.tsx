import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { AnswerTile } from '../AnswerTile';
import { CountdownRing } from '../CountdownRing';
import { DistributionChart } from '../DistributionChart';
import { useTimer } from '../../hooks/useTimer';
import { LeaderboardView } from '../../pages/Leaderboard';
import type { Game } from '../../types';

export const joinUrl = (code: string) => `${location.origin}${import.meta.env.BASE_URL}#/join/${code}`;

export function HostStage({ code, game, answeredCount, expectedCount }: { code: string; game: Game; answeredCount: number; expectedCount: number }) {
  const { remaining, total, paused } = useTimer(game);
  const q = game.question;
  const players = Object.entries(game.players ?? {}).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);

  if (game.status === 'lobby') {
    return (
      <div className="flex h-full flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-6 rounded-[2rem] bg-white p-6 text-slate-900 shadow-chunky md:flex-row md:gap-10 md:p-8">
          <div className="text-center md:text-left">
            <p className="text-lg font-bold text-slate-500">Join at <span className="text-violet-700">{location.host}{import.meta.env.BASE_URL}</span></p>
            <p className="text-lg font-bold text-slate-500">with Game PIN:</p>
            <p className="font-display text-7xl font-bold tracking-widest xl:text-8xl" aria-label={`Game PIN ${code.split('').join(' ')}`}>{code}</p>
          </div>
          <div className="rounded-2xl bg-white p-2 ring-4 ring-slate-100">
            <QRCodeSVG value={joinUrl(code)} size={180} level="M" aria-label="QR code to join the game" />
          </div>
        </div>
        <div className="w-full">
          <h2 className="mb-3 text-center font-display text-3xl font-bold">
            {players.length} player{players.length === 1 ? '' : 's'} {players.length ? 'ready' : '— waiting for players…'}
          </h2>
          <ul className="flex flex-wrap justify-center gap-3">
            <AnimatePresence>
              {players.map(([id, p]) => (
                <motion.li key={id} layout initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}
                  className="rounded-2xl bg-white/90 px-4 py-2 text-xl font-bold text-slate-900 shadow-chunky-sm"
                  style={p.teamId && game.teams?.[p.teamId] ? { boxShadow: `inset 0 -5px 0 ${game.teams[p.teamId].color}` } : undefined}>
                  {p.name}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    );
  }

  if (game.status === 'leaderboard' || game.status === 'ended') {
    return (
      <div>
        <h2 className="mb-4 text-center font-display text-4xl font-bold">{game.status === 'ended' ? '🏆 Final results' : 'Leaderboard'}</h2>
        <LeaderboardView game={game} code={code} isHost compact />
      </div>
    );
  }

  if (!q) return null;
  const reveal = game.status === 'reveal' && game.reveal?.index === game.currentQuestionIndex ? game.reveal : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <div className="card flex-1 p-6 text-center">
          <p className="mb-1 font-bold text-violet-600">
            Question {game.currentQuestionIndex + 1} of {game.totalQuestions}
            {game.status === 'discussion' && ' · 💬 Team discussion'}
          </p>
          <h1 className="text-3xl font-bold xl:text-5xl">{q.text}</h1>
        </div>
        {(game.status === 'question' || game.status === 'discussion') && <CountdownRing remaining={remaining} total={total} paused={paused} size={140} />}
      </div>

      <div className="flex items-center justify-center gap-6">
        {q.imageUrl && <img src={q.imageUrl} alt="" className="max-h-64 rounded-2xl object-contain" />}
        {game.status === 'question' && (
          <div className="rounded-3xl bg-white/10 px-8 py-4 text-center" aria-live="polite">
            <div className="font-display text-6xl font-bold">{answeredCount}<span className="text-white/50">/{expectedCount}</span></div>
            <div className="text-white/70">answered</div>
          </div>
        )}
        {reveal && <DistributionChart options={q.options} distribution={reveal.distribution} correct={reveal.correct} />}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {q.options.map((o, i) => (
          <AnswerTile key={i} index={i} label={o} size="xl" disabled
            state={reveal ? (reveal.correct.includes(i) ? 'correct' : 'dimmed') : 'idle'}
            count={reveal ? reveal.distribution[i] : undefined} />
        ))}
      </div>
      {reveal && <p className="text-center text-xl text-white/80">{reveal.answered} of {reveal.expected} answered</p>}
    </div>
  );
}
