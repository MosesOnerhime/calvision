import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 dark:bg-gray-950">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-5 flex items-center gap-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="h-10 w-10 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
          <div>
            <div className="font-semibold text-gray-950 dark:text-white">Loading CalVision</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Checking your session...</div>
          </div>
        </div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
