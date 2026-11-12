import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { auth, db } from '../lib/firebase';
import { P } from '../lib/paths';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  error: string | null;
}

const Ctx = createContext<AuthState>({ user: null, loading: true, isAdmin: false, adminLoading: true, error: null });

/** Everyone gets a Firebase identity: anonymous for players, email/password for admins. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (!u) {
          setLoading(true);
          signInAnonymously(auth).catch((e) => {
            setError(e?.code === 'auth/operation-not-allowed' ? 'Anonymous sign-in is disabled in Firebase.' : String(e?.message ?? e));
            setLoading(false);
          });
          return;
        }
        setUser(u);
        setLoading(false);
      }),
    [],
  );

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setIsAdmin(false);
      setAdminLoading(false);
      return;
    }
    setAdminLoading(true);
    return onValue(
      ref(db, P.admin(user.uid)),
      (s) => {
        setIsAdmin(s.val() === true);
        setAdminLoading(false);
      },
      () => {
        setIsAdmin(false);
        setAdminLoading(false);
      },
    );
  }, [user]);

  return <Ctx.Provider value={{ user, loading, isAdmin, adminLoading, error }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
