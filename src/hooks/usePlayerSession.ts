import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAME_TTL_MS } from '../lib/constants';
import { P } from '../lib/paths';
import { useAuth } from './useAuth';
import { useGame } from './useGame';
import { usePresence } from './usePresence';

export const LAST_GAME_KEY = 'quizlive:lastGame';

export type SessionState = 'loading' | 'notfound' | 'expired' | 'kicked' | 'notjoined' | 'ok';

/** Shared by lobby & play screens: loads the game and this browser's player, handles rejoin & kicks. */
export function usePlayerSession(code: string | undefined, { redirectIfNotJoined = true } = {}) {
  const { user } = useAuth();
  const { game, loading } = useGame(code);
  const navigate = useNavigate();
  const uid = user?.uid;
  const player = uid ? game?.players?.[uid] : undefined;

  let state: SessionState = 'ok';
  if (loading || !user) state = 'loading';
  else if (!game) state = 'notfound';
  else if (uid && game.kicked?.[uid]) state = 'kicked';
  else if (!player && game.status !== 'ended' && Date.now() - game.createdAt > GAME_TTL_MS) state = 'expired';
  else if (!player) state = 'notjoined';

  usePresence(state === 'ok' && code && uid ? `${P.player(code, uid)}/online` : null);

  useEffect(() => {
    if (state === 'notjoined' && redirectIfNotJoined && game?.status !== 'ended') navigate(`/join/${code}`, { replace: true });
    if (state === 'ok' && code) {
      try {
        localStorage.setItem(LAST_GAME_KEY, code);
      } catch {
        /* ignore */
      }
    }
  }, [state, code, navigate, redirectIfNotJoined, game?.status]);

  return { game, player, uid, state };
}
