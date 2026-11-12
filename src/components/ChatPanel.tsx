import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sendChat } from '../lib/game';
import { filterProfanity } from '../lib/names';
import { P } from '../lib/paths';
import { useValue } from '../hooks/useValue';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { ChatMessage } from '../types';

interface Props {
  code: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  uid?: string;
  name?: string;
  readOnly?: boolean;
}

export function ChatMessages({ code, teamId, uid, compact }: { code: string; teamId: string; uid?: string; compact?: boolean }) {
  const raw = useValue<Record<string, ChatMessage>>(P.chat(code, teamId));
  const msgs = useMemo(() => Object.entries(raw ?? {}).sort(([, a], [, b]) => a.sentAt - b.sentAt), [raw]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [msgs.length]);
  return (
    <div className={`flex-1 space-y-2 overflow-y-auto ${compact ? 'p-2' : 'p-3'}`} aria-live="polite">
      {msgs.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No messages yet. Say hi 👋</p>}
      {msgs.map(([id, m]) => {
        const mine = m.playerId === uid;
        return (
          <div key={id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
            <span className="px-1 text-xs text-slate-400">
              {mine ? 'You' : m.name} · {new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={`max-w-[85%] break-words rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
              {filterProfanity(m.text)}
            </span>
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}

export function ChatPanel({ code, teamId, teamName, teamColor, uid, name, readOnly }: Props) {
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const desktop = useMediaQuery('(min-width: 1024px)');
  const raw = useValue<Record<string, ChatMessage>>(P.chat(code, teamId));
  const count = Object.keys(raw ?? {}).length;
  const seen = useRef(count);
  useEffect(() => {
    if (open || desktop) {
      seen.current = count;
      setUnread(0);
    } else setUnread(Math.max(0, count - seen.current));
  }, [count, open, desktop]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim().slice(0, 300);
    if (!t || !uid || !name) return;
    setErr(null);
    try {
      await sendChat(code, teamId, uid, name, filterProfanity(t));
      setText('');
    } catch {
      setErr("Couldn't send — check your connection and try again.");
    }
  }

  const body = (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-white text-slate-900 shadow-xl">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="h-3 w-3 rounded-full" style={{ background: teamColor }} aria-hidden />
        <h2 className="flex-1 font-display text-lg font-bold">{teamName} chat</h2>
        {!desktop && <button type="button" className="rounded-lg px-2 text-2xl" onClick={() => setOpen(false)} aria-label="Close chat">
          ×
        </button>}
      </div>
      <ChatMessages code={code} teamId={teamId} uid={uid} />
      {!readOnly && (
        <form onSubmit={submit} className="border-t p-2">
          {err && <p className="px-2 pb-1 text-xs text-rose-600">{err}</p>}
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="chat-input">Message your team</label>
            <input
              id="chat-input"
              className="input py-2"
              maxLength={300}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message your team…"
              autoComplete="off"
            />
            <button className="btn-purple btn-sm" disabled={!text.trim()}>Send</button>
          </div>
          <p className="px-2 pt-1 text-right text-xs text-slate-400">{text.length}/300</p>
        </form>
      )}
    </div>
  );

  // Desktop: side panel. Mobile: floating button + slide-up drawer. Only one is mounted.
  if (desktop) return <aside className="sticky top-4 h-[calc(100dvh-6rem)] min-h-[24rem] w-80 shrink-0">{body}</aside>;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-light fixed bottom-4 right-4 z-30 rounded-full px-4 shadow-xl"
        aria-label={`Open team chat${unread ? `, ${unread} new messages` : ''}`}
      >
        💬 Team
        {unread > 0 && <span className="rounded-full bg-rose-600 px-2 text-sm text-white">{unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 h-[70dvh] p-2"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              role="dialog"
              aria-label="Team chat"
            >
              {body}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
