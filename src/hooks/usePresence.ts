import { useEffect } from 'react';
import { onDisconnect, onValue, ref, set } from 'firebase/database';
import { db } from '../lib/firebase';

/** Writes `true` to path while connected and `false` when the connection drops. */
export function usePresence(path: string | null) {
  useEffect(() => {
    if (!path) return;
    const node = ref(db, path);
    const unsub = onValue(ref(db, '.info/connected'), (s) => {
      if (s.val() !== true) return;
      onDisconnect(node)
        .set(false)
        .then(() => set(node, true))
        .catch(() => {});
    });
    return () => {
      unsub();
      onDisconnect(node).cancel().catch(() => {});
      set(node, false).catch(() => {});
    };
  }, [path]);
}
