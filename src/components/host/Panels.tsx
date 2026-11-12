import { useMemo, useState } from 'react';
import { adjustScore, assignTeam, autoAssignUnassigned, kickPlayer, setCaptain } from '../../lib/game';
import { P } from '../../lib/paths';
import { useValue } from '../../hooks/useValue';
import { ChatMessages } from '../ChatPanel';
import type { Game, ScoreLogEntry } from '../../types';

const sortedPlayers = (game: Game) => Object.entries(game.players ?? {}).sort(([, a], [, b]) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name));

// ---------------------------------------------------------------- Players
export function PlayersPanel({ code, game }: { code: string; game: Game }) {
  const players = sortedPlayers(game);
  if (!players.length) return <Empty text="No players yet." />;
  return (
    <ul className="space-y-1">
      {players.map(([id, p]) => {
        const t = game.teams?.[p.teamId];
        return (
          <li key={id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.online === false ? 'bg-slate-300' : 'bg-emerald-500'}`} title={p.online === false ? 'Offline' : 'Online'} aria-label={p.online === false ? 'Offline' : 'Online'} />
            <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
            {t && <span className="chip px-2 py-0 text-xs text-white" style={{ background: t.color }}>{t.name}</span>}
            {p.streak > 1 && <span className="text-xs" title="Streak">🔥{p.streak}</span>}
            <span className="w-14 text-right font-bold tabular-nums">{(p.score ?? 0).toLocaleString()}</span>
            <button className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50" onClick={() => confirm(`Remove ${p.name} from the game?`) && kickPlayer(code, id, p.name)} aria-label={`Kick ${p.name}`}>
              Kick
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- Teams (manual assignment, captains)
export function TeamsPanel({ code, game }: { code: string; game: Game }) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const teams = Object.entries(game.teams ?? {});
  const players = Object.entries(game.players ?? {}).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);
  const unassigned = players.filter(([, p]) => !p.teamId || !game.teams?.[p.teamId]);
  const captainMode = game.config.teamAnswerRule === 'captain';

  const column = (teamId: string, title: string, color: string | undefined, members: typeof players, score?: number) => (
    <div
      key={teamId || 'none'}
      onDragOver={(e) => { e.preventDefault(); setOver(teamId); }}
      onDragLeave={() => setOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(null);
        const uid = e.dataTransfer.getData('text/plain');
        if (uid && teamId) assignTeam(code, uid, teamId);
        setDragging(null);
      }}
      className={`rounded-2xl border-2 p-2 transition ${over === teamId && dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-100 bg-slate-50'}`}
    >
      <h3 className="mb-1 flex items-center gap-2 px-1 font-bold">
        {color && <span className="h-3 w-3 rounded-full" style={{ background: color }} aria-hidden />}
        <span className="flex-1">{title}</span>
        <span className="text-xs text-slate-400">{members.length} 👤{score !== undefined && ` · ${score.toLocaleString()} pts`}</span>
      </h3>
      <ul className="min-h-[2rem] space-y-1">
        {members.map(([id, p]) => {
          const isCaptain = game.teams?.[p.teamId]?.captainId === id;
          return (
            <li key={id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', id); setDragging(id); }} onDragEnd={() => setDragging(null)}
              className="flex cursor-grab items-center gap-1 rounded-xl bg-white px-2 py-1 text-sm shadow-sm active:cursor-grabbing">
              <span aria-hidden className="text-slate-300">⠿</span>
              <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
              {captainMode && teamId && (
                <button className={`px-1 ${isCaptain ? '' : 'opacity-25 hover:opacity-70'}`} onClick={() => setCaptain(code, teamId, id)}
                  aria-label={isCaptain ? `${p.name} is captain` : `Make ${p.name} captain`} aria-pressed={isCaptain} title="Captain">👑</button>
              )}
              <label className="sr-only" htmlFor={`team-${id}`}>Move {p.name} to team</label>
              <select id={`team-${id}`} className="rounded-lg border bg-white px-1 py-0.5 text-xs" value={p.teamId && game.teams?.[p.teamId] ? p.teamId : ''}
                onChange={(e) => e.target.value && assignTeam(code, id, e.target.value)}>
                <option value="" disabled>Move…</option>
                {teams.map(([tid, t]) => <option key={tid} value={tid}>{t.name}</option>)}
              </select>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Drag players between teams, or use the menu.{captainMode && ' 👑 = team captain (only they can answer).'}</p>
      {unassigned.length > 0 && (
        <>
          {column('', 'Unassigned', undefined, unassigned)}
          <button className="btn-purple btn-sm w-full" onClick={() => autoAssignUnassigned(code, game)}>Auto-assign {unassigned.length} unassigned</button>
        </>
      )}
      {teams.map(([tid, t]) => column(tid, t.name, t.color, players.filter(([, p]) => p.teamId === tid), t.score))}
    </div>
  );
}

// ---------------------------------------------------------------- Scores
export function ScoresPanel({ code, game }: { code: string; game: Game }) {
  const isTeam = game.config.mode === 'team';
  const [targetType, setTargetType] = useState<'player' | 'team'>(isTeam ? 'team' : 'player');
  const [target, setTarget] = useState('');
  const [delta, setDelta] = useState(100);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const logRaw = useValue<Record<string, ScoreLogEntry>>(P.scoreLog(code));
  const log = useMemo(() => Object.entries(logRaw ?? {}).sort(([, a], [, b]) => b.at - a.at), [logRaw]);
  const options = targetType === 'team' ? Object.entries(game.teams ?? {}).map(([id, t]) => [id, t.name] as const) : sortedPlayers(game).map(([id, p]) => [id, p.name] as const);

  async function apply(sign: 1 | -1) {
    if (!target || !delta) return;
    setBusy(true);
    try {
      await adjustScore(code, game, targetType, target, sign * Math.abs(delta), reason.trim());
      setReason('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {isTeam && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
          {(['team', 'player'] as const).map((t) => (
            <button key={t} onClick={() => { setTargetType(t); setTarget(''); }} className={`rounded-lg py-1 ${targetType === t ? 'bg-white shadow' : 'text-slate-500'}`} aria-pressed={targetType === t}>
              {t === 'team' ? 'Team' : 'Player'}
            </button>
          ))}
        </div>
      )}
      <label className="sr-only" htmlFor="adj-target">Who</label>
      <select id="adj-target" className="input py-2" value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">Choose {targetType}…</option>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="adj-delta">Points</label>
        <input id="adj-delta" type="number" min={1} step={50} className="input w-28 py-2" value={delta} onChange={(e) => setDelta(Math.abs(Number(e.target.value) || 0))} />
        {[100, 500].map((n) => (
          <button key={n} className="rounded-xl bg-slate-100 px-2 text-sm font-bold hover:bg-slate-200" onClick={() => setDelta(n)}>{n}</button>
        ))}
      </div>
      <label className="sr-only" htmlFor="adj-reason">Reason</label>
      <input id="adj-reason" className="input py-2" maxLength={200} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-danger btn-sm" disabled={busy || !target} onClick={() => apply(-1)}>− {delta}</button>
        <button className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-500" disabled={busy || !target} onClick={() => apply(1)}>+ {delta}</button>
      </div>
      <h3 className="pt-2 text-sm font-bold uppercase text-slate-400">Adjustment log</h3>
      {log.length === 0 ? (
        <Empty text="No manual adjustments yet." />
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {log.map(([id, l]) => (
            <li key={id} className="rounded-lg bg-slate-50 px-2 py-1">
              <b className={l.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{l.delta >= 0 ? '+' : ''}{l.delta}</b> {l.targetName}
              {l.reason && <span className="text-slate-500"> — {l.reason}</span>}
              <span className="float-right text-xs text-slate-400">{new Date(l.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Chats (read-only)
export function ChatsPanel({ code, game }: { code: string; game: Game }) {
  const teams = Object.entries(game.teams ?? {});
  const [teamId, setTeamId] = useState(teams[0]?.[0] ?? '');
  if (!game.config.chatEnabled) return <Empty text="Team chat is disabled for this game." />;
  return (
    <div className="flex h-[28rem] flex-col">
      <div className="mb-2 flex flex-wrap gap-1">
        {teams.map(([id, t]) => (
          <button key={id} onClick={() => setTeamId(id)} aria-pressed={teamId === id}
            className={`chip text-xs ${teamId === id ? 'text-white' : 'bg-slate-100 text-slate-600'}`} style={teamId === id ? { background: t.color } : undefined}>
            {t.name}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-white">
        {teamId && <ChatMessages key={teamId} code={code} teamId={teamId} compact />}
      </div>
      <p className="mt-1 text-xs text-slate-400">Read-only view.</p>
    </div>
  );
}

const Empty = ({ text }: { text: string }) => <p className="py-6 text-center text-sm text-slate-400">{text}</p>;
