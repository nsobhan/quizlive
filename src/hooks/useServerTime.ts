import { useCallback, useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '../lib/firebase';

let offset = 0;
onValue(ref(db, '.info/serverTimeOffset'), (s) => {
  offset = Number(s.val() ?? 0);
});

/** Current time on the Firebase server, estimated from the connection's clock offset. */
export const serverNow = () => Date.now() + offset;

/** Re-renders every `ms` and returns the estimated server time. */
export function useServerNow(ms = 250) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useConnected() {
  const [connected, setConnected] = useState(true);
  useEffect(() => onValue(ref(db, '.info/connected'), (s) => setConnected(s.val() === true)), []);
  return connected;
}

export const useServerNowFn = () => useCallback(() => serverNow(), []);
