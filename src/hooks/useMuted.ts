import { useEffect, useState } from 'react';
import { isMuted, onMuteChange } from '../lib/sound';

export function useMuted() {
  const [m, setM] = useState(isMuted());
  useEffect(() => onMuteChange(setM), []);
  return m;
}
