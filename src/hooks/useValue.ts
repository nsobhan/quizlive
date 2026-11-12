import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '../lib/firebase';

/** Subscribe to any database path and also report whether the first snapshot has arrived. */
export function useValueWithStatus<T>(path: string | null): { value: T | null; loading: boolean; error: boolean } {
  const [state, setState] = useState<{ value: T | null; loading: boolean; error: boolean }>({ value: null, loading: !!path, error: false });
  useEffect(() => {
    setState({ value: null, loading: !!path, error: false });
    if (!path) return;
    return onValue(
      ref(db, path),
      (s) => setState({ value: s.val() as T, loading: false, error: false }),
      () => setState({ value: null, loading: false, error: true }),
    );
  }, [path]);
  return state;
}

/** Subscribe to any database path. Pass null to skip. */
export function useValue<T>(path: string | null): T | null {
  return useValueWithStatus<T>(path).value;
}
