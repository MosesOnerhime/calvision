import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ variant = 'default' }: { variant?: 'default' | 'hero' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const classes = variant === 'hero'
    ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`h-10 px-3 rounded-lg border text-sm font-semibold transition-colors ${classes}`}
    >
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
