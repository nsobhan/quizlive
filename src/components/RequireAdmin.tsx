import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { FullScreenMessage, Screen, Spinner } from './ui';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, adminLoading } = useAuth();
  const loc = useLocation();
  if (loading || adminLoading) return <Screen><Spinner /></Screen>;
  if (!user || user.isAnonymous) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  if (!isAdmin) {
    return (
      <FullScreenMessage emoji="🔐" title="Not an admin yet">
        <p>You're signed in as <b>{user.email}</b>, but this account isn't marked as an admin.</p>
        <p className="text-sm">
          In the Firebase console → Realtime Database, add <code className="rounded bg-slate-100 px-1">admins/{user.uid}: true</code> (see README).
        </p>
        <div className="flex justify-center gap-2">
          <button className="btn-dark btn-sm" onClick={() => signOut(auth)}>Sign out</button>
          <Link className="btn-light btn-sm" to="/">Home</Link>
        </div>
      </FullScreenMessage>
    );
  }
  return <>{children}</>;
}
