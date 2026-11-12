import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '../lib/firebase';
import { P } from '../lib/paths';
import type { Game } from '../types';
import { useAuth } from './useAuth';

export function useGame(code: string | undefined) {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !user) return;
    setLoading(true);
    return onValue(
      ref(db, P.game(code)),
      (s) => {
        setGame(s.exists() ? (s.val() as Game) : null);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
  }, [code, user]);

  return { game, loading, error };
}
