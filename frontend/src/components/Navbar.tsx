import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/upload', label: 'Analyze Meal' },
    { to: '/history', label: 'History' },
  ];

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-50 dark:bg-gray-950/95 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/dashboard" className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-lg bg-green-600 text-white font-black flex items-center justify-center shadow-sm">
            CV
          </span>
          <span className="font-bold text-green-700 text-xl tracking-tight dark:text-green-400">CalVision</span>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname === l.to ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-3 ml-3 pl-4 border-l border-gray-200 dark:border-gray-800">
            <ThemeToggle />
            <span className="text-sm text-gray-500 dark:text-gray-400">Hi, {user?.first_name || 'there'}</span>
            <button
              onClick={logout}
              className="text-sm bg-red-50 text-red-700 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
            >
              Logout
            </button>
          </div>
        </div>

        <button
          className="md:hidden h-10 w-10 rounded-lg border border-gray-200 flex flex-col items-center justify-center gap-1.5 dark:border-gray-700"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
        >
          <span className="w-5 h-0.5 bg-gray-700 dark:bg-gray-200" />
          <span className="w-5 h-0.5 bg-gray-700 dark:bg-gray-200" />
          <span className="w-5 h-0.5 bg-gray-700 dark:bg-gray-200" />
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1 dark:bg-gray-950 dark:border-gray-800">
          <div className="pb-2">
            <ThemeToggle />
          </div>
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-semibold ${
                pathname === l.to ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-700 dark:text-red-300">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
