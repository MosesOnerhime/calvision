import React from 'react';
import { ScanLine } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4 dark:bg-night-canvas">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-6 py-5 shadow-float dark:border-night-line dark:bg-night-surface">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary dark:bg-night-primary-soft dark:text-night-primary">
            <ScanLine aria-hidden="true" className="h-6 w-6 animate-pulse" />
          </span>
          <div>
            <div className="font-bold text-ink dark:text-night-ink">Loading CalVision</div>
            <div className="mt-0.5 text-sm text-ink-muted dark:text-night-muted">Checking your session...</div>
          </div>
        </div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
